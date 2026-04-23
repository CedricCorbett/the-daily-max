-- 0012_crew_fix.sql — Fix ambiguous user_id reference in crew_roster.
--
-- In 0010_crew.sql, crew_roster declares OUT parameters including
-- `user_id uuid`. Inside the function body, the membership pre-flight
-- check used an unqualified `user_id = auth.uid()`, which Postgres
-- refuses to resolve (it could mean the OUT param OR the clan_members
-- column) and fails the call with:
--   "column reference user_id is ambiguous".
--
-- Fix: qualify every column reference with the table alias. Nothing
-- else changes. Safe to run any time — CREATE OR REPLACE.
--
-- Paste into Supabase SQL Editor.

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
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id and cm.user_id = auth.uid()
  ) then
    raise exception 'not a crew member';
  end if;

  return query
    select
      p.id as user_id,
      coalesce(p.display_name, p.username, 'Friend') as display_name,
      p.username,
      cm.role::text as role,
      (coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.pullups,0))::int as today_reps,
      coalesce(w.hollow_sec,0)::int as today_sec,
      (coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.hollow_sec,0) + coalesce(w.pullups,0))::int as today_total,
      coalesce(s.current_len, 0)::int as current_streak,
      coalesce(s.longest_len, 0)::int as longest_streak,
      (coalesce(pb.pushups,0) + coalesce(pb.squats,0) + coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0))::int as pr_total
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

-- Also re-apply crew_totals with an explicit alias on the membership check
-- so any future OUT-param additions don't bite. No behaviour change.
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
  if not exists (
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id and cm.user_id = auth.uid()
  ) then
    raise exception 'not a crew member';
  end if;

  select array_agg(cm.user_id), count(*)
    into v_member_ids, v_members
  from public.clan_members cm where cm.clan_id = p_clan_id;

  select
    coalesce(sum(coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.pullups,0)), 0),
    coalesce(sum(coalesce(w.hollow_sec,0)), 0),
    count(*) filter (where (coalesce(w.pushups,0)+coalesce(w.squats,0)+coalesce(w.hollow_sec,0)+coalesce(w.pullups,0)) > 0)
    into v_today_reps, v_today_sec, v_active
  from public.workouts w
  where w.user_id = any(v_member_ids) and w.day = p_day;

  select
    coalesce(sum(coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.pullups,0)), 0),
    coalesce(sum(coalesce(w.hollow_sec,0)), 0)
    into v_life_reps, v_life_sec
  from public.workouts w
  where w.user_id = any(v_member_ids);

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

-- ────────────────────────────────────────────────────────────
-- Verify:
--   select * from public.crew_roster('<your clan_id>');
--   select public.crew_totals('<your clan_id>');
