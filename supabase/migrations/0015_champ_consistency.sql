-- 0015_champ_consistency.sql — Champs must stay hot or the state opens up.
--
-- Rule set (honor-system until refs are turned on):
--   1. ENFORCED — A crew with zero active members in the last 7 days cannot
--      hold the throne. Their state auto-opens and the next qualifying crew
--      takes the dot.
--   2. ENFORCED — Ranking now weights activity. A quiet crew with a huge
--      historical PR stack still loses to an active crew with a smaller
--      stack once the gap gets close. Total PR is the primary signal;
--      active_7d breaks near-ties and drives qualification.
--   3. HONOR CODE (displayed in UI, not enforced) — If a champ auto-declines
--      a challenge, they have 24h to re-challenge the contender or they
--      forfeit the crown. Surfaces in the modal copy; no backend logic yet.
--
-- `active_7d` is surfaced in the payload so the client can render the
-- consistency gauge on the champ card.
--
-- Safe to run twice.
--
-- NOTE: both return tables gain a new column (`active_7d`), so Postgres
-- requires a DROP first — CREATE OR REPLACE can't change the OUT signature.
-- Dropping is safe: grants get re-issued at the bottom, and no other DB
-- object holds a reference to either function.

drop function if exists public.map_state_champs();
drop function if exists public.list_state_crew_ladder(text, int);

-- ───────────────────────── CHAMPS MAP ─────────────────────────

create or replace function public.map_state_champs()
returns table (
  state_code   text,
  clan_id      uuid,
  name         text,
  tag          text,
  member_count int,
  total_pr     int,
  active_7d    int
)
language sql
stable
security definer
set search_path = public
as $$
  with active_members as (
    -- Per-user activity flag in last 7 days (UTC). Kept in its own CTE
    -- so joining it into the crew roll-up doesn't fan out the pb sum.
    select distinct user_id
    from public.workouts
    where day >= (now() at time zone 'utc')::date - 6
      and (coalesce(pushups,0) + coalesce(squats,0) +
           coalesce(hollow_sec,0) + coalesce(pullups,0)) > 0
  ),
  crew_rolled as (
    select
      c.region_state as state_code,
      c.id           as clan_id,
      c.name,
      c.tag,
      count(cm.user_id)::int as member_count,
      coalesce(sum(
        coalesce(pb.pushups,0) + coalesce(pb.squats,0) +
        coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0)
      ), 0)::int as total_pr,
      count(cm.user_id) filter (where am.user_id is not null)::int as active_7d
    from public.clans c
    join public.clan_members cm on cm.clan_id = c.id
    left join public.pbs pb on pb.user_id = cm.user_id
    left join active_members am on am.user_id = cm.user_id
    where c.is_public = true
      and c.is_system = false
      and c.region_state is not null
    group by c.region_state, c.id
  ),
  qualifiers as (
    -- Consistency gate — dead crews can't hold the crown.
    select * from crew_rolled where active_7d >= 1
  ),
  ranked as (
    select *,
      row_number() over (
        partition by state_code
        order by total_pr desc, active_7d desc, member_count desc, name asc
      ) as rnk
    from qualifiers
  )
  select state_code, clan_id, name, tag, member_count, total_pr, active_7d
  from ranked
  where rnk = 1
  order by state_code;
$$;

grant execute on function public.map_state_champs() to authenticated, anon;


-- ───────────────────────── STATE LADDER ─────────────────────────
-- Same activity gate, same ranking. The ladder surfaces active_7d so
-- contenders can see how close the champ is to dropping out, and how
-- warm their own crew is running.

create or replace function public.list_state_crew_ladder(
  p_state text,
  p_limit int default 10
)
returns table (
  rank         int,
  clan_id      uuid,
  name         text,
  tag          text,
  description  text,
  region_state text,
  age_bracket  text,
  member_count int,
  total_pr     int,
  avg_pr       int,
  active_today int,
  active_7d    int,
  is_yours     boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mine  uuid;
  v_today date := (now() at time zone 'utc')::date;
  v_wk_lo date := v_today - 6;
begin
  if p_state is null or length(trim(p_state)) = 0 then
    raise exception 'state required';
  end if;

  select cm.clan_id into v_mine
  from public.clan_members cm
  where cm.user_id = auth.uid()
  order by cm.joined_at desc
  limit 1;

  return query
    with active_members as (
      select distinct user_id
      from public.workouts
      where day >= v_wk_lo
        and (coalesce(pushups,0)+coalesce(squats,0)+
             coalesce(hollow_sec,0)+coalesce(pullups,0)) > 0
    ),
    today_members as (
      select distinct user_id
      from public.workouts
      where day = v_today
        and (coalesce(pushups,0)+coalesce(squats,0)+
             coalesce(hollow_sec,0)+coalesce(pullups,0)) > 0
    ),
    crew_rolled as (
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
        count(cm.user_id) filter (where tm.user_id is not null)::int as active_today,
        count(cm.user_id) filter (where am.user_id is not null)::int as active_7d
      from public.clans c
      join public.clan_members cm on cm.clan_id = c.id
      left join public.pbs pb on pb.user_id = cm.user_id
      left join active_members am on am.user_id = cm.user_id
      left join today_members tm on tm.user_id = cm.user_id
      where c.is_public = true
        and c.is_system = false
        and c.region_state = upper(trim(p_state))
      group by c.id
    ),
    ranked as (
      -- rank=1 MUST pass the consistency gate. Stale crews drop below
      -- any active crew regardless of historical PR. Inside each bucket,
      -- we rank by total_pr so recent-still-strong crews stay on top.
      select
        row_number() over (
          order by (active_7d >= 1) desc,
                   total_pr desc,
                   active_7d desc,
                   member_count desc,
                   name asc
        )::int as rank,
        *
      from crew_rolled
    )
    select
      r.rank,
      r.clan_id, r.name, r.tag, r.description, r.region_state, r.age_bracket,
      r.member_count,
      r.total_pr,
      case when r.member_count > 0 then (r.total_pr / r.member_count)::int else 0 end as avg_pr,
      r.active_today,
      r.active_7d,
      (r.clan_id = v_mine) as is_yours
    from ranked r
    order by r.rank
    limit coalesce(p_limit, 10);
end;
$$;

grant execute on function public.list_state_crew_ladder(text, int) to authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- Verify:
--   select * from public.map_state_champs();
--   select * from public.list_state_crew_ladder('NY', 10);
