-- 0013_battle_opponents.sql — Real opponent + crew discovery for the Battle screen.
--
-- The old Draft screen read opponents from a hard-coded client-side seed
-- (LEADERBOARD[bracket] = []) which is why real people like Dano never
-- appeared. These two RPCs pull live data.
--
-- Safe to run twice. Paste into Supabase SQL Editor.

-- ───────────────────────── 1v1 OPPONENTS ─────────────────────────
-- Everyone with a recorded PR (implies they've logged at least once),
-- minus the caller, ordered by PR total desc. Optional bracket filter.
-- "Available for challenging" = always: drafts are asynchronous 7-day
-- windows, so no one needs to be "online."

create or replace function public.list_battle_opponents(
  p_bracket text default null,
  p_limit   int  default 50
) returns table (
  user_id        uuid,
  display_name   text,
  username       text,
  city           text,
  age_bracket    text,
  region_state   text,
  pr_total       int,
  current_streak int,
  last_logged    date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id          as user_id,
    coalesce(p.display_name, p.username, 'Friend') as display_name,
    p.username,
    p.city,
    p.age_bracket,
    p.region_state,
    (coalesce(pb.pushups,0) + coalesce(pb.squats,0) + coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0))::int as pr_total,
    coalesce(s.current_len, 0)::int as current_streak,
    s.last_day    as last_logged
  from public.profiles p
  left join public.pbs     pb on pb.user_id = p.id
  left join public.streaks s  on s.user_id  = p.id
  where p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and (p_bracket is null or p.age_bracket = p_bracket)
    and (
      pb.user_id is not null   -- has a PR (ever logged)
      or s.current_len > 0     -- or has an active streak
    )
  order by pr_total desc, current_streak desc, p.username asc
  limit coalesce(p_limit, 50);
$$;

grant execute on function public.list_battle_opponents(text, int) to authenticated;


-- ───────────────────────── CREW vs CREW CANDIDATES ─────────────────────────
-- All crews other than the caller's, ranked by summed member PR total.
-- Used for the "pick a crew to challenge" tab on the Battle screen.

create or replace function public.list_battle_crews(
  p_limit int default 20
) returns table (
  clan_id      uuid,
  name         text,
  tag          text,
  description  text,
  region_state text,
  age_bracket  text,
  member_count int,
  total_pr     int,
  avg_pr       int,
  active_today int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mine uuid;
  v_today date := (now() at time zone 'utc')::date;
begin
  select cm.clan_id into v_mine
  from public.clan_members cm
  where cm.user_id = auth.uid()
  order by cm.joined_at desc
  limit 1;

  return query
    with crew_rolled as (
      select
        c.id           as clan_id,
        c.name,
        c.tag,
        c.description,
        c.region_state,
        c.age_bracket,
        count(cm.user_id)::int as member_count,
        coalesce(sum(
          coalesce(pb.pushups,0) + coalesce(pb.squats,0) +
          coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0)
        ), 0)::int as total_pr,
        count(w.user_id) filter (
          where (coalesce(w.pushups,0)+coalesce(w.squats,0)+coalesce(w.hollow_sec,0)+coalesce(w.pullups,0)) > 0
        )::int as active_today
      from public.clans c
      join public.clan_members cm on cm.clan_id = c.id
      left join public.pbs pb on pb.user_id = cm.user_id
      left join public.workouts w on w.user_id = cm.user_id and w.day = v_today
      where c.is_public = true
        and c.is_system = false
        and (v_mine is null or c.id <> v_mine)
      group by c.id
    )
    select
      cr.clan_id, cr.name, cr.tag, cr.description, cr.region_state, cr.age_bracket,
      cr.member_count,
      cr.total_pr,
      case when cr.member_count > 0 then (cr.total_pr / cr.member_count)::int else 0 end as avg_pr,
      cr.active_today
    from crew_rolled cr
    order by cr.total_pr desc, cr.member_count desc, cr.name asc
    limit coalesce(p_limit, 20);
end;
$$;

grant execute on function public.list_battle_crews(int) to authenticated;

-- ────────────────────────────────────────────────────────────
-- Verify:
--   select * from public.list_battle_opponents() limit 10;
--   select * from public.list_battle_crews();
