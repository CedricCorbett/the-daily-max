-- THE DAILY MAX · consolidated migration
-- Paste this into the Supabase SQL Editor to run every migration end-to-end.
-- Safe to re-run: uses CREATE OR REPLACE / IF NOT EXISTS / DROP IF EXISTS on
-- every object that isn't natively idempotent (policies, triggers).
--
-- After a clean run:
--   - All 0001–0009 migrations are applied
--   - RLS is on, policies are consistent
--   - list_leaderboard + backfill_workouts RPCs are callable
--
-- If you've already run 0001–0008 once, this will no-op most statements and
-- just ensure the new 0009 RPC (backfill_workouts) is present.

begin;

-- ───────── 0001_init.sql (idempotent via IF NOT EXISTS) ─────────
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,
  city          text,
  voice         text default 'auto',
  aesthetic     text default 'oxblood',
  slot          text default 'am',
  partner       text,
  referral_code text unique,
  created_at    timestamptz not null default now()
);

create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  pushups    integer not null default 0 check (pushups  >= 0),
  squats     integer not null default 0 check (squats   >= 0),
  hollow_sec integer not null default 0 check (hollow_sec >= 0),
  pullups    integer not null default 0 check (pullups  >= 0),
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists workouts_user_day_idx on public.workouts (user_id, day desc);

create table if not exists public.pbs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  pushups    integer not null default 0,
  squats     integer not null default 0,
  hollow_sec integer not null default 0,
  pullups    integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.streaks (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  current_len  integer not null default 0,
  longest_len  integer not null default 0,
  last_day     date,
  insurance    integer not null default 1,
  updated_at   timestamptz not null default now()
);

create table if not exists public.clans (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  tag        text,
  created_at timestamptz not null default now()
);
alter table public.clans add column if not exists description   text;
alter table public.clans add column if not exists is_public     boolean not null default true;
alter table public.clans add column if not exists is_system     boolean not null default false;
alter table public.clans add column if not exists invite_code   text unique;
alter table public.clans add column if not exists region_state  text;
alter table public.clans add column if not exists age_bracket   text;
do $$ begin
  alter table public.clans add constraint clans_age_bracket_chk
    check (age_bracket is null or age_bracket in ('20s','30s','40s','50s','60+'));
exception when duplicate_object then null; end $$;

create table if not exists public.clan_members (
  clan_id    uuid not null references public.clans(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('leader','member')),
  joined_at  timestamptz not null default now(),
  primary key (clan_id, user_id)
);
create index if not exists clan_members_user_idx on public.clan_members (user_id);

