-- Leaderboard RPC — "who put up the biggest total today, in my bracket".
-- Reads from public.workouts + public.profiles + public.streaks (for streak display).
-- Brackets match client defaults: '20s', '30s', '40s', '50s', '60+'. Passing null
-- returns the whole crew regardless of bracket (used when no bracket is set yet).

create or replace function public.list_leaderboard(
  p_bracket text default null,
  p_day     date default null,
  p_limit   int  default 25
) returns table (
  user_id      uuid,
  handle       text,
  display_name text,
  city         text,
  age_bracket  text,
  streak       int,
  pushups      int,
  squats       int,
  hollow_sec   int,
  pullups      int,
  total        int,
  is_you       boolean
)
language sql stable
security definer
set search_path = public
as $$
  with day as (select coalesce(p_day, (now() at time zone 'utc')::date) as d)
  select
    w.user_id,
    p.handle,
    p.display_name,
    p.city,
    p.age_bracket,
    coalesce(s.current_len, 0) as streak,
    w.pushups,
    w.squats,
    w.hollow_sec,
    w.pullups,
    (coalesce(w.pushups,0) + coalesce(w.squats,0) + coalesce(w.hollow_sec,0) + coalesce(w.pullups,0))::int as total,
    (w.user_id = auth.uid()) as is_you
  from public.workouts w
  join public.profiles p on p.id = w.user_id
  left join public.streaks s on s.user_id = w.user_id
  cross join day
  where w.day = day.d
    and (p_bracket is null or p.age_bracket = p_bracket)
  order by total desc, streak desc, p.handle asc
  limit coalesce(p_limit, 25);
$$;

grant execute on function public.list_leaderboard(text, date, int) to anon, authenticated;
