-- 0017_claim_scoring.sql — Cross-class scoring for dethrones.
--
-- SPEC recap (from user brief):
--   1v1 + crew-vs-crew:
--     IN CLASS   (PR within ±10%) → raw reps win. "Brute force."
--     CROSS CLASS                 → mean % of PR, capped at 1.0 per day,
--                                    averaged across the window + members.
--                                    "Movement over ego." Titans can't
--                                    carry by sheer volume.
--
-- CLAIM (open-state, unilateral) stays raw-reps — no opponent, no class to
-- compare against. Any number > 0 plants the flag.
--
-- DETHRONE (head-to-head for a held state) now auto-picks scoring:
--   * Both crews' total_pr (sum of member PB sums) within ±10% → reps.
--   * Otherwise → mean daily effort per member, averaged across the crew.
--
-- We keep the existing integer score columns for raw reps (back-compat +
-- display for in-class races). Two new numeric columns hold the 0.0–1.0
-- effort scores for cross-class races. A `scoring_kind` column tells the
-- client which pair of columns to display.
--
-- Safe to run twice.

-- ───────────────────────── SCHEMA ─────────────────────────

alter table public.state_claims
  add column if not exists scoring_kind     text,
  add column if not exists claimant_effort  numeric(5,4),
  add column if not exists defender_effort  numeric(5,4);

-- Back-fill scoring_kind on historical rows so old pending races continue
-- to resolve under raw reps (the original behavior they were started on).
update public.state_claims set scoring_kind = 'reps' where scoring_kind is null;

-- ───────────────────────── HELPERS ─────────────────────────

-- Crew total PR = sum of all members' PB sums. Matches the value the
-- ladder displays as total_pr.
create or replace function public._clan_pr_total(p_clan_id uuid)
returns int
language sql stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    coalesce(pb.pushups,0) + coalesce(pb.squats,0) +
    coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0)
  ), 0)::int
  from public.clan_members cm
  left join public.pbs pb on pb.user_id = cm.user_id
  where cm.clan_id = p_clan_id;
$$;

-- Crew window effort (0.0–1.0 numeric). For each current member:
--   Per day d in window: daily_effort = min(1, day_total_reps / member_pr)
--     (0 if member_pr <= 0)
--   Member window effort = SUM(daily_effort) / window_days
--   Crew score            = AVG(member window effort across all members)
-- Members who never logged still count (effort 0), so ghost rosters get
-- punished. Window_days uses the capped-by-now deadline so resolving
-- mid-window (lazy sweep) doesn't deflate scores.
create or replace function public._clan_window_effort(
  p_clan_id uuid, p_opened timestamptz, p_deadline timestamptz
) returns numeric
language sql stable
security definer
set search_path = public
as $$
  with win as (
    select
      (p_opened)::date                           as d_lo,
      least(now(), p_deadline)::date             as d_hi,
      greatest(1, (least(now(), p_deadline)::date - (p_opened)::date) + 1) as days
  ),
  members as (
    select cm.user_id,
           (coalesce(pb.pushups,0) + coalesce(pb.squats,0) +
            coalesce(pb.hollow_sec,0) + coalesce(pb.pullups,0))::int as pr
    from public.clan_members cm
    left join public.pbs pb on pb.user_id = cm.user_id
    where cm.clan_id = p_clan_id
  ),
  daily as (
    -- Per-member, per-day effort capped at 1.0.
    select m.user_id,
           least(1.0,
             (coalesce(w.pushups,0)+coalesce(w.squats,0)+
              coalesce(w.hollow_sec,0)+coalesce(w.pullups,0))::numeric
             / nullif(m.pr, 0)
           ) as daily_effort
    from members m
    cross join win
    left join public.workouts w
      on w.user_id = m.user_id
     and w.day between win.d_lo and win.d_hi
  ),
  per_member as (
    select m.user_id,
           coalesce(sum(daily.daily_effort), 0) / (select days from win) as member_effort
    from members m
    left join daily on daily.user_id = m.user_id
    group by m.user_id
  )
  select coalesce(avg(member_effort), 0)::numeric(5,4) from per_member;
$$;

-- Helper: which scoring kind applies between two crews? "reps" when their
-- total PRs are within ±10% (symmetric via max denominator, matching the
-- client-side draftInClass semantics), else "effort".
create or replace function public._claim_scoring_kind(p_a uuid, p_b uuid)
returns text
language sql stable
security definer
set search_path = public
as $$
  with t as (
    select public._clan_pr_total(p_a) as a, public._clan_pr_total(p_b) as b
  )
  select case
    when a <= 0 or b <= 0 then 'reps'          -- no PRs yet → fall back to raw
    when abs(a - b)::numeric / greatest(a, b) <= 0.10 then 'reps'
    else 'effort'
  end
  from t;
$$;

-- ─────────────────────── REWRITE RESOLVER ───────────────────────

