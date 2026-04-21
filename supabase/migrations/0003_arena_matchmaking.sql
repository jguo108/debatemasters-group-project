-- Arena: queue + paired debate rooms, RPC matchmaking (Supabase-only)

create table public.debate_rooms (
  id uuid not null default gen_random_uuid() primary key,
  topic_title text not null,
  debate_format text not null default 'wsda',
  pro_user_id uuid not null references auth.users (id) on delete cascade,
  con_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint debate_rooms_pro_con_distinct check (pro_user_id <> con_user_id)
);

create index debate_rooms_pro_idx on public.debate_rooms (pro_user_id);
create index debate_rooms_con_idx on public.debate_rooms (con_user_id);

create table public.arena_queue (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('waiting', 'matched')),
  room_id uuid references public.debate_rooms (id) on delete set null,
  joined_at timestamptz not null default now(),
  constraint arena_queue_user_unique unique (user_id)
);

create index arena_queue_waiting_joined_idx
  on public.arena_queue (status, joined_at)
  where status = 'waiting';

alter table public.debate_rooms enable row level security;
alter table public.arena_queue enable row level security;

create policy "debate_rooms_select_if_participant"
  on public.debate_rooms for select
  using (auth.uid() = pro_user_id or auth.uid() = con_user_id);

create policy "arena_queue_select_own"
  on public.arena_queue for select
  using (auth.uid() = user_id);

-- Payload helper (internal + idempotent re-fetch after match)
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

create or replace function public.arena_pick_topic()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select t from (
    values
      ('This house believes schools should ban smartphones during the school day.'),
      ('This house believes voting should be compulsory in democratic elections.'),
      ('This house believes social media does more harm than good for teenagers.'),
      ('This house would prioritize climate action over short-term economic growth.'),
      ('This house believes artificial intelligence in classrooms helps learning more than it hurts it.'),
      ('This house would abolish standardized testing for university admissions.'),
      ('This house believes remote work should be the default for desk jobs.'),
      ('This house would legalize physician-assisted dying for terminally ill patients.'),
      ('This house believes professional athletes should be required to speak on political issues.'),
      ('This house would replace animal farming with large-scale plant-based food systems.'),
      ('This house believes space exploration should be funded primarily by governments, not private companies.'),
      ('This house would impose a universal basic income funded by wealth taxes.')
  ) as v(t)
  order by random()
  limit 1;
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
  delete from public.arena_queue
  where user_id = auth.uid() and status = 'waiting';
end;
$$;

revoke all on public.debate_rooms from public;
revoke all on public.arena_queue from public;

grant select on public.debate_rooms to authenticated;
grant select on public.arena_queue to authenticated;

grant execute on function public.arena_request_match() to authenticated;
grant execute on function public.arena_cancel_queue() to authenticated;

revoke all on function public.arena_match_payload(uuid, uuid) from public;
revoke all on function public.arena_pick_topic() from public;

-- Realtime: queue updates for the waiting client
do $do$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'arena_queue'
  ) then
    alter publication supabase_realtime add table public.arena_queue;
  end if;
end
$do$;
