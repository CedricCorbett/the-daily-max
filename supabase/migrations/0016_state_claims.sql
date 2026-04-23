-- 0016_state_claims.sql — Claim & Dethrone: put up a number in 3 days.
--
-- Two flavors of claim:
--   * CLAIM     — state is open (no champ). Your crew posts a number over
--                 a 3-day window. If anyone else fires their own claim
--                 during the window it becomes a race-to-the-top.
--   * DETHRONE  — state has a reigning champ. Your crew challenges them.
--                 Both crews put up a number over 3 days. Higher total
--                 takes the crown (ties go to the defender — honor code
--                 says you've gotta beat the throne, not tie it).
--
-- Scoring: summed member reps logged during the window (pushups + squats
-- + hollow_sec + pullups across all rows in [opened_at::date, now]).
-- Brute-force reps per the honor-code brief; refs can upgrade to
-- cross-class % of PR later.
--
-- Resolver is LAZY. No cron needed. Any RPC that reads claim state first
-- resolves expired rows in-band. A wake-up inside map_state_champs()
-- closes stale claims the next time anyone looks at the map.
--
-- Safe to run twice.

-- ───────────────────────── SCHEMA ─────────────────────────

create table if not exists public.state_claims (
  id                uuid primary key default gen_random_uuid(),
  state_code        text not null,
  kind              text not null check (kind in ('claim','dethrone')),
  claimant_clan_id  uuid not null references public.clans(id) on delete cascade,
  defender_clan_id  uuid references public.clans(id) on delete cascade,
  opened_at         timestamptz not null default now(),
  deadline_at       timestamptz not null default (now() + interval '3 days'),
  status            text not null default 'pending'
                    check (status in ('pending','resolved','expired')),
  winner_clan_id    uuid references public.clans(id),
  claimant_score    int,
  defender_score    int,
  resolved_at       timestamptz,
  opened_by         uuid references public.profiles(id) on delete set null
);

-- Only one pending claim per state at a time — the unique partial index
-- is what enforces the "no two races at once" rule.
create unique index if not exists state_claims_one_pending
  on public.state_claims (state_code) where status = 'pending';
create index if not exists state_claims_deadline_idx
  on public.state_claims (deadline_at) where status = 'pending';

alter table public.state_claims enable row level security;

drop policy if exists "state_claims_read" on public.state_claims;
create policy "state_claims_read" on public.state_claims
  for select using (true);

-- Writes go through SECURITY DEFINER RPCs only.

-- ───────────────────────── HELPERS ─────────────────────────

-- Sum of reps logged by every member of a clan between opened_at and now.
-- Caps on the inclusive day range, never peeks outside the window.
create or replace function public._state_claim_score(
  p_clan_id uuid, p_opened timestamptz, p_deadline timestamptz
) returns int
language sql stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    coalesce(w.pushups,0) + coalesce(w.squats,0) +
    coalesce(w.hollow_sec,0) + coalesce(w.pullups,0)
  ), 0)::int
  from public.clan_members cm
  join public.workouts w on w.user_id = cm.user_id
  where cm.clan_id = p_clan_id
    and w.day >= (p_opened)::date
    and w.day <= least(now(), p_deadline)::date;
$$;

