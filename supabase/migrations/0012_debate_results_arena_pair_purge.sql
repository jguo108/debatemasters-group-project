-- Arena debate history: two rows share debate_rooms.id; soft-hide is per user.
-- When both participants have hidden their row, remove both from the database.

alter table public.debate_results
  add column if not exists arena_room_id uuid references public.debate_rooms (id) on delete set null;

create index if not exists debate_results_arena_room_idx
  on public.debate_results (arena_room_id)
  where arena_room_id is not null;

-- Backfill room id from stable client ids: forfeit_<roomUuid>_<userUuid>, victory_forfeit_<roomUuid>_<userUuid>
update public.debate_results
set arena_room_id = (regexp_match(id, '^forfeit_([0-9a-fA-F-]{36})_'))[1]::uuid
where arena_room_id is null and id ~ '^forfeit_[0-9a-fA-F-]{36}_';

update public.debate_results
set arena_room_id = (regexp_match(id, '^victory_forfeit_([0-9a-fA-F-]{36})_'))[1]::uuid
where arena_room_id is null and id ~ '^victory_forfeit_[0-9a-fA-F-]{36}_';

create or replace function public.debate_results_purge_arena_if_both_hidden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  hidden_count int;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.hidden is not true or new.arena_room_id is null then
    return new;
  end if;

  select count(*)::int into total
  from public.debate_results
  where arena_room_id = new.arena_room_id;

  select count(*)::int into hidden_count
  from public.debate_results
  where arena_room_id = new.arena_room_id and hidden = true;

  if total = 2 and hidden_count = 2 then
    set local row_security to off;
    delete from public.debate_results where arena_room_id = new.arena_room_id;
  end if;

  return new;
end;
$$;

drop trigger if exists debate_results_arena_pair_purge on public.debate_results;

create trigger debate_results_arena_pair_purge
  after update of hidden on public.debate_results
  for each row
  when (new.hidden is true and new.arena_room_id is not null)
  execute function public.debate_results_purge_arena_if_both_hidden();
