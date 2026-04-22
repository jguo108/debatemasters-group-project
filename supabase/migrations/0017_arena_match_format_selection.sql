-- Arena format selection:
-- - queue stores desired format (wsda or free_form)
-- - matchmaking pairs only users with same selected format
-- - room debate_format is created from the selected format

alter table public.arena_queue
  add column if not exists preferred_debate_format text not null default 'wsda';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'arena_queue_preferred_debate_format_check'
      and conrelid = 'public.arena_queue'::regclass
  ) then
    alter table public.arena_queue
      add constraint arena_queue_preferred_debate_format_check
      check (preferred_debate_format in ('wsda', 'free_form'));
  end if;
end
$$;

create index if not exists arena_queue_waiting_format_joined_idx
  on public.arena_queue (status, preferred_debate_format, joined_at)
  where status = 'waiting';

drop function if exists public.arena_request_match();

create or replace function public.arena_request_match(p_format text default 'wsda')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner_id uuid;
  v_room_id uuid;
  v_topic text;
  v_my_row public.arena_queue%rowtype;
  stale_after constant interval := interval '60 seconds';
  v_format text := case
    when lower(trim(coalesce(p_format, ''))) = 'free_form' then 'free_form'
    else 'wsda'
  end;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  set local row_security to off;

  perform pg_advisory_xact_lock(87236421);

  select * into v_my_row from public.arena_queue where user_id = v_uid;
  if found and v_my_row.status = 'matched' and v_my_row.room_id is not null then
    return public.arena_match_payload(v_my_row.room_id, v_uid);
  end if;

  insert into public.arena_queue (user_id, status, joined_at, preferred_debate_format)
  values (v_uid, 'waiting', now(), v_format)
  on conflict (user_id) do update set
    joined_at = now(),
    status = 'waiting',
    room_id = null,
    preferred_debate_format = v_format
  where public.arena_queue.status = 'waiting'
    or (
      public.arena_queue.status = 'matched'
      and public.arena_queue.room_id is null
    );

  delete from public.arena_queue
  where status = 'waiting'
    and joined_at < now() - stale_after;

  select q.user_id into v_partner_id
  from public.arena_queue q
  where q.status = 'waiting'
    and q.preferred_debate_format = v_format
    and q.user_id <> v_uid
    and q.joined_at > now() - stale_after
  order by q.joined_at asc
  for update skip locked
  limit 1;

  if v_partner_id is null then
    return jsonb_build_object('status', 'waiting');
  end if;

  v_topic := public.arena_pick_topic();

  insert into public.debate_rooms (topic_title, debate_format, pro_user_id, con_user_id)
  values (
    v_topic,
    v_format,
    least(v_uid, v_partner_id),
    greatest(v_uid, v_partner_id)
  )
  returning id into v_room_id;

  update public.arena_queue
  set status = 'matched', room_id = v_room_id
  where user_id in (v_uid, v_partner_id);

  return public.arena_match_payload(v_room_id, v_uid);
end;
$$;

-- Compatibility wrapper for callers that do not pass a format.
create or replace function public.arena_request_match()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.arena_request_match('wsda');
$$;

grant execute on function public.arena_request_match(text) to authenticated;
grant execute on function public.arena_request_match() to authenticated;