-- Resolve an expired claim in place. Idempotent. Called lazily by
-- every reader. Winner rule:
--   claim:    claimant_score > 0       → claimant wins, else expired.
--   dethrone: claimant > defender      → claimant wins, else defender holds.
-- Ties always go to the defender (or nobody, for open claims).
create or replace function public._state_claim_resolve(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.state_claims;
  c_score int;
  d_score int;
  winner uuid;
begin
  select * into r from public.state_claims where id = p_id for update;
  if not found or r.status <> 'pending' then return; end if;
  if now() < r.deadline_at then return; end if;

  c_score := public._state_claim_score(r.claimant_clan_id, r.opened_at, r.deadline_at);
  d_score := case when r.defender_clan_id is null then null
                  else public._state_claim_score(r.defender_clan_id, r.opened_at, r.deadline_at)
             end;

  if r.kind = 'claim' then
    winner := case when c_score > 0 then r.claimant_clan_id else null end;
  else -- dethrone
    winner := case
      when c_score > coalesce(d_score, 0) then r.claimant_clan_id
      else r.defender_clan_id
    end;
  end if;

  update public.state_claims
     set status          = case when winner is null then 'expired' else 'resolved' end,
         winner_clan_id  = winner,
         claimant_score  = c_score,
         defender_score  = d_score,
         resolved_at     = now()
   where id = p_id;
end;
$$;

-- Sweep all expired pending claims. Cheap, no-op when nothing is due.
create or replace function public._state_claims_sweep()
returns void
language sql
security definer
set search_path = public
as $$
  select public._state_claim_resolve(id)
  from public.state_claims
  where status = 'pending' and deadline_at <= now();
$$;

-- ───────────────────────── RPCS ─────────────────────────

-- CLAIM: open state, your crew puts up a flag. Fails if the state
-- already has a reigning champ or another pending claim.
create or replace function public.start_state_claim(p_state text)
returns public.state_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_clan uuid;
  v_code text := upper(trim(coalesce(p_state, '')));
  v_row  public.state_claims;
  v_champ uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if length(v_code) = 0 then raise exception 'state required'; end if;

  perform public._state_claims_sweep();

  select cm.clan_id into v_clan
  from public.clan_members cm where cm.user_id = v_uid
  order by cm.joined_at desc limit 1;
  if v_clan is null then raise exception 'join a crew first'; end if;

  -- Don't allow claim on a state that already has a sitting champ.
  select clan_id into v_champ from public.map_state_champs()
  where state_code = v_code;
  if v_champ is not null then
    raise exception 'state has a champ — use dethrone';
  end if;

  insert into public.state_claims (state_code, kind, claimant_clan_id, opened_by)
  values (v_code, 'claim', v_clan, v_uid)
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'a claim is already running on this state';
end;
$$;

-- DETHRONE: state has a champ, your crew challenges. The champ's crew
-- is auto-set as the defender. Both sides score over the 3-day window.
create or replace function public.start_state_dethrone(p_state text)
returns public.state_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_clan   uuid;
  v_code   text := upper(trim(coalesce(p_state, '')));
  v_champ  uuid;
  v_row    public.state_claims;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if length(v_code) = 0 then raise exception 'state required'; end if;

  perform public._state_claims_sweep();

  select cm.clan_id into v_clan
  from public.clan_members cm where cm.user_id = v_uid
  order by cm.joined_at desc limit 1;
  if v_clan is null then raise exception 'join a crew first'; end if;

  select clan_id into v_champ from public.map_state_champs() where state_code = v_code;
  if v_champ is null then raise exception 'state is open — use claim'; end if;
  if v_champ = v_clan then raise exception 'you already hold this state'; end if;

  insert into public.state_claims
    (state_code, kind, claimant_clan_id, defender_clan_id, opened_by)
  values (v_code, 'dethrone', v_clan, v_champ, v_uid)
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'a claim is already running on this state';
end;
$$;

-- STATUS: one row per pending/recent claim for a state, with live
-- scores rolled from workouts during the window. Resolver runs first
-- so a stale row flips to resolved/expired before we read it.
create or replace function public.state_claim_status(p_state text)
returns table (
  id               uuid,
  state_code       text,
  kind             text,
  status           text,
  claimant_clan_id uuid,
  claimant_name    text,
  claimant_tag     text,
  defender_clan_id uuid,
  defender_name    text,
  defender_tag     text,
  claimant_score   int,
  defender_score   int,
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
      sc.claimant_clan_id,
      cc.name, cc.tag,
      sc.defender_clan_id,
      dc.name, dc.tag,
      coalesce(sc.claimant_score, public._state_claim_score(sc.claimant_clan_id, sc.opened_at, sc.deadline_at)) as claimant_score,
      case when sc.defender_clan_id is null then null
           else coalesce(sc.defender_score, public._state_claim_score(sc.defender_clan_id, sc.opened_at, sc.deadline_at))
      end as defender_score,
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

-- Map-wide contested badge payload: one row per state with a pending
-- claim so the client can overlay ⚔/⚑ markers without per-tile calls.
create or replace function public.map_state_claims()
returns table (
  state_code       text,
  kind             text,
  claimant_clan_id uuid,
  defender_clan_id uuid,
  seconds_left     int
)
language sql stable
security definer
set search_path = public
as $$
  select
    sc.state_code,
    sc.kind,
    sc.claimant_clan_id,
    sc.defender_clan_id,
    greatest(0, extract(epoch from (sc.deadline_at - now()))::int) as seconds_left
  from public.state_claims sc
  where sc.status = 'pending' and sc.deadline_at > now()
  order by sc.state_code;
$$;

grant execute on function public.start_state_claim(text) to authenticated;
grant execute on function public.start_state_dethrone(text) to authenticated;
grant execute on function public.state_claim_status(text) to authenticated, anon;
grant execute on function public.map_state_claims() to authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- Verify:
--   select * from public.map_state_claims();
--   select * from public.state_claim_status('NY');
--   select public.start_state_claim('NY');     -- as a member of a crew
--   select public.start_state_dethrone('NY');  -- as a member of a diff crew
