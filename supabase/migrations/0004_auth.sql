-- AUTH · username + 6-digit PIN
-- PIN is stored by Supabase Auth as the password (bcrypt hashed). We layer:
--   - username → synthetic email lookup via resolve_login()
--   - per-username throttle (5 bad tries → 15 min lock) via auth_throttle
--   - profile auto-creation trigger on auth.users insert
--
-- PINs are weak (1M combos). This migration is the floor; client-side PIN blocklist
-- and Supabase Auth's own rate limits complete the defense-in-depth.

-- ───────────────────── Schema extensions ─────────────────────

alter table public.profiles add column if not exists username       text;
alter table public.profiles add column if not exists display_name   text;
alter table public.profiles add column if not exists recovery_email text;
alter table public.profiles add column if not exists region_state   text;
alter table public.profiles add column if not exists age_bracket    text
  check (age_bracket in ('20s','30s','40s','50s','60+'));

-- Username is case-insensitive unique. Collapse to lowercase at write time.
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

create table if not exists public.auth_throttle (
  username      text primary key,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

-- ───────────────────── Profile auto-provision ─────────────────────

-- When a new auth.users row is inserted (via signUp), mirror into profiles
-- using metadata passed through signUp options.data.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username       text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  v_display        text := coalesce(new.raw_user_meta_data->>'display_name', v_username);
  v_recovery       text := nullif(new.raw_user_meta_data->>'recovery_email', '');
  v_region         text := nullif(new.raw_user_meta_data->>'region_state', '');
  v_bracket        text := nullif(new.raw_user_meta_data->>'age_bracket', '');
  v_handle_default text := coalesce(nullif(v_username, ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (
    id, handle, username, display_name, recovery_email, region_state, age_bracket
  ) values (
    new.id,
    v_handle_default,
    nullif(v_username, ''),
    v_display,
    v_recovery,
    v_region,
    v_bracket
  )
  on conflict (id) do nothing;

  insert into public.pbs (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────── RPCs ─────────────────────

-- Lookup: username OR email → synthetic email to feed signInWithPassword.
-- Returns null when no such user exists (client treats as "bad credentials"
-- and still calls register_failed_pin to avoid a username-enumeration oracle).
create or replace function public.resolve_login(p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if p_handle is null or length(trim(p_handle)) = 0 then
    return null;
  end if;
  if position('@' in p_handle) > 0 then
    return lower(trim(p_handle));
  end if;
  select concat(lower(username), '@u.dailymax.app')
    into v_email
    from public.profiles
    where lower(username) = lower(trim(p_handle))
    limit 1;
  return v_email;
end;
$$;

-- Check lockout state. Returns seconds remaining if locked, else 0.
create or replace function public.throttle_status(p_username text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_until timestamptz;
begin
  select locked_until into v_until
    from public.auth_throttle
    where username = lower(trim(p_username));
  if v_until is null or v_until <= now() then
    return 0;
  end if;
  return greatest(0, extract(epoch from (v_until - now()))::int);
end;
$$;

-- Record a failed PIN attempt. After 5 in a row, lock for 15 minutes.
create or replace function public.register_failed_pin(p_username text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_name  text := lower(trim(p_username));
  v_count int;
begin
  if v_name is null or length(v_name) = 0 then return 0; end if;

  insert into public.auth_throttle (username, failed_count, updated_at)
    values (v_name, 1, now())
  on conflict (username) do update set
    failed_count = public.auth_throttle.failed_count + 1,
    updated_at = now();

  select failed_count into v_count from public.auth_throttle where username = v_name;

  if v_count >= 5 then
    update public.auth_throttle
      set locked_until = now() + interval '15 minutes',
          failed_count = 0,
          updated_at   = now()
      where username = v_name;
    return -1;  -- locked
  end if;

  return v_count;
end;
$$;

-- Clear throttle on successful sign-in.
create or replace function public.clear_throttle(p_username text)
returns void language sql security definer set search_path = public as $$
  delete from public.auth_throttle where username = lower(trim(coalesce(p_username, '')));
$$;

-- Check username availability during signup.
create or replace function public.username_available(p_username text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(trim(coalesce(p_username, '')))
  );
$$;

-- ───────────────────── Grants + RLS ─────────────────────

-- All RPCs callable by anon (pre-auth needs) and authenticated.
grant execute on function public.resolve_login(text)         to anon, authenticated;
grant execute on function public.throttle_status(text)       to anon, authenticated;
grant execute on function public.register_failed_pin(text)   to anon, authenticated;
grant execute on function public.clear_throttle(text)        to anon, authenticated;
grant execute on function public.username_available(text)    to anon, authenticated;

-- Throttle table — no direct access from clients. Only the security-definer RPCs touch it.
alter table public.auth_throttle enable row level security;
-- No policies = no access for anon/authenticated roles. Definer RPCs bypass RLS.
