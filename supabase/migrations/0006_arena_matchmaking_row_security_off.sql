-- RLS is evaluated with the invoker's JWT inside SECURITY DEFINER functions, so the
-- pairing SELECT could not see other users' rows. Turn row security off for the
-- transaction inside these definer functions (runs as function owner, typically postgres).

create or replace function public.arena_match_payload(p_room uuid, p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  dr public.debate_rooms%rowtype;
  opp_id uuid;
  opp_name text;
begin
  -- row_security is already off in arena_request_match (same transaction).
  select * into dr from public.debate_rooms where id = p_room;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'room not found');
  end if;
  if p_uid <> dr.pro_user_id and p_uid <> dr.con_user_id then
    return jsonb_build_object('status', 'error', 'message', 'not a participant');
  end if;
  opp_id := case when p_uid = dr.pro_user_id then dr.con_user_id else dr.pro_user_id end;
  select display_name into opp_name from public.profiles where id = opp_id;
  return jsonb_build_object(
    'status', 'matched',
    'room_id', dr.id,
    'topic_title', dr.topic_title,
    'debate_format', dr.debate_format,
    'opponent_id', opp_id,
    'opponent_display_name', coalesce(opp_name, 'Player'),
    'role', case when p_uid = dr.pro_user_id then 'pro' else 'con' end
  );
end;
$$;

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

  insert into public.arena_queue (user_id, status)
  values (v_uid, 'waiting')
  on conflict (user_id) do update set
    status = 'waiting',
    joined_at = now(),
    room_id = null
  where public.arena_queue.status = 'matched';

  select q.user_id into v_partner_id
  from public.arena_queue q
  where q.status = 'waiting' and q.user_id <> v_uid
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

create or replace function public.arena_cancel_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  set local row_security to off;

  delete from public.arena_queue
  where user_id = auth.uid() and status = 'waiting';
end;
$$;
