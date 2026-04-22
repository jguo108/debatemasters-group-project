-- Progression: total experience on profiles, server-granted XP on debate_results insert/update.
-- Level curve (must match src/lib/progression/experience.ts): cumulative XP to reach level L is 50*(L-1)*L.
--
-- Data migration: existing debate_results rows are replayed once (sum XP per user into profiles),
-- then progression_applied_at is set so the live trigger never double-grants. Profiles then get
-- level / rank_label recomputed from total_experience (replacing legacy level-42 placeholders).

alter table public.profiles
  add column if not exists total_experience bigint not null default 0;

alter table public.debate_results
  add column if not exists progression_applied_at timestamptz null;

comment on column public.profiles.total_experience is 'Lifetime experience orbs; level and rank_label are derived.';
comment on column public.debate_results.progression_applied_at is 'When server applied XP for this row (idempotent with arena upserts).';

alter table public.profiles alter column level set default 1;
alter table public.profiles alter column rank_label set default 'Spawn Runner';

-- ---------------------------------------------------------------------------
-- Level / title (keep in sync with TS advancementTitle)
-- ---------------------------------------------------------------------------

create or replace function public.level_from_total_experience(p_total bigint)
returns int
language sql
immutable
as $$
  select greatest(
    1,
    floor(0.5 + sqrt(0.25 + (greatest(0, p_total)::numeric / 50)))::int
  );
$$;

create or replace function public.advancement_title_from_level(p_level int)
returns text
language sql
immutable
as $$
  select case
    when p_level <= 1 then 'Spawn Runner'
    when p_level = 2 then 'Wooden Debater'
    when p_level = 3 then 'Stone Tongue'
    when p_level = 4 then 'Iron Clash'
    when p_level = 5 then 'Golden Glyph'
    when p_level = 6 then 'Lapis Logician'
    when p_level = 7 then 'Redstone Rhetor'
    when p_level = 8 then 'Emerald Advocate'
    when p_level = 9 then 'Diamond Cross-Examiner'
    when p_level = 10 then 'Nether Scribe'
    when p_level = 11 then 'Soul Speed Speaker'
    when p_level = 12 then 'Ancient Debris Orator'
    when p_level = 13 then 'Basalt Debater'
    when p_level = 14 then 'Blackstone Barrister'
    when p_level = 15 then 'End Walker'
    when p_level = 16 then 'Dragonfire Closer'
    else 'Dragonfire Closer'
  end;
$$;

create or replace function public.compute_debate_experience_reward(
  p_payload jsonb,
  p_arena_room_id uuid
)
returns int
language sql
immutable
as $$
  select case lower(coalesce(p_payload->>'outcome', ''))
    when 'forfeit' then 5
    else (
      (case when p_arena_room_id is not null then 80 else 60 end)
      + (case lower(coalesce(p_payload->>'outcome', ''))
           when 'victory' then 45
           else 20
         end)
      + least(
          15,
          greatest(
            0,
            floor(
              (
                coalesce((p_payload->'scores'->>'clarity')::numeric, 0)
                + coalesce((p_payload->'scores'->>'evidence')::numeric, 0)
              ) / 2.0 * 3
            )
          )::int
        )
    )
  end;
$$;

create or replace function public.apply_profile_progression(p_user_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta is null or p_delta <= 0 then
    return;
  end if;

  update public.profiles
  set
    total_experience = greatest(0, total_experience + p_delta),
    level = public.level_from_total_experience(
      greatest(0, total_experience + p_delta)
    ),
    rank_label = public.advancement_title_from_level(
      public.level_from_total_experience(
        greatest(0, total_experience + p_delta)
      )
    )
  where id = p_user_id;

  if not found then
    return;
  end if;
end;
$$;

revoke all on function public.apply_profile_progression(uuid, int) from public;

create or replace function public.debate_results_apply_progression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta int;
begin
  if new.hidden = true then
    return new;
  end if;
  if new.progression_applied_at is not null then
    return new;
  end if;

  v_delta := public.compute_debate_experience_reward(new.payload, new.arena_room_id);

  if v_delta > 0 then
    perform public.apply_profile_progression(new.user_id, v_delta);
  end if;

  update public.debate_results
  set progression_applied_at = now()
  where id = new.id
    and progression_applied_at is null;

  return new;
end;
$$;

drop trigger if exists debate_results_progression on public.debate_results;

create trigger debate_results_progression
  after insert or update of payload, hidden on public.debate_results
  for each row
  execute function public.debate_results_apply_progression();

-- ---------------------------------------------------------------------------
-- Backfill existing users from historic debates; mark rows so trigger skips.
-- New installs: no rows, loop is empty.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  v_delta int;
begin
  for r in
    select id, user_id, payload, arena_room_id
    from public.debate_results
    where hidden = false
      and progression_applied_at is null
  loop
    v_delta := public.compute_debate_experience_reward(r.payload, r.arena_room_id);
    if v_delta > 0 then
      perform public.apply_profile_progression(r.user_id, v_delta);
    end if;
    update public.debate_results
    set progression_applied_at = now()
    where id = r.id;
  end loop;
end;
$$;

-- Align level / advancement title with total_experience (fixes legacy level-42 rows).
update public.profiles
set
  level = public.level_from_total_experience(total_experience),
  rank_label = public.advancement_title_from_level(
    public.level_from_total_experience(total_experience)
  );
