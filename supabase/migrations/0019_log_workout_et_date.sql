-- Fix: log_workout was stamping `day` with UTC date. Anyone logging after
-- ~20:00 ET got tomorrow's date written, which broke streaks, the cycle
-- bar, and the daily leaderboard window. Canonical day is ET (matches
-- the 00:05 ET nightly streak sweep cron).

create or replace function public.log_workout(
  p_pushups    int,
  p_squats     int,
  p_hollow_sec int,
  p_pullups    int,
  p_notes      text default null
) returns public.workouts language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_day   date := (now() at time zone 'America/New_York')::date;
  v_row   public.workouts;
  v_pb    public.pbs;
  v_eff   numeric;
  v_battle_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.workouts (user_id, day, pushups, squats, hollow_sec, pullups, notes)
  values (v_user, v_day, p_pushups, p_squats, p_hollow_sec, p_pullups, p_notes)
  on conflict (user_id, day) do update
    set pushups    = greatest(public.workouts.pushups,    excluded.pushups),
        squats     = greatest(public.workouts.squats,     excluded.squats),
        hollow_sec = greatest(public.workouts.hollow_sec, excluded.hollow_sec),
        pullups    = greatest(public.workouts.pullups,    excluded.pullups),
        notes      = coalesce(excluded.notes, public.workouts.notes)
  returning * into v_row;

  insert into public.pbs (user_id, pushups, squats, hollow_sec, pullups, updated_at)
  values (v_user, v_row.pushups, v_row.squats, v_row.hollow_sec, v_row.pullups, now())
  on conflict (user_id) do update
    set pushups    = greatest(public.pbs.pushups,    excluded.pushups),
        squats     = greatest(public.pbs.squats,     excluded.squats),
        hollow_sec = greatest(public.pbs.hollow_sec, excluded.hollow_sec),
        pullups    = greatest(public.pbs.pullups,    excluded.pullups),
        updated_at = now()
  returning * into v_pb;

  insert into public.streaks (user_id, current_len, longest_len, last_day, updated_at)
  values (v_user, 1, 1, v_day, now())
  on conflict (user_id) do update
    set current_len = case
          when public.streaks.last_day = v_day then public.streaks.current_len
          when public.streaks.last_day = v_day - 1 then public.streaks.current_len + 1
          else 1
        end,
        longest_len = greatest(
          public.streaks.longest_len,
          case
            when public.streaks.last_day = v_day then public.streaks.current_len
            when public.streaks.last_day = v_day - 1 then public.streaks.current_len + 1
            else 1
          end),
        last_day = v_day,
        updated_at = now();

  -- contribute to any open battle that includes this user
  for v_battle_id in
    select b.id from public.battles b
    join public.battle_members bm on bm.battle_id = b.id
    where bm.user_id = v_user and b.status = 'live'
  loop
    v_eff := (v_row.pushups + v_row.squats + v_row.hollow_sec + v_row.pullups);
    insert into public.battle_scores (battle_id, user_id, day, eff)
    values (v_battle_id, v_user, v_day, v_eff)
    on conflict (battle_id, user_id, day) do update
      set eff = greatest(public.battle_scores.eff, excluded.eff);
  end loop;

  return v_row;
end $$;

grant execute on function public.log_workout(int, int, int, int, text) to authenticated;

-- Backfill: any existing row where the stored UTC `day` doesn't match the
-- ET date the row was actually created. We shift day to the ET-correct
-- value. Conflict guard: if a row already exists at the target day for
-- the same user, merge by taking greatest of each station and delete the
-- duplicate (no rep loss).
do $$
declare
  r record;
  v_target date;
  v_existing public.workouts;
begin
  for r in
    select * from public.workouts
    where day <> (created_at at time zone 'America/New_York')::date
  loop
    v_target := (r.created_at at time zone 'America/New_York')::date;

    select * into v_existing
      from public.workouts
      where user_id = r.user_id and day = v_target;

    if found then
      -- Merge into the existing target-day row, then drop the misdated one.
      update public.workouts
        set pushups    = greatest(v_existing.pushups,    r.pushups),
            squats     = greatest(v_existing.squats,     r.squats),
            hollow_sec = greatest(v_existing.hollow_sec, r.hollow_sec),
            pullups    = greatest(v_existing.pullups,    r.pullups),
            notes      = coalesce(r.notes, v_existing.notes)
        where user_id = r.user_id and day = v_target;
      delete from public.workouts where user_id = r.user_id and day = r.day;
    else
      update public.workouts set day = v_target
        where user_id = r.user_id and day = r.day;
    end if;
  end loop;
end $$;

-- Recompute streaks from workouts for every user with workouts.
-- (Streak = length of consecutive day chain ending at MAX(day);
--  longest = longest run of consecutive days anywhere in history.)
with days as (
  select user_id, day,
         day - (row_number() over (partition by user_id order by day))::int as grp
  from public.workouts
),
runs as (
  select user_id, grp, count(*)::int as run_len, min(day) as run_start, max(day) as run_end
  from days
  group by user_id, grp
),
agg as (
  select user_id,
         max(run_len) as longest,
         (select run_len from runs r2
            where r2.user_id = r.user_id and r2.run_end = max(r.run_end)) as current_len,
         max(run_end) as last_day
  from runs r
  group by user_id
)
update public.streaks s
set current_len = a.current_len,
    longest_len = greatest(s.longest_len, a.longest),
    last_day    = a.last_day,
    updated_at  = now()
from agg a
where s.user_id = a.user_id;
