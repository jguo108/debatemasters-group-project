-- Live arena chat: messages visible to both participants via RLS + Realtime

create table public.debate_room_messages (
  id uuid not null default gen_random_uuid() primary key,
  room_id uuid not null references public.debate_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 8000),
  created_at timestamptz not null default now()
);

create index debate_room_messages_room_created_idx
  on public.debate_room_messages (room_id, created_at asc);

alter table public.debate_room_messages replica identity full;

alter table public.debate_room_messages enable row level security;

create policy "debate_room_messages_select_if_in_room"
  on public.debate_room_messages for select
  using (
    exists (
      select 1
      from public.debate_rooms dr
      where dr.id = debate_room_messages.room_id
        and (dr.pro_user_id = auth.uid() or dr.con_user_id = auth.uid())
    )
  );

create policy "debate_room_messages_insert_if_in_room"
  on public.debate_room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.debate_rooms dr
      where dr.id = debate_room_messages.room_id
        and (dr.pro_user_id = auth.uid() or dr.con_user_id = auth.uid())
    )
  );

revoke all on public.debate_room_messages from public;
grant select, insert on public.debate_room_messages to authenticated;

do $do$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debate_room_messages'
  ) then
    alter publication supabase_realtime add table public.debate_room_messages;
  end if;
end
$do$;
