-- 0018_champ_disambig.sql — Fix "column reference 'active_7d' is ambiguous".
--
-- Symptom: the Battle Map tab shows
--   column reference "active_7d" is ambiguous
-- because Postgres can't tell whether `active_7d` refers to the CTE column
-- or the function's RETURNS TABLE output column with the same name.
--
-- Fix: drop both functions and rebuild them with QUALIFIED references
-- everywhere (cr.active_7d, q.active_7d, r.active_7d). Window function
-- ORDER BY clauses now reference the explicit CTE alias so there is no
-- chance of the OUT parameter shadowing the column. Behavior identical
-- to 0015 — only the references are tightened up.
--
-- Safe to run twice. Paste into Supabase SQL Editor.

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
    select distinct w.user_id
    from public.workouts w
    where w.day >= (now() at time zone 'utc')::date - 6
      and (coalesce(w.pushups,0) + coalesce(w.squats,0) +
           coalesce(w.hollow_sec,0) + coalesce(w.pullups,0)) > 0
  ),
  crew_rolled as (
    select
      c.region_state as state_code,
      c.id           as clan_id,
      c.name         as name,
      c.tag          as tag,
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
    select cr.* from crew_rolled cr where cr.active_7d >= 1
  ),
  ranked as (
    select
      q.*,
      row_number() over (
        partition by q.state_code
        order by q.total_pr desc, q.active_7d desc, q.member_count desc, q.name asc
      ) as rnk
    from qualifiers q
  )
  select r.state_code, r.clan_id, r.name, r.tag, r.member_count, r.total_pr, r.active_7d
  from ranked r
  where r.rnk = 1
  order by r.state_code;
$$;

grant execute on function public.map_state_champs() to authenticated, anon;


-- ───────────────────────── STATE LADDER ─────────────────────────

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
#variable_conflict use_column
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
      select distinct w.user_id
      from public.workouts w
      where w.day >= v_wk_lo
        and (coalesce(w.pushups,0)+coalesce(w.squats,0)+
             coalesce(w.hollow_sec,0)+coalesce(w.pullups,0)) > 0
    ),
    today_members as (
      select distinct w.user_id
      from public.workouts w
      where w.day = v_today
        and (coalesce(w.pushups,0)+coalesce(w.squats,0)+
             coalesce(w.hollow_sec,0)+coalesce(w.pullups,0)) > 0
    ),
    crew_rolled as (
      select
        c.id           as clan_id,
        c.name         as name,
        c.tag          as tag,
        c.description  as description,
        c.region_state as region_state,
        c.age_bracket  as age_bracket,
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
      select
        cr.*,
        row_number() over (
          order by (cr.active_7d >= 1) desc,
                   cr.total_pr desc,
                   cr.active_7d desc,
                   cr.member_count desc,
                   cr.name asc
        )::int as rnk
      from crew_rolled cr
    )
    select
      r.rnk                                                            as rank,
      r.clan_id, r.name, r.tag, r.description, r.region_state, r.age_bracket,
      r.member_count,
      r.total_pr,
      case when r.member_count > 0 then (r.total_pr / r.member_count)::int else 0 end as avg_pr,
      r.active_today,
      r.active_7d,
      (r.clan_id = v_mine) as is_yours
    from ranked r
    order by r.rnk
    limit coalesce(p_limit, 10);
end;
$$;

grant execute on function public.list_state_crew_ladder(text, int) to authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- Verify in Supabase SQL Editor:
--   select * from public.map_state_champs();
--   select * from public.list_state_crew_ladder('NY', 10);
