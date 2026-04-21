-- DebateMaster: profiles + debate history (run in Supabase SQL editor or via CLI)

create table public.profiles (
  id uuid not null references auth.users (id) on delete cascade primary key,
  display_name text not null default 'Player',
  avatar_url text not null default 'https://mc-heads.net/avatar/Steve/96',
  level integer not null default 42,
  rank_label text not null default 'Novice Builder',
  updated_at timestamptz not null default now()
);

create table public.debate_results (
  id text not null primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  debated_at timestamptz not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index debate_results_user_debated_at_idx
  on public.debate_results (user_id, debated_at desc);

alter table public.profiles enable row level security;
alter table public.debate_results enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "debate_results_select_own"
  on public.debate_results for select
  using (auth.uid() = user_id);

create policy "debate_results_insert_own"
  on public.debate_results for insert
  with check (auth.uid() = user_id);

create policy "debate_results_update_own"
  on public.debate_results for update
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'displayName'), ''),
      'Player'
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data->>'avatarUrl'), ''),
      'https://mc-heads.net/avatar/Steve/96'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profiles_updated_at();
