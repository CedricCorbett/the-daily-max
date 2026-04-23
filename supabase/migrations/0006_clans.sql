-- CLANS · create / join-by-code / browse-regional + leader tools.
-- Hard cap 25 members, system "DM Clan" as universal fallback.

-- ───────────────────── Schema extensions ─────────────────────

alter table public.clans add column if not exists description   text;
alter table public.clans add column if not exists is_public     boolean not null default true;
alter table public.clans add column if not exists is_system     boolean not null default false;
alter table public.clans add column if not exists invite_code   text unique;
alter table public.clans add column if not exists region_state  text;
alter table public.clans add column if not exists age_bracket   text
  check (age_bracket is null or age_bracket in ('20s','30s','40s','50s','60+'));

create index if not exists clans_region_idx on public.clans (region_state);
create index if not exists clans_bracket_idx on public.clans (age_bracket);
create index if not exists clans_public_idx  on public.clans (is_public) where is_public;

-- ───────────────────── Invite-code generator ─────────────────────
-- 6 chars, no ambiguous (no O/0, I/1, Z/2, S/5, B/8). Uppercase-only.

create or replace function public.gen_invite_code() returns text
language sql volatile as $$
  select string_agg(substr('ACDEFGHJKLMNPQRTUVWXY3467', 1 + floor(random() * 25)::int, 1), '')
    from generate_series(1, 6);
$$;

create or replace function public.clans_fill_invite_code() returns trigger
language plpgsql as $$
declare
  v_code text;
  v_tries int := 0;
