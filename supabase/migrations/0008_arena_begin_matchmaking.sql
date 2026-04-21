-- Starting a new search must drop any leftover arena_queue row (including status
-- matched + room_id). Otherwise arena_request_match returns the old room immediately.

create or replace function public.arena_begin_matchmaking()
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
  where user_id = auth.uid();
end;
$$;

grant execute on function public.arena_begin_matchmaking() to authenticated;
