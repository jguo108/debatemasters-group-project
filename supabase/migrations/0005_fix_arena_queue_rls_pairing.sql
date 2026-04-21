-- Pairing failed: RLS only allowed SELECT own row, so the RPC could never see
-- other users in the queue. Permissive policies are OR'd — add visibility for waiting rows.

create policy "arena_queue_select_waiting_for_pairing"
  on public.arena_queue
  for select
  to authenticated
  using (status = 'waiting');

-- arena_match_payload reads opponent display_name; profiles_select_own blocked that.
create policy "profiles_select_if_shared_debate_room"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.debate_rooms dr
      where (dr.pro_user_id = auth.uid() or dr.con_user_id = auth.uid())
        and (dr.pro_user_id = profiles.id or dr.con_user_id = profiles.id)
    )
  );
