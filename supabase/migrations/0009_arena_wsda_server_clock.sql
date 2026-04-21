-- WSDA arena: single server anchor so both clients derive the same phase and countdown.

alter table public.debate_rooms
  add column if not exists wsda_started_at timestamptz;

alter table public.debate_rooms replica identity full;

-- Idempotent start: first participant to open the room sets now(); others reuse the same instant.
create or replace function public.arena_begin_wsda_session(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dr public.debate_rooms%rowtype;
  v_started timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  set local row_security to off;

  select * into dr from public.debate_rooms where id = p_room;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'room not found');
  end if;
  if auth.uid() <> dr.pro_user_id and auth.uid() <> dr.con_user_id then
    return jsonb_build_object('status', 'error', 'message', 'not a participant');
  end if;

  update public.debate_rooms
  set wsda_started_at = coalesce(wsda_started_at, now())
  where id = p_room
  returning wsda_started_at into v_started;

  return jsonb_build_object(
    'status', 'ok',
    'wsda_started_epoch', extract(epoch from v_started),
    'server_now_epoch', extract(epoch from now())
  );
end;
$$;

-- Lightweight clock sync for long debates (corrects client clock skew / drift).
create or replace function public.arena_server_time()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('server_now_epoch', extract(epoch from now()));
$$;

revoke all on function public.arena_begin_wsda_session(uuid) from public;
revoke all on function public.arena_server_time() from public;

grant execute on function public.arena_begin_wsda_session(uuid) to authenticated;
grant execute on function public.arena_server_time() to authenticated;

do $do$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debate_rooms'
  ) then
    alter publication supabase_realtime add table public.debate_rooms;
  end if;
end
$do$;
