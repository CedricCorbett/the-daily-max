-- THE DAILY MAX · schema
-- Crew-based effort tracking. Scores cap at 1.0 (100% of personal PR).

create extension if not exists "pgcrypto";

-- profiles: one row per auth.user
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

-- workouts: one row per logged session (unique per user per day)
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

-- pbs: rolling personal bests by station
create table if not exists public.pbs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  pushups    integer not null default 0,
  squats     integer not null default 0,
  hollow_sec integer not null default 0,
  pullups    integer not null default 0,
  updated_at timestamptz not null default now()
);

-- streaks: broken/unbroken + insurance
create table if not exists public.streaks (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  current_len  integer not null default 0,
  longest_len  integer not null default 0,
  last_day     date,
  insurance    integer not null default 1,
  updated_at   timestamptz not null default now()
);

-- clans
create table if not exists public.clans (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  tag        text,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  clan_id    uuid not null references public.clans(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('leader','member')),
  joined_at  timestamptz not null default now(),
  primary key (clan_id, user_id)
);
create index if not exists clan_members_user_idx on public.clan_members (user_id);

-- clan_battles: scheduled crew-vs-crew battles
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

-- battle_contributions: each user's capped effort for a battle day
create table if not exists public.battle_contributions (
  battle_id  uuid not null references public.clan_battles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  effort     numeric(4,3) not null check (effort >= 0 and effort <= 1),
  created_at timestamptz not null default now(),
  primary key (battle_id, user_id, day)
);

-- rallies: when a user misses a day they go on the board; others can send encouragement
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

-- drafts: head-to-head challenges
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
