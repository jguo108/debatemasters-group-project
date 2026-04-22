-- Solo debates: users delete their own row (client hard-delete; RLS below).
-- Arena: when both participants hide their paired rows, remove results then the room
-- so debate_room_messages and arena_judgements cascade away.

create policy "debate_results_delete_own"
  on public.debate_results for delete
  using (auth.uid() = user_id);

create or replace function public.debate_results_purge_arena_if_both_hidden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  hidden_count int;
  v_room uuid;
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
    v_room := new.arena_room_id;
    delete from public.debate_results where arena_room_id = v_room;
    delete from public.debate_rooms where id = v_room;
  end if;

  return new;
end;
$$;
