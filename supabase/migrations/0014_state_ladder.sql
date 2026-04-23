-- 0014_state_ladder.sql — Regional crew ladder for the Battle map.
--
-- Two RPCs back the new map UI:
--   * map_state_champs()          → { state_code → reigning crew name } for every state
--                                    that has at least one public crew. One tiny payload
--                                    so the map can render gold dots in one call.
--   * list_state_crew_ladder(...) → top N crews for a given state, ranked by summed
--                                    member PR total. Top row is the reigning champ;
--                                    next 9 are the contenders.
--
-- Safe to run twice. Paste into Supabase SQL Editor.

-- ───────────────────────── CHAMPS MAP ─────────────────────────
-- One row per state that has a crew. Returns just enough for the UI to
-- put a gold dot on the tile and show the champ name in a tooltip.

create or replace function public.map_state_champs()
returns table (
  state_code   text,
  clan_id      uuid,
  name         text,
  tag          text,
  member_count int,
  total_pr     int
)
language sql
stable
security definer
set search_path = public
as $$
  with crew_rolled as (
    select
      c.region_state as state_code,
      c.id           as clan_id,
      c.name,
      c.tag,
      count(cm.user_id)::int as member_count,
      coalesce(sum(
        coalesce(pb.pushups,0) + coalesce(pb.squats,0) +
        coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0)
      ), 0)::int as total_pr
    from public.clans c
    join public.clan_members cm on cm.clan_id = c.id
    left join public.pbs pb on pb.user_id = cm.user_id
    where c.is_public = true
      and c.is_system = false
      and c.region_state is not null
    group by c.region_state, c.id
  ),
  ranked as (
    select *,
      row_number() over (
        partition by state_code
        order by total_pr desc, member_count desc, name asc
      ) as rnk
    from crew_rolled
  )
  select state_code, clan_id, name, tag, member_count, total_pr
  from ranked
  where rnk = 1
  order by state_code;
$$;

grant execute on function public.map_state_champs() to authenticated, anon;


-- ───────────────────────── STATE LADDER ─────────────────────────
-- Top N crews for one state, ranked. rank=1 is the reigning champ.

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
        and c.region_state = upper(trim(p_state))
      group by c.id
    ),
    ranked as (
      select
        row_number() over (order by total_pr desc, member_count desc, name asc)::int as rank,
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
