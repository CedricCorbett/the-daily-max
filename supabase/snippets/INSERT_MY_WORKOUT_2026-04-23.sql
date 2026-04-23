-- Paste this in the Supabase SQL Editor (service_role / dashboard).
-- Inserts Cedric's workout row for 2026-04-23 and rebuilds his PB + streak.
--
-- Why it's a DO block: we resolve the user by email via auth.users, so you
-- don't have to look up a UUID by hand. Safe to re-run — uses greatest() on
-- conflict so a prior bigger day won't regress.

do $$
declare
  v_user  uuid;
  v_day   date := '2026-04-23';
  v_today date := (now() at time zone 'utc')::date;
  v_last  date;
  v_long  int  := 0;
  v_cur   int  := 0;
  v_run   int  := 0;
  v_prev  date;
  r       record;
begin
  select id into v_user
  from auth.users
  where lower(email) = lower('corbettcollc@gmail.com')
  limit 1;

  if v_user is null then
    raise exception 'no auth.users row for corbettcollc@gmail.com';
  end if;

  -- 1) upsert the day
  insert into public.workouts (user_id, day, pushups, squats, hollow_sec, pullups)
  values (v_user, v_day, 60, 30, 45, 15)
  on conflict (user_id, day) do update
    set pushups    = greatest(public.workouts.pushups,    excluded.pushups),
        squats     = greatest(public.workouts.squats,     excluded.squats),
        hollow_sec = greatest(public.workouts.hollow_sec, excluded.hollow_sec),
        pullups    = greatest(public.workouts.pullups,    excluded.pullups);

  -- 2) rebuild PBs from full history
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

  -- 3) longest streak (scan ascending)
  v_prev := null; v_run := 0;
  for r in select day from public.workouts where user_id = v_user order by day asc loop
    if v_prev is null or r.day = v_prev + 1 then v_run := v_run + 1;
    else v_run := 1;
    end if;
    if v_run > v_long then v_long := v_run; end if;
    v_prev := r.day;
  end loop;

  -- 4) current streak (count back from last day)
  select max(day) into v_last from public.workouts where user_id = v_user;
  if v_last is not null then
    v_prev := null; v_cur := 0;
    for r in select day from public.workouts where user_id = v_user order by day desc loop
      if v_prev is null then v_cur := 1; v_prev := r.day;
      elsif v_prev - 1 = r.day then v_cur := v_cur + 1; v_prev := r.day;
      else exit;
      end if;
    end loop;
    if v_last < v_today - 1 then v_cur := 0; end if;

    insert into public.streaks (user_id, current_len, longest_len, last_day, updated_at)
    values (v_user, v_cur, v_long, v_last, now())
    on conflict (user_id) do update
      set current_len = v_cur,
          longest_len = greatest(public.streaks.longest_len, v_long),
          last_day    = v_last,
          updated_at  = now();
  end if;

  raise notice 'Inserted % for user % | current=% longest=% last=%',
    v_day, v_user, v_cur, v_long, v_last;
end $$;

-- Verify:
select w.day, w.pushups, w.squats, w.hollow_sec, w.pullups
from public.workouts w
join auth.users u on u.id = w.user_id
where lower(u.email) = 'corbettcollc@gmail.com'
order by w.day desc
limit 14;

select s.current_len, s.longest_len, s.last_day
from public.streaks s
join auth.users u on u.id = s.user_id
where lower(u.email) = 'corbettcollc@gmail.com';
