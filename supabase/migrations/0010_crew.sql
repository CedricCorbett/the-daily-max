-- 0010_crew.sql — Crew ops: totals, roster, leader round-ups.
-- Safe to run twice. All new objects use IF NOT EXISTS / OR REPLACE.
-- Paste this whole file into the Supabase SQL Editor.

-- ───────────────────────── ROUND-UPS ─────────────────────────
-- A round-up is a short challenge the leader posts to their crew.
-- Everyone sees it on their Crew screen and can "check in" to mark
-- themselves as on board. Expires automatically.
create table if not exists public.crew_roundups (
  id         uuid primary key default gen_random_uuid(),
  clan_id    uuid not null references public.clans(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  cue        text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists crew_roundups_clan_idx
  on public.crew_roundups (clan_id, expires_at desc);

create table if not exists public.crew_roundup_checkins (
  roundup_id uuid not null references public.crew_roundups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (roundup_id, user_id)
);

alter table public.crew_roundups         enable row level security;
alter table public.crew_roundup_checkins enable row level security;

-- RLS: members can read their crew's round-ups + check-ins.
drop policy if exists crew_roundups_read on public.crew_roundups;
create policy crew_roundups_read on public.crew_roundups for select
  using (
    exists (
      select 1 from public.clan_members cm
      where cm.clan_id = crew_roundups.clan_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists crew_roundup_checkins_read on public.crew_roundup_checkins;
create policy crew_roundup_checkins_read on public.crew_roundup_checkins for select
  using (
    exists (
      select 1
      from public.crew_roundups r
      join public.clan_members cm on cm.clan_id = r.clan_id
      where r.id = crew_roundup_checkins.roundup_id
        and cm.user_id = auth.uid()
    )
  );

-- Writes go through the RPCs below; no direct insert policies needed.


-- ───────────────────────── TOTALS ─────────────────────────
-- Crew totals for today + all-time, member count, active count today.
create or replace function public.crew_totals(p_clan_id uuid, p_day date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_ids uuid[];
  v_today_reps bigint := 0;
  v_today_sec  bigint := 0;
  v_life_reps  bigint := 0;
  v_life_sec   bigint := 0;
  v_active     int := 0;
  v_members    int := 0;
begin
  -- Caller must be in the clan (RLS-friendly gate).
  if not exists (
    select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'not a crew member';
  end if;

  select array_agg(user_id), count(*)
    into v_member_ids, v_members
  from public.clan_members where clan_id = p_clan_id;

  -- Today's totals
  select
    coalesce(sum(coalesce(pushups,0) + coalesce(squats,0) + coalesce(pullups,0)), 0),
    coalesce(sum(coalesce(hollow_sec,0)), 0),
    count(*) filter (where (coalesce(pushups,0)+coalesce(squats,0)+coalesce(hollow_sec,0)+coalesce(pullups,0)) > 0)
    into v_today_reps, v_today_sec, v_active
  from public.workouts
  where user_id = any(v_member_ids) and day = p_day;

  -- All-time totals
  select
    coalesce(sum(coalesce(pushups,0) + coalesce(squats,0) + coalesce(pullups,0)), 0),
    coalesce(sum(coalesce(hollow_sec,0)), 0)
    into v_life_reps, v_life_sec
  from public.workouts
  where user_id = any(v_member_ids);

  return jsonb_build_object(
    'member_count', v_members,
    'active_today', v_active,
    'today_reps',   v_today_reps,
    'today_sec',    v_today_sec,
    'alltime_reps', v_life_reps,
    'alltime_sec',  v_life_sec,
    'day',          p_day
  );
end;
$$;
grant execute on function public.crew_totals(uuid, date) to authenticated;


-- ───────────────────────── ROSTER ─────────────────────────
-- Full crew roster with today's contribution + streak + PR.
-- Used for the in-crew leaderboard + member tiles.
create or replace function public.crew_roster(p_clan_id uuid, p_day date default (now() at time zone 'utc')::date)
returns table(
  user_id       uuid,
  display_name  text,
  username      text,
  role          text,
  today_reps    int,
  today_sec     int,
  today_total   int,
  current_streak int,
  longest_streak int,
  pr_total      int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'not a crew member';
  end if;

  return query
    select
      p.id,
      coalesce(p.display_name, p.username, 'Friend') as display_name,
      p.username,
      cm.role::text,
      coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.pullups,0) as today_reps,
      coalesce(w.hollow_sec,0) as today_sec,
      coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.hollow_sec,0) + coalesce(w.pullups,0) as today_total,
      coalesce(s.current_len, 0) as current_streak,
      coalesce(s.longest_len, 0) as longest_streak,
      coalesce(pb.pushups,0) + coalesce(pb.squats,0) + coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0) as pr_total
    from public.clan_members cm
    join public.profiles p on p.id = cm.user_id
    left join public.workouts w on w.user_id = cm.user_id and w.day = p_day
    left join public.streaks  s on s.user_id = cm.user_id
    left join public.pbs      pb on pb.user_id = cm.user_id
    where cm.clan_id = p_clan_id
    order by today_total desc, current_streak desc, display_name asc;
end;
$$;
grant execute on function public.crew_roster(uuid, date) to authenticated;


-- ───────────────────────── ROUND-UP RPCs ─────────────────────────
-- Leader-only. Posts a round-up to the caller's current crew.
create or replace function public.post_crew_roundup(
  p_title text,
  p_cue text,
  p_hours int default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan uuid;
  v_role text;
  v_id   uuid;
  v_exp  timestamptz := now() + make_interval(hours => greatest(1, least(168, coalesce(p_hours, 24))));
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'title required'; end if;
  if coalesce(trim(p_cue), '') = ''   then raise exception 'cue required';   end if;
  if char_length(p_title) > 80  then raise exception 'title too long (max 80)'; end if;
  if char_length(p_cue)   > 400 then raise exception 'cue too long (max 400)'; end if;

  select cm.clan_id, cm.role::text
    into v_clan, v_role
  from public.clan_members cm
  where cm.user_id = auth.uid()
  order by cm.joined_at desc
  limit 1;

  if v_clan is null then raise exception 'you are not in a crew'; end if;
  if v_role <> 'leader' then raise exception 'only the crew leader can post a round-up'; end if;

  insert into public.crew_roundups (clan_id, created_by, title, cue, expires_at)
  values (v_clan, auth.uid(), trim(p_title), trim(p_cue), v_exp)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'expires_at', v_exp, 'clan_id', v_clan);
end;
$$;
grant execute on function public.post_crew_roundup(text, text, int) to authenticated;


-- List active round-ups for the caller's current crew, newest first.
create or replace function public.list_crew_roundups()
returns table(
  id uuid,
  clan_id uuid,
  title text,
  cue text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz,
  expires_at timestamptz,
  checkin_count int,
  you_checked_in boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select cm.clan_id into v_clan
  from public.clan_members cm
  where cm.user_id = auth.uid()
  order by cm.joined_at desc
  limit 1;

  if v_clan is null then return; end if;

  return query
    select
      r.id, r.clan_id, r.title, r.cue,
      r.created_by,
      coalesce(p.display_name, p.username, 'Leader') as created_by_name,
      r.created_at, r.expires_at,
      (select count(*)::int from public.crew_roundup_checkins c where c.roundup_id = r.id),
      exists(select 1 from public.crew_roundup_checkins c
             where c.roundup_id = r.id and c.user_id = auth.uid())
    from public.crew_roundups r
    left join public.profiles p on p.id = r.created_by
    where r.clan_id = v_clan and r.expires_at > now()
    order by r.created_at desc;
end;
$$;
grant execute on function public.list_crew_roundups() to authenticated;


-- Mark yourself in on a round-up. Idempotent.
create or replace function public.checkin_crew_roundup(p_roundup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select r.clan_id into v_clan
  from public.crew_roundups r
  where r.id = p_roundup_id and r.expires_at > now();

  if v_clan is null then raise exception 'round-up not found or expired'; end if;
  if not exists (
    select 1 from public.clan_members
    where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'not a crew member';
  end if;

  insert into public.crew_roundup_checkins (roundup_id, user_id)
  values (p_roundup_id, auth.uid())
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.checkin_crew_roundup(uuid) to authenticated;


-- Leader can retire a round-up early. Others get a hard error.
create or replace function public.end_crew_roundup(p_roundup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.crew_roundups
     set expires_at = now() - interval '1 second'
   where id = p_roundup_id
     and clan_id in (
       select clan_id from public.clan_members
       where user_id = auth.uid() and role = 'leader'
     );
  if not found then raise exception 'only the leader can end a round-up'; end if;
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.end_crew_roundup(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────
-- Verify (optional):
--   select public.crew_totals('<your clan_id>');
--   select * from public.crew_roster('<your clan_id>');
--   select * from public.list_crew_roundups();
