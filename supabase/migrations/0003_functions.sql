-- RPCs. Keep scoring math server-side so leaderboards can't be faked.

-- Sum today's work (mixed-unit: seconds + reps, matching the client's pragmatic total)
create or replace function public.work_total(w public.workouts)
returns integer language sql immutable as $$
  select coalesce(w.pushups, 0) + coalesce(w.squats, 0) + coalesce(w.hollow_sec, 0) + coalesce(w.pullups, 0);
$$;

create or replace function public.pr_total(p public.pbs)
returns integer language sql immutable as $$
  select coalesce(p.pushups, 0) + coalesce(p.squats, 0) + coalesce(p.hollow_sec, 0) + coalesce(p.pullups, 0);
$$;

-- effort_score: min(work_total / pr_total, 1.0). Returns 0 if no PR yet.
create or replace function public.effort_score(w public.workouts, p public.pbs)
returns numeric language plpgsql immutable as $$
declare
  total int := public.work_total(w);
  pr int := public.pr_total(p);
begin
  if pr <= 0 then return 0; end if;
  return least(1.0, total::numeric / pr::numeric);
end;
$$;

-- log_workout: upsert today's workout, advance PBs, advance streak, contribute to any live battle
create or replace function public.log_workout(
  p_pushups    int,
  p_squats     int,
  p_hollow_sec int,
  p_pullups    int,
  p_notes      text default null
) returns public.workouts language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_day   date := (now() at time zone 'utc')::date;
  v_row   public.workouts;
  v_pb    public.pbs;
  v_eff   numeric;
  v_battle_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.workouts (user_id, day, pushups, squats, hollow_sec, pullups, notes)
  values (v_user, v_day, p_pushups, p_squats, p_hollow_sec, p_pullups, p_notes)
  on conflict (user_id, day) do update
    set pushups    = greatest(public.workouts.pushups,    excluded.pushups),
        squats     = greatest(public.workouts.squats,     excluded.squats),
        hollow_sec = greatest(public.workouts.hollow_sec, excluded.hollow_sec),
        pullups    = greatest(public.workouts.pullups,    excluded.pullups),
        notes      = coalesce(excluded.notes, public.workouts.notes)
  returning * into v_row;

  -- upsert PBs (one station at a time)
  insert into public.pbs (user_id, pushups, squats, hollow_sec, pullups, updated_at)
  values (v_user, v_row.pushups, v_row.squats, v_row.hollow_sec, v_row.pullups, now())
  on conflict (user_id) do update
    set pushups    = greatest(public.pbs.pushups,    excluded.pushups),
        squats     = greatest(public.pbs.squats,     excluded.squats),
        hollow_sec = greatest(public.pbs.hollow_sec, excluded.hollow_sec),
        pullups    = greatest(public.pbs.pullups,    excluded.pullups),
        updated_at = now()
  returning * into v_pb;

  -- advance streak if it's a new day
  insert into public.streaks (user_id, current_len, longest_len, last_day, updated_at)
  values (v_user, 1, 1, v_day, now())
  on conflict (user_id) do update
    set current_len = case
          when public.streaks.last_day = v_day then public.streaks.current_len
          when public.streaks.last_day = v_day - 1 then public.streaks.current_len + 1
          else 1
        end,
        longest_len = greatest(
          public.streaks.longest_len,
          case
            when public.streaks.last_day = v_day then public.streaks.current_len
            when public.streaks.last_day = v_day - 1 then public.streaks.current_len + 1
            else 1
          end),
        last_day = v_day,
        updated_at = now();

  -- remove from rally board (comeback)
  delete from public.rally_board where user_id = v_user;

  -- contribute to any live battle the user's crew is in
  v_eff := public.effort_score(v_row, v_pb);

  for v_battle_id in
    select cb.id
      from public.clan_battles cb
      join public.clan_members cm on cm.clan_id in (cb.a_clan_id, cb.b_clan_id)
     where cm.user_id = v_user
       and now() between cb.starts_at and cb.ends_at
  loop
    insert into public.battle_contributions (battle_id, user_id, day, effort)
    values (v_battle_id, v_user, v_day, v_eff)
    on conflict (battle_id, user_id, day) do update
      set effort = greatest(public.battle_contributions.effort, excluded.effort);
  end loop;

  return v_row;