begin
  if new.invite_code is not null then return new; end if;
  loop
    v_code := public.gen_invite_code();
    exit when not exists (select 1 from public.clans where invite_code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 8 then
      raise exception 'could not generate unique invite code';
    end if;
  end loop;
  new.invite_code := v_code;
  return new;
end;
$$;

drop trigger if exists clans_invite_code on public.clans;
create trigger clans_invite_code
  before insert on public.clans
  for each row
  when (new.invite_code is null)
  execute function public.clans_fill_invite_code();

-- Backfill invite codes for any clan missing one
update public.clans
   set invite_code = public.gen_invite_code()
 where invite_code is null;

-- ───────────────────── Size enforcement (25 cap) ─────────────────────

create or replace function public.clan_members_enforce_cap() returns trigger
language plpgsql as $$
declare
  v_count int;
  v_system boolean;
begin
  select is_system into v_system from public.clans where id = new.clan_id;
  if v_system then
    return new;  -- DM Clan has no cap (it's the universal fallback)
  end if;
  select count(*) into v_count from public.clan_members where clan_id = new.clan_id;
  if v_count >= 25 then
    raise exception 'crew full (25 max)';
  end if;
  return new;
end;
$$;

drop trigger if exists clan_members_cap on public.clan_members;
create trigger clan_members_cap
  before insert on public.clan_members
  for each row execute function public.clan_members_enforce_cap();

-- ───────────────────── DM Clan seed ─────────────────────
-- Universal fallback. Every user auto-joins on signup if they don't create/join another.

insert into public.clans (name, tag, description, is_public, is_system, region_state, age_bracket)
select 'THE DM CLAN', 'DM', 'The default crew. You''re never alone on this.', true, true, null, null
where not exists (select 1 from public.clans where is_system = true);

-- ───────────────────── RPCs ─────────────────────

-- Create a clan. Caller becomes leader. Enforces name format + uniqueness at DB level.
create or replace function public.create_clan(
  p_name text,
  p_tag text default null,
  p_description text default null,
  p_is_public boolean default true,
  p_region_state text default null,
  p_age_bracket text default null
) returns public.clans
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan public.clans;
  v_name text := nullif(trim(p_name), '');
  v_tag  text := upper(nullif(trim(coalesce(p_tag, '')), ''));
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_name is null or char_length(v_name) < 3 or char_length(v_name) > 24 then
    raise exception 'name must be 3–24 chars';
  end if;
  if v_tag is not null and (char_length(v_tag) < 2 or char_length(v_tag) > 4) then
    raise exception 'tag must be 2–4 chars';
  end if;

  insert into public.clans (name, tag, description, is_public, region_state, age_bracket)
    values (v_name, v_tag, p_description, coalesce(p_is_public, true), p_region_state, p_age_bracket)
    returning * into v_clan;

  -- Leave system fallback if they were in it.
  delete from public.clan_members
    where user_id = v_user
      and clan_id in (select id from public.clans where is_system = true);

  insert into public.clan_members (clan_id, user_id, role)
    values (v_clan.id, v_user, 'leader');

  return v_clan;
end;
$$;

-- Join by public clan id (only allowed when is_public).
create or replace function public.join_clan(p_clan_id uuid)
returns public.clan_members
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan public.clans;
  v_row  public.clan_members;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select * into v_clan from public.clans where id = p_clan_id;
  if v_clan.id is null then raise exception 'clan not found'; end if;
  if not v_clan.is_public and not v_clan.is_system then
    raise exception 'private clan — code required';
  end if;

  -- Leave system fallback on join of a real clan.
  if not v_clan.is_system then
    delete from public.clan_members
      where user_id = v_user
        and clan_id in (select id from public.clans where is_system = true);
  end if;

  insert into public.clan_members (clan_id, user_id, role)
    values (v_clan.id, v_user, 'member')
    on conflict do nothing
    returning * into v_row;
  if v_row.clan_id is null then
    select * into v_row from public.clan_members where clan_id = v_clan.id and user_id = v_user;
  end if;
  return v_row;
end;
$$;

create or replace function public.join_clan_by_code(p_code text)
returns public.clan_members
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan public.clans;
  v_row  public.clan_members;
  v_code text := upper(nullif(trim(coalesce(p_code, '')), ''));
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_code is null then raise exception 'code required'; end if;
  select * into v_clan from public.clans where invite_code = v_code;
  if v_clan.id is null then raise exception 'bad code'; end if;

  delete from public.clan_members
    where user_id = v_user
      and clan_id in (select id from public.clans where is_system = true);

  insert into public.clan_members (clan_id, user_id, role)
    values (v_clan.id, v_user, 'member')
    on conflict do nothing
    returning * into v_row;
  if v_row.clan_id is null then
    select * into v_row from public.clan_members where clan_id = v_clan.id and user_id = v_user;
  end if;
  return v_row;
end;
$$;

-- Leave current clan. If user has no other crew, auto-join DM Clan.
create or replace function public.leave_clan()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_dm   uuid;
  v_left_leader boolean;
  v_clan uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  -- Find their non-system clans (usually one).
  for v_clan in
    select clan_id from public.clan_members
     where user_id = v_user
       and clan_id in (select id from public.clans where is_system = false)
  loop
    -- If leader, block leave unless the clan is empty or has another member to promote.
    select role = 'leader' into v_left_leader
      from public.clan_members where clan_id = v_clan and user_id = v_user;
    if v_left_leader then
      if (select count(*) from public.clan_members where clan_id = v_clan) > 1 then
        raise exception 'transfer leadership before leaving';
      end if;
      -- Empty crew → delete the clan
      delete from public.clans where id = v_clan;
    else
      delete from public.clan_members where clan_id = v_clan and user_id = v_user;
    end if;
  end loop;

  -- Auto-join DM Clan if not already in any.
  if not exists (select 1 from public.clan_members where user_id = v_user) then
    select id into v_dm from public.clans where is_system = true limit 1;
    if v_dm is not null then
      insert into public.clan_members (clan_id, user_id, role)
        values (v_dm, v_user, 'member')
        on conflict do nothing;
    end if;
  end if;
end;
$$;

-- Browse public clans in a region (state) or age bracket.
create or replace function public.list_regional_clans(
  p_state text default null,
  p_bracket text default null,
  p_limit int default 20
) returns table (
  id uuid,
  name text,
  tag text,
  description text,
  member_count int,
  region_state text,
  age_bracket text
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.name, c.tag, c.description,
    (select count(*)::int from public.clan_members m where m.clan_id = c.id) as member_count,
    c.region_state, c.age_bracket
  from public.clans c
  where c.is_public = true
    and c.is_system = false
    and (p_state   is null or c.region_state = p_state)
    and (p_bracket is null or c.age_bracket = p_bracket)
  order by member_count desc, c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- Transfer leadership to another member.
create or replace function public.transfer_leadership(p_to_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select clan_id into v_clan
    from public.clan_members
    where user_id = v_user and role = 'leader'
    and clan_id in (select id from public.clans where is_system = false)
    limit 1;
  if v_clan is null then raise exception 'not a leader'; end if;

  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = p_to_user
  ) then
    raise exception 'target not in clan';
  end if;

  update public.clan_members set role = 'member' where clan_id = v_clan and user_id = v_user;
  update public.clan_members set role = 'leader' where clan_id = v_clan and user_id = p_to_user;
end;
$$;

-- Kick a member. Leader only.
create or replace function public.kick_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_user = p_user_id then raise exception 'cannot kick self; use leave_clan'; end if;

  select clan_id into v_clan
    from public.clan_members
    where user_id = v_user and role = 'leader'
    and clan_id in (select id from public.clans where is_system = false)
    limit 1;
  if v_clan is null then raise exception 'not a leader'; end if;

  delete from public.clan_members where clan_id = v_clan and user_id = p_user_id;
end;
$$;

-- Regenerate invite code (leader only).
create or replace function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan uuid;
  v_code text;
  v_tries int := 0;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select clan_id into v_clan
    from public.clan_members
    where user_id = v_user and role = 'leader'
    and clan_id in (select id from public.clans where is_system = false)
    limit 1;
  if v_clan is null then raise exception 'not a leader'; end if;

  loop
    v_code := public.gen_invite_code();
    exit when not exists (select 1 from public.clans where invite_code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 8 then raise exception 'could not generate unique code'; end if;
  end loop;

  update public.clans set invite_code = v_code where id = v_clan;
  return v_code;
end;
$$;

-- Update clan settings (leader only).
create or replace function public.update_clan(
  p_name text default null,
  p_description text default null,
  p_is_public boolean default null
) returns public.clans
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_clan public.clans;
  v_cid  uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select clan_id into v_cid
    from public.clan_members
    where user_id = v_user and role = 'leader'
    and clan_id in (select id from public.clans where is_system = false)
    limit 1;
  if v_cid is null then raise exception 'not a leader'; end if;

  update public.clans
     set name        = coalesce(nullif(trim(coalesce(p_name, '')), ''), name),
         description = coalesce(p_description, description),
         is_public   = coalesce(p_is_public, is_public)
   where id = v_cid
   returning * into v_clan;
  return v_clan;
end;
$$;

-- ───────────────────── Auto-join DM Clan on signup ─────────────────────
-- Extend handle_new_user() from 0004_auth to drop users into DM Clan.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username       text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  v_display        text := coalesce(new.raw_user_meta_data->>'display_name', v_username);
  v_recovery       text := nullif(new.raw_user_meta_data->>'recovery_email', '');
  v_region         text := nullif(new.raw_user_meta_data->>'region_state', '');
  v_bracket        text := nullif(new.raw_user_meta_data->>'age_bracket', '');
  v_handle_default text := coalesce(nullif(v_username, ''), split_part(new.email, '@', 1));
  v_dm             uuid;
begin
  insert into public.profiles (
    id, handle, username, display_name, recovery_email, region_state, age_bracket
  ) values (
    new.id, v_handle_default,
    nullif(v_username, ''), v_display, v_recovery, v_region, v_bracket
  ) on conflict (id) do nothing;

  insert into public.pbs (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict (user_id) do nothing;

  select id into v_dm from public.clans where is_system = true limit 1;
  if v_dm is not null then
    insert into public.clan_members (clan_id, user_id, role)
      values (v_dm, new.id, 'member')
      on conflict do nothing;
  end if;

  return new;
end;
$$;

-- ───────────────────── Grants ─────────────────────

grant execute on function public.create_clan(text, text, text, boolean, text, text) to authenticated;
grant execute on function public.join_clan(uuid)                                     to authenticated;
grant execute on function public.join_clan_by_code(text)                             to authenticated;
grant execute on function public.leave_clan()                                        to authenticated;
grant execute on function public.list_regional_clans(text, text, int)                to anon, authenticated;
grant execute on function public.transfer_leadership(uuid)                           to authenticated;
grant execute on function public.kick_member(uuid)                                   to authenticated;
grant execute on function public.regenerate_invite_code()                            to authenticated;
grant execute on function public.update_clan(text, text, boolean)                    to authenticated;
