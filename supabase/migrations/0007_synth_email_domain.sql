-- Resolve a handle (username OR email) to the auth.users email used for sign-in.
-- We no longer synthesize emails — the user's real email is stored in auth.users.email,
-- and username is stored in public.profiles.username. This function joins the two so
-- users can sign in with either their username or their email.

create or replace function public.resolve_login(p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if p_handle is null or length(trim(p_handle)) = 0 then
    return null;
  end if;
  -- Email path: pass through (lowercased/trimmed).
  if position('@' in p_handle) > 0 then
    return lower(trim(p_handle));
  end if;
  -- Username path: join profiles → auth.users to get the real email.
  select au.email
    into v_email
    from public.profiles p
    join auth.users au on au.id = p.id
    where lower(p.username) = lower(trim(p_handle))
    limit 1;
  return v_email;
end;
$$;

grant execute on function public.resolve_login(text) to anon, authenticated;
