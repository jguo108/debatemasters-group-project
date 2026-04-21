-- Fix ghost matches: waiting rows never refreshed joined_at on repeat polls, and abandoned
-- waiters stayed in the queue forever. Both caused a lone searcher to pair with a stale row.

create or replace function public.arena_request_match()
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

  -- Register or stay in queue; refresh joined_at on every poll while waiting so we can
  -- distinguish active searchers from abandoned tabs. Still reset matched+no room defensively.
  insert into public.arena_queue (user_id, status, joined_at)
  values (v_uid, 'waiting', now())
  on conflict (user_id) do update set
    joined_at = now(),
    status = 'waiting',
    room_id = null
  where public.arena_queue.status = 'waiting'
    or (
      public.arena_queue.status = 'matched'
      and public.arena_queue.room_id is null
    );

  -- Drop waiters who are not polling anymore (closed tab / crash / no refresh).
  delete from public.arena_queue
  where status = 'waiting'
    and joined_at < now() - stale_after;

  select q.user_id into v_partner_id
  from public.arena_queue q
  where q.status = 'waiting'
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
    'wsda',
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
