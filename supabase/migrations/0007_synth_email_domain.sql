-- Fix synth-email domain to pass Supabase Auth's test-domain filter.
-- 'u.dailymax.app' looked like a disposable/test alias; 'dailymax.app' passes.
-- Safe because enable_confirmations is off — no mail is ever sent to this address.

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
  select concat(lower(username), '@dailymax.app')
    into v_email
    from public.profiles
    where lower(username) = lower(trim(p_handle))
    limit 1;
  return v_email;
end;
$$;

grant execute on function public.resolve_login(text) to anon, authenticated;