create table if not exists public.clan_battles (
  id           uuid primary key default gen_random_uuid(),
  a_clan_id    uuid not null references public.clans(id) on delete cascade,
  b_clan_id    uuid not null references public.clans(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  cross_class  boolean not null default false,
  a_score      numeric(5,4),
  b_score      numeric(5,4),
  winner_id    uuid references public.clans(id),
  created_at   timestamptz not null default now(),
  check (a_clan_id <> b_clan_id)
);
create index if not exists clan_battles_window_idx on public.clan_battles (ends_at);

create table if not exists public.battle_contributions (
  battle_id  uuid not null references public.clan_battles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  effort     numeric(4,3) not null check (effort >= 0 and effort <= 1),
  created_at timestamptz not null default now(),
  primary key (battle_id, user_id, day)
);

create table if not exists public.rally_board (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  listed_at  timestamptz not null default now(),
  days_off   integer not null default 1,
  streak_lost integer not null default 0,
  note       text
);

create table if not exists public.rallies (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  msg        text not null,
  sent_at    timestamptz not null default now(),
  pushed     boolean not null default false,
  check (from_user <> to_user)
);
create index if not exists rallies_to_idx on public.rallies (to_user, sent_at desc);

create table if not exists public.drafts (
  id           uuid primary key default gen_random_uuid(),
  challenger   uuid not null references public.profiles(id) on delete cascade,
  opponent     uuid not null references public.profiles(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  cross_class  boolean not null default false,
  status       text not null default 'open' check (status in ('open','live','settled','cancelled')),
  winner_id    uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  check (challenger <> opponent)
);

-- 0004 profile extensions
alter table public.profiles add column if not exists username       text;
alter table public.profiles add column if not exists display_name   text;
alter table public.profiles add column if not exists recovery_email text;
alter table public.profiles add column if not exists region_state   text;
alter table public.profiles add column if not exists age_bracket    text;
do $$ begin
  alter table public.profiles add constraint profiles_age_bracket_chk
    check (age_bracket is null or age_bracket in ('20s','30s','40s','50s','60+'));
exception when duplicate_object then null; end $$;
create unique index if not exists profiles_username_unique on public.profiles (lower(username));

create table if not exists public.auth_throttle (
  username      text primary key,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

-- 0005 push
create table if not exists public.push_subscriptions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  primary key (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ───────── 0002_rls.sql (drop+create so it's idempotent) ─────────
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
alter table public.auth_throttle        enable row level security;
alter table public.push_subscriptions   enable row level security;

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_upsert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_read on public.profiles for select using (true);
create policy profiles_upsert_self on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id);

drop policy if exists workouts_read_self on public.workouts;
drop policy if exists workouts_write_self on public.workouts;
drop policy if exists workouts_update_self on public.workouts;
create policy workouts_read_self   on public.workouts for select using (auth.uid() = user_id);
create policy workouts_write_self  on public.workouts for insert with check (auth.uid() = user_id);
create policy workouts_update_self on public.workouts for update using (auth.uid() = user_id);

drop policy if exists pbs_read on public.pbs;
drop policy if exists pbs_write_self on public.pbs;
drop policy if exists pbs_update_self on public.pbs;
create policy pbs_read         on public.pbs for select using (true);
create policy pbs_write_self   on public.pbs for insert with check (auth.uid() = user_id);
create policy pbs_update_self  on public.pbs for update using (auth.uid() = user_id);

drop policy if exists streaks_read on public.streaks;
drop policy if exists streaks_write_self on public.streaks;
drop policy if exists streaks_update_self on public.streaks;
create policy streaks_read         on public.streaks for select using (true);
create policy streaks_write_self   on public.streaks for insert with check (auth.uid() = user_id);
create policy streaks_update_self  on public.streaks for update using (auth.uid() = user_id);

drop policy if exists clans_read on public.clans;
drop policy if exists clan_members_read on public.clan_members;
drop policy if exists clan_members_join_self on public.clan_members;
drop policy if exists clan_members_leave_self on public.clan_members;
create policy clans_read              on public.clans for select using (true);
create policy clan_members_read       on public.clan_members for select using (true);
create policy clan_members_join_self  on public.clan_members for insert with check (auth.uid() = user_id);
create policy clan_members_leave_self on public.clan_members for delete using (auth.uid() = user_id);

drop policy if exists battles_read on public.clan_battles;
drop policy if exists battle_contrib_read on public.battle_contributions;
drop policy if exists battle_contrib_write_self on public.battle_contributions;
create policy battles_read               on public.clan_battles for select using (true);
create policy battle_contrib_read        on public.battle_contributions for select using (true);
create policy battle_contrib_write_self  on public.battle_contributions for insert with check (auth.uid() = user_id);

drop policy if exists rally_board_read on public.rally_board;
create policy rally_board_read on public.rally_board for select using (true);

drop policy if exists rallies_read on public.rallies;
drop policy if exists rallies_send on public.rallies;
create policy rallies_read on public.rallies for select using (auth.uid() = from_user or auth.uid() = to_user);
create policy rallies_send on public.rallies for insert with check (auth.uid() = from_user);

drop policy if exists drafts_read on public.drafts;
drop policy if exists drafts_insert on public.drafts;
drop policy if exists drafts_update on public.drafts;
create policy drafts_read   on public.drafts for select using (auth.uid() = challenger or auth.uid() = opponent);
create policy drafts_insert on public.drafts for insert with check (auth.uid() = challenger);
create policy drafts_update on public.drafts for update using (auth.uid() = challenger or auth.uid() = opponent);

drop policy if exists push_self_read   on public.push_subscriptions;
drop policy if exists push_self_write  on public.push_subscriptions;
drop policy if exists push_self_delete on public.push_subscriptions;
create policy push_self_read   on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_self_write  on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy push_self_delete on public.push_subscriptions for delete using (user_id = auth.uid());

commit;

-- All remaining RPCs + triggers are in the individual migration files and are
-- already idempotent (CREATE OR REPLACE / DROP TRIGGER IF EXISTS). Run each
-- of these in order *after* this script (or rely on your GitHub Action to
-- push them). Paste-order if running manually:
--   0003_functions.sql   (log_workout, send_rally, clan_score, …)
--   0004_auth.sql        (resolve_login + throttle + handle_new_user trigger)
--   0005_push.sql        (subscribe_push / unsubscribe_push)
--   0006_clans.sql       (create_clan, join_clan, join_clan_by_code, …)
--   0007_synth_email_domain.sql (resolve_login override)
--   0008_leaderboard.sql (list_leaderboard)
--   0009_backfill.sql    (backfill_workouts)

-- ───────── health check — run after paste to verify ─────────
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--   and proname in (
--     'log_workout','send_rally','clan_score','list_rally_board',
--     'create_clan','join_clan','join_clan_by_code','leave_clan',
--     'resolve_login','throttle_status','register_failed_pin','clear_throttle','username_available',
--     'subscribe_push','unsubscribe_push',
--     'list_leaderboard','backfill_workouts'
--   ) order by proname;
-- select count(*) users from public.profiles;
-- select count(*) workouts from public.workouts;
-- select * from public.list_leaderboard(null, null, 25);
