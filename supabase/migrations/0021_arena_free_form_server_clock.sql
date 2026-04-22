-- Free-form arena: start countdown when room is actually entered, not at match creation.

alter table public.debate_rooms
  add column if not exists free_form_started_at timestamptz;

create or replace function public.arena_begin_free_form_session(p_room uuid)
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
  if dr.debate_format <> 'free_form' then
    return jsonb_build_object('status', 'error', 'message', 'room is not free_form');
  end if;

  update public.debate_rooms
  set free_form_started_at = coalesce(free_form_started_at, now())
  where id = p_room
  returning free_form_started_at into v_started;

  return jsonb_build_object(
    'status', 'ok',
    'free_form_started_epoch', extract(epoch from v_started),
    'server_now_epoch', extract(epoch from now())
  );
end;
$$;

revoke all on function public.arena_begin_free_form_session(uuid) from public;
grant execute on function public.arena_begin_free_form_session(uuid) to authenticated;