end;
$$;

grant execute on function public.log_workout(int, int, int, int, text) to authenticated;

-- send_rally: record a rally, enforce push-cap (first N get pushed)
create or replace function public.send_rally(
  p_to   uuid,
  p_msg  text,
  p_cap  int default 7
) returns public.rallies language plpgsql security definer set search_path = public as $$
declare
  v_from  uuid := auth.uid();
  v_row   public.rallies;
  v_count int;
begin
  if v_from is null then raise exception 'not authenticated'; end if;
  if v_from = p_to then raise exception 'cannot rally yourself'; end if;
  if length(btrim(p_msg)) = 0 then raise exception 'empty rally'; end if;

  select count(*) into v_count
    from public.rallies
   where to_user = p_to
     and sent_at > now() - interval '24 hours';

  insert into public.rallies (from_user, to_user, msg, pushed)
  values (v_from, p_to, p_msg, v_count < p_cap)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.send_rally(uuid, text, int) to authenticated;

-- clan_score: mean of capped efforts for a clan over a day
create or replace function public.clan_score(p_clan_id uuid, p_day date)
returns numeric language sql stable as $$
  with members as (
    select cm.user_id from public.clan_members cm where cm.clan_id = p_clan_id
  ),
  efforts as (
    select m.user_id,
           coalesce(
             (select public.effort_score(w, p)
                from public.workouts w, public.pbs p
               where w.user_id = m.user_id and w.day = p_day
                 and p.user_id = m.user_id),
             0) as eff
      from members m
  )
  select coalesce(avg(least(1.0, eff)), 0) from efforts;
$$;

-- settle_battle: compute a_score/b_score/winner for a finished battle (service role cron)
create or replace function public.settle_battle(p_battle_id uuid)
returns public.clan_battles language plpgsql security definer set search_path = public as $$
declare
  v_b public.clan_battles;
  v_a numeric;
  v_b_score numeric;
begin
  select * into v_b from public.clan_battles where id = p_battle_id for update;
  if v_b is null then raise exception 'battle not found'; end if;
  if now() < v_b.ends_at then raise exception 'battle not over'; end if;

  select avg(effort) into v_a from public.battle_contributions
    where battle_id = p_battle_id and user_id in (
      select user_id from public.clan_members where clan_id = v_b.a_clan_id
    );
  select avg(effort) into v_b_score from public.battle_contributions
    where battle_id = p_battle_id and user_id in (
      select user_id from public.clan_members where clan_id = v_b.b_clan_id
    );

  v_a := coalesce(v_a, 0);
  v_b_score := coalesce(v_b_score, 0);

  update public.clan_battles
     set a_score = v_a,
         b_score = v_b_score,
         winner_id = case when v_a > v_b_score then a_clan_id
                          when v_b_score > v_a then b_clan_id
                          else null end
   where id = p_battle_id
   returning * into v_b;

  return v_b;
end;
$$;

-- list_rally_board: public read with days-off + push count
create or replace function public.list_rally_board()
returns table (
  user_id   uuid,
  handle    text,
  city      text,
  listed_at timestamptz,
  days_off  int,
  streak_lost int,
  note      text,
  rallies   bigint
) language sql stable as $$
  select rb.user_id, p.handle, p.city, rb.listed_at, rb.days_off, rb.streak_lost, rb.note,
         (select count(*) from public.rallies r where r.to_user = rb.user_id)
    from public.rally_board rb
    join public.profiles p on p.id = rb.user_id;
$$;

grant execute on function public.clan_score(uuid, date)     to authenticated;
grant execute on function public.list_rally_board()         to anon, authenticated;
