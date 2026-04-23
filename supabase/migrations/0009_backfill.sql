-- backfill_workouts: let a signed-in user push their entire local history to
-- the server in one call. Handles arbitrary past dates (log_workout stamps
-- today only), then rebuilds PBs and recomputes the streak from scratch.
--
-- Shape of p_entries:
--   [{ "day": "2026-04-20", "pushups": 25, "squats": 30, "hollow_sec": 45, "pullups": 8 }, ...]
--
-- Safe to re-run. Uses greatest(...) on conflict so a bigger day never
-- regresses to a smaller re-submit.

create or replace function public.backfill_workouts(p_entries jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_entry    jsonb;
  v_day      date;
  v_inserted int  := 0;
  v_last     date;
  v_longest  int  := 0;
  v_run      int  := 0;
  v_prev     date;
  v_cur      int  := 0;
  v_today    date := (now() at time zone 'utc')::date;
  r          record;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- 1) upsert every entry
  for v_entry in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_day := (v_entry->>'day')::date;
    if v_day is null or v_day > v_today then continue; end if;
    insert into public.workouts (user_id, day, pushups, squats, hollow_sec, pullups)
    values (
      v_user, v_day,
      coalesce((v_entry->>'pushups')::int,    0),
      coalesce((v_entry->>'squats')::int,     0),
      coalesce((v_entry->>'hollow_sec')::int, 0),
      coalesce((v_entry->>'pullups')::int,    0)
    )
    on conflict (user_id, day) do update
      set pushups    = greatest(public.workouts.pushups,    excluded.pushups),
          squats     = greatest(public.workouts.squats,     excluded.squats),
          hollow_sec = greatest(public.workouts.hollow_sec, excluded.hollow_sec),
          pullups    = greatest(public.workouts.pullups,    excluded.pullups);
    v_inserted := v_inserted + 1;
  end loop;

  -- 2) rebuild PBs from full workout history
  insert into public.pbs (user_id, pushups, squats, hollow_sec, pullups, updated_at)
  select v_user,
         coalesce(max(pushups),    0),
         coalesce(max(squats),     0),
         coalesce(max(hollow_sec), 0),
         coalesce(max(pullups),    0),
         now()
  from public.workouts where user_id = v_user
  on conflict (user_id) do update
    set pushups    = excluded.pushups,
        squats     = excluded.squats,
        hollow_sec = excluded.hollow_sec,
        pullups    = excluded.pullups,
        updated_at = now();

  -- 3) recompute longest streak (scan ascending, run length)
  v_prev := null;
  v_run := 0;
  for r in select day from public.workouts where user_id = v_user order by day asc loop
    if v_prev is null or r.day = v_prev + 1 then
      v_run := v_run + 1;
    else
      v_run := 1;
    end if;
    if v_run > v_longest then v_longest := v_run; end if;
    v_prev := r.day;
  end loop;

  -- 4) compute current streak (count back from most-recent day)
  select max(day) into v_last from public.workouts where user_id = v_user;
  if v_last is not null then
    v_prev := null; v_cur := 0;
    for r in select day from public.workouts where user_id = v_user order by day desc loop
      if v_prev is null then
        v_cur := 1; v_prev := r.day;
      elsif v_prev - 1 = r.day then
        v_cur := v_cur + 1; v_prev := r.day;
      else
        exit;
      end if;
    end loop;
    -- streak is only "current" if the run touches today or yesterday
    if v_last < v_today - 1 then v_cur := 0; end if;

    insert into public.streaks (user_id, current_len, longest_len, last_day, updated_at)
    values (v_user, v_cur, v_longest, v_last, now())
    on conflict (user_id) do update
      set current_len = v_cur,
          longest_len = greatest(public.streaks.longest_len, v_longest),
          last_day    = v_last,
          updated_at  = now();
  end if;

  return jsonb_build_object(
    'inserted', v_inserted,
    'current_streak', v_cur,
    'longest_streak', v_longest,
    'last_day', v_last
  );
end;
$$;

grant execute on function public.backfill_workouts(jsonb) to authenticated;
