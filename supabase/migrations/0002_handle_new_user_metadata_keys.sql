-- Apply if you already ran 0001_init.sql before displayName/avatarUrl fallbacks were added.
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
