-- Ensure arena_queue is visible in Dashboard → Database → Publications / Realtime
-- and receives UPDATE events for postgres_changes.

alter table public.arena_queue replica identity full;

do $do$
begin
  alter publication supabase_realtime add table public.arena_queue;
exception
  when duplicate_object then
    null;
  when undefined_object then
    raise notice 'supabase_realtime publication missing — enable Realtime in Supabase project settings';
  when others then
    -- e.g. "is already member of publication"
    if sqlerrm ilike '%already%member%' or sqlerrm ilike '%already part of%' then
      null;
    else
      raise;
    end if;
end
$do$;
