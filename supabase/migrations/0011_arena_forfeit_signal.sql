-- Arena: when one participant ends/forfeits, store it on the room so realtime notifies the opponent.

alter table public.debate_rooms
  add column if not exists forfeited_by_user_id uuid references auth.users (id) on delete set null;

-- Idempotent: first caller records a forfeit; if already set, tells the client whether they were the forfeiter or the winner.
create or replace function public.arena_record_forfeit(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dr public.debate_rooms%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  set local row_security to off;

  select * into dr from public.debate_rooms where id = p_room;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'room not found');
  end if;
  if v_uid <> dr.pro_user_id and v_uid <> dr.con_user_id then
    return jsonb_build_object('status', 'error', 'message', 'not a participant');
  end if;

  if dr.forfeited_by_user_id is not null then
    if dr.forfeited_by_user_id = v_uid then
      return jsonb_build_object('status', 'ok', 'kind', 'already_forfeited_self');
    end if;
    return jsonb_build_object('status', 'ok', 'kind', 'you_win_by_opponent_forfeit');
  end if;

  update public.debate_rooms
  set forfeited_by_user_id = v_uid
  where id = p_room;

  return jsonb_build_object('status', 'ok', 'kind', 'you_forfeited');
end;
$$;

revoke all on function public.arena_record_forfeit(uuid) from public;
grant execute on function public.arena_record_forfeit(uuid) to authenticated;
