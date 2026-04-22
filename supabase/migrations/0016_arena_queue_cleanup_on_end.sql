-- Arena queue hygiene:
-- - matched queue rows are useful while a match is being established/recovered
-- - once a debate ends (judged or forfeited), remove queue rows for that room
-- - also remove queue rows before room deletion to avoid matched+NULL leftovers

create or replace function public.arena_cleanup_queue_for_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room is null then
    return;
  end if;

  set local row_security to off;

  delete from public.arena_queue
  where room_id = p_room;
end;
$$;

revoke all on function public.arena_cleanup_queue_for_room(uuid) from public;

create or replace function public.arena_queue_cleanup_on_judgement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.arena_cleanup_queue_for_room(new.room_id);
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.arena_judgements') is not null then
    execute 'drop trigger if exists arena_queue_cleanup_on_judgement on public.arena_judgements';
    execute '
      create trigger arena_queue_cleanup_on_judgement
        after insert or update on public.arena_judgements
        for each row
        execute function public.arena_queue_cleanup_on_judgement()
    ';
  end if;
end
$$;

create or replace function public.arena_queue_cleanup_on_forfeit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.forfeited_by_user_id is null then
    return new;
  end if;

  perform public.arena_cleanup_queue_for_room(new.id);
  return new;
end;
$$;

drop trigger if exists arena_queue_cleanup_on_forfeit on public.debate_rooms;

create trigger arena_queue_cleanup_on_forfeit
  after update of forfeited_by_user_id on public.debate_rooms
  for each row
  when (new.forfeited_by_user_id is not null)
  execute function public.arena_queue_cleanup_on_forfeit();

create or replace function public.arena_queue_cleanup_before_room_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.arena_cleanup_queue_for_room(old.id);
  return old;
end;
$$;

drop trigger if exists arena_queue_cleanup_before_room_delete on public.debate_rooms;

create trigger arena_queue_cleanup_before_room_delete
  before delete on public.debate_rooms
  for each row
  execute function public.arena_queue_cleanup_before_room_delete();

-- One-time cleanup for already-ended rooms that still have matched queue rows.
do $$
begin
  if to_regclass('public.arena_judgements') is not null then
    execute $sql$
      delete from public.arena_queue q
      where q.room_id is not null
        and (
          exists (
            select 1
            from public.arena_judgements j
            where j.room_id = q.room_id
          )
          or exists (
            select 1
            from public.debate_rooms dr
            where dr.id = q.room_id
              and dr.forfeited_by_user_id is not null
          )
        )
    $sql$;
  else
    execute $sql$
      delete from public.arena_queue q
      where q.room_id is not null
        and exists (
          select 1
          from public.debate_rooms dr
          where dr.id = q.room_id
            and dr.forfeited_by_user_id is not null
        )
    $sql$;
  end if;
end
$$;
