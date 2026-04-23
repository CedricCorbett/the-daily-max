-- PUSH subscriptions · web-push endpoints keyed (user, endpoint).
-- A single user can subscribe from multiple devices.

create table if not exists public.push_subscriptions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  primary key (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Self can read/insert/delete own subscriptions.
drop policy if exists push_self_read   on public.push_subscriptions;
drop policy if exists push_self_write  on public.push_subscriptions;
drop policy if exists push_self_delete on public.push_subscriptions;

create policy push_self_read   on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_self_write  on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy push_self_delete on public.push_subscriptions for delete using (user_id = auth.uid());

-- Upsert RPC — re-subscribing (same endpoint) overwrites keys/ua without duplicating.
create or replace function public.subscribe_push(
  p_endpoint text, p_p256dh text, p_auth text, p_ua text default null
) returns public.push_subscriptions
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row  public.push_subscriptions;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, ua)
  values (v_user, p_endpoint, p_p256dh, p_auth, p_ua)
  on conflict (user_id, endpoint) do update
    set p256dh     = excluded.p256dh,
        auth       = excluded.auth,
        ua         = excluded.ua,
        created_at = public.push_subscriptions.created_at
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.subscribe_push(text, text, text, text) to authenticated;

-- Unsubscribe RPC — called on logout or permission revoke.
create or replace function public.unsubscribe_push(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.push_subscriptions where user_id = auth.uid() and endpoint = p_endpoint;
end;
$$;

grant execute on function public.unsubscribe_push(text) to authenticated;