-- Resolve an expired claim in place. Idempotent. Now scoring-kind aware.
--   CLAIM:    claimant_score > 0       → claimant wins, else expired.
--   DETHRONE: scoring_kind decides whether winner is chosen by reps or
--             by effort. Ties go to the defender in both cases.
create or replace function public._state_claim_resolve(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.state_claims;
  c_reps   int;
  d_reps   int;
  c_eff    numeric;
  d_eff    numeric;
  kind     text;
  winner   uuid;
begin
  select * into r from public.state_claims where id = p_id for update;
  if not found or r.status <> 'pending' then return; end if;
  if now() < r.deadline_at then return; end if;

  -- Always compute reps for display/back-compat.
  c_reps := public._state_claim_score(r.claimant_clan_id, r.opened_at, r.deadline_at);
  d_reps := case when r.defender_clan_id is null then null
                 else public._state_claim_score(r.defender_clan_id, r.opened_at, r.deadline_at)
            end;

  if r.kind = 'claim' then
    kind := 'reps';
    winner := case when c_reps > 0 then r.claimant_clan_id else null end;
  else
    -- dethrone: pick scoring by class gap
    kind := public._claim_scoring_kind(r.claimant_clan_id, r.defender_clan_id);
    if kind = 'effort' then
      c_eff := public._clan_window_effort(r.claimant_clan_id, r.opened_at, r.deadline_at);
      d_eff := public._clan_window_effort(r.defender_clan_id, r.opened_at, r.deadline_at);
      winner := case
        when c_eff > coalesce(d_eff, 0) then r.claimant_clan_id
        else r.defender_clan_id                -- ties go to defender
      end;
    else
      winner := case
        when c_reps > coalesce(d_reps, 0) then r.claimant_clan_id
        else r.defender_clan_id
      end;
    end if;
  end if;

  update public.state_claims
     set status          = case when winner is null then 'expired' else 'resolved' end,
         winner_clan_id  = winner,
         claimant_score  = c_reps,
         defender_score  = d_reps,
         claimant_effort = c_eff,
         defender_effort = d_eff,
         scoring_kind    = kind,
         resolved_at     = now()
   where id = p_id;
end;
$$;

-- ─────────────────────── REWRITE STATUS READER ───────────────────────
-- Add scoring_kind + live effort scores to the status payload.

drop function if exists public.state_claim_status(text);

create or replace function public.state_claim_status(p_state text)
returns table (
  id               uuid,
  state_code       text,
  kind             text,
  status           text,
  scoring_kind     text,
  claimant_clan_id uuid,
  claimant_name    text,
  claimant_tag     text,
  defender_clan_id uuid,
  defender_name    text,
  defender_tag     text,
  claimant_score   int,
  defender_score   int,
  claimant_effort  numeric,
  defender_effort  numeric,
  claimant_pr      int,
  defender_pr      int,
  winner_clan_id   uuid,
  opened_at        timestamptz,
  deadline_at      timestamptz,
  seconds_left     int,
  is_yours         boolean
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_state, '')));
  v_mine uuid;
begin
  perform public._state_claims_sweep();

  select cm.clan_id into v_mine from public.clan_members cm
  where cm.user_id = auth.uid() order by cm.joined_at desc limit 1;

  return query
    select
      sc.id,
      sc.state_code,
      sc.kind,
      sc.status,
      -- Live scoring_kind for pending dethrones (resolves at deadline,
      -- but the UI needs to know now which formula is live).
      coalesce(sc.scoring_kind,
        case when sc.kind = 'dethrone' and sc.defender_clan_id is not null
             then public._claim_scoring_kind(sc.claimant_clan_id, sc.defender_clan_id)
             else 'reps' end
      ) as scoring_kind,
      sc.claimant_clan_id,
      cc.name, cc.tag,
      sc.defender_clan_id,
      dc.name, dc.tag,
      coalesce(sc.claimant_score,
        public._state_claim_score(sc.claimant_clan_id, sc.opened_at, sc.deadline_at)
      ) as claimant_score,
      case when sc.defender_clan_id is null then null
           else coalesce(sc.defender_score,
             public._state_claim_score(sc.defender_clan_id, sc.opened_at, sc.deadline_at))
      end as defender_score,
      coalesce(sc.claimant_effort,
        public._clan_window_effort(sc.claimant_clan_id, sc.opened_at, sc.deadline_at)
      ) as claimant_effort,
      case when sc.defender_clan_id is null then null
           else coalesce(sc.defender_effort,
             public._clan_window_effort(sc.defender_clan_id, sc.opened_at, sc.deadline_at))
      end as defender_effort,
      public._clan_pr_total(sc.claimant_clan_id)                     as claimant_pr,
      case when sc.defender_clan_id is null then null
           else public._clan_pr_total(sc.defender_clan_id) end       as defender_pr,
      sc.winner_clan_id,
      sc.opened_at,
      sc.deadline_at,
      greatest(0, extract(epoch from (sc.deadline_at - now()))::int) as seconds_left,
      (sc.claimant_clan_id = v_mine or sc.defender_clan_id = v_mine) as is_yours
    from public.state_claims sc
    left join public.clans cc on cc.id = sc.claimant_clan_id
    left join public.clans dc on dc.id = sc.defender_clan_id
    where sc.state_code = v_code
    order by
      case when sc.status = 'pending' then 0 else 1 end,
      sc.opened_at desc
    limit 3;
end;
$$;

grant execute on function public._clan_pr_total(uuid)                         to authenticated, anon;
grant execute on function public._clan_window_effort(uuid, timestamptz, timestamptz) to authenticated, anon;
grant execute on function public._claim_scoring_kind(uuid, uuid)              to authenticated, anon;
grant execute on function public.state_claim_status(text)                     to authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- Verify:
--   select * from public.state_claim_status('NY');
--   select public._clan_window_effort(
--     (select id from public.clans limit 1),
--     now() - interval '3 days', now()
--   );
