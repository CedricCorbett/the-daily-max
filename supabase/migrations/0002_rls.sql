-- Row-level security. Everyone can read public crew state; writes are self-only.

alter table public.profiles             enable row level security;
alter table public.workouts             enable row level security;
alter table public.pbs                  enable row level security;
alter table public.streaks              enable row level security;
alter table public.clans                enable row level security;
alter table public.clan_members         enable row level security;
alter table public.clan_battles         enable row level security;
alter table public.battle_contributions enable row level security;
alter table public.rally_board          enable row level security;
alter table public.rallies              enable row level security;
alter table public.drafts               enable row level security;

-- profiles: anyone can read, self can write
create policy profiles_read on public.profiles for select using (true);
create policy profiles_upsert_self on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id);

-- workouts: owner read/write; crew-mates can read via view (kept private by default)
create policy workouts_read_self on public.workouts for select using (auth.uid() = user_id);
create policy workouts_write_self on public.workouts for insert with check (auth.uid() = user_id);
create policy workouts_update_self on public.workouts for update using (auth.uid() = user_id);

-- pbs: anyone can read (leaderboards); self-write only
create policy pbs_read on public.pbs for select using (true);
create policy pbs_write_self on public.pbs for insert with check (auth.uid() = user_id);
create policy pbs_update_self on public.pbs for update using (auth.uid() = user_id);

-- streaks: public read (leaderboards), self write
create policy streaks_read on public.streaks for select using (true);
create policy streaks_write_self on public.streaks for insert with check (auth.uid() = user_id);
create policy streaks_update_self on public.streaks for update using (auth.uid() = user_id);

-- clans + members: public read; only clan leader can insert/update its rows
create policy clans_read on public.clans for select using (true);
create policy clan_members_read on public.clan_members for select using (true);

create policy clan_members_join_self on public.clan_members
  for insert with check (auth.uid() = user_id);
create policy clan_members_leave_self on public.clan_members
  for delete using (auth.uid() = user_id);

-- battles: public read; writes gated to server (service role)
create policy battles_read on public.clan_battles for select using (true);
create policy battle_contrib_read on public.battle_contributions for select using (true);
create policy battle_contrib_write_self on public.battle_contributions
  for insert with check (auth.uid() = user_id);

-- rally board: public read; insert/delete happen server-side via RPCs
create policy rally_board_read on public.rally_board for select using (true);

-- rallies: recipient and sender can read their own; sender inserts
create policy rallies_read on public.rallies
  for select using (auth.uid() = from_user or auth.uid() = to_user);
create policy rallies_send on public.rallies
  for insert with check (auth.uid() = from_user);

-- drafts: participants read; either side can insert as challenger
create policy drafts_read on public.drafts
  for select using (auth.uid() = challenger or auth.uid() = opponent);
create policy drafts_insert on public.drafts
  for insert with check (auth.uid() = challenger);
create policy drafts_update on public.drafts
  for update using (auth.uid() = challenger or auth.uid() = opponent);
