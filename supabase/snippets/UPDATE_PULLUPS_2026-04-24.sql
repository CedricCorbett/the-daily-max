-- Paste this in the Supabase SQL Editor (service_role / dashboard).
-- UPDATES Cedric's existing 2026-04-24 row to set pullups = 20.
-- Does NOT insert a new row — fails loudly if today's row is missing.

do $$
declare
  v_user uuid;
  v_day  date := '2026-04-24';
  v_hit  int;
begin
  select id into v_user
  from auth.users
  where lower(email) = lower('corbettcollc@gmail.com')
  limit 1;

  if v_user is null then
    raise exception 'no auth.users row for corbettcollc@gmail.com';
  end if;

  update public.workouts
     set pullups = 20
   where user_id = v_user
     and day = v_day;

  get diagnostics v_hit = row_count;
  if v_hit = 0 then
    raise exception 'no workout row for % on % — nothing updated', v_user, v_day;
  end if;

  -- Refresh pullups PB from full history (in case 20 is a new PB).
  update public.pbs
     set pullups = (select coalesce(max(pullups), 0)
                      from public.workouts where user_id = v_user),
         updated_at = now()
   where user_id = v_user;

  raise notice 'Updated pullups=20 for user=% day=%', v_user, v_day;
end $$;

-- Verify:
select w.day, w.pushups, w.squats, w.hollow_sec, w.pullups
from public.workouts w
join auth.users u on u.id = w.user_id
where lower(u.email) = 'corbettcollc@gmail.com'
order by w.day desc
limit 5;
