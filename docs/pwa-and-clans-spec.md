# PWA + Clan Assignment · Phase 1.5 Spec

The gap between "static demo" and "real app people install and use." Four tracks,
one push. Ships before any public invite goes out — without auth, RLS can't tell
anyone apart; without notifications, rally is dead; without clan join flow, every
user sees the same fake crew.

---

## 1. Scope

Four tracks, shipped as one unit.

| Track            | What                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **A — PWA shell**    | `manifest.json`, service worker, icons, iOS meta tags, install prompt, offline fallback.         |
| **B — Push stack**   | VAPID keys, `push_subscriptions` table, client subscription flow, delivery via `rally-fanout`.   |
| **C — Clan flows**   | Create / Join-by-code / Browse-regional. Clan settings panel. Leader role. `0004_clans.sql`.    |
| **D — Auth (PIN)**   | Sign-up / sign-in screen. Username or email + 6-digit PIN. No magic links, no passwords.        |

Out of scope for this pass: push delivery for Crucible-specific events (that's phase 2),
clan chat, clan battle matchmaking (current mock is fine until there are real clans),
password reset flow (handled via email OTP only if the user forgets their PIN — deferred).

---

## 2. Track A · PWA Shell

### 2.1 Manifest

`public/manifest.json` — brand colors already chosen (oxblood `#8B1A1A`, bg `#0A0707`).

```json
{
  "name": "The Daily Max",
  "short_name": "Daily Max",
  "description": "Crew-based daily movement. Effort capped at 100% of your own PR.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0A0707",
  "theme_color": "#8B1A1A",
  "icons": [
    { "src": "/icons/icon-192.png",  "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png",  "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 2.2 Service worker

`public/sw.js` — minimal shell cache + push event handler.

- Cache `/`, `/index.html`, `/src/*.jsx`, icon set on install.
- Serve from cache on fetch, fall back to network.
- `push` event → `self.registration.showNotification(...)` with aggregated rally count.
- `notificationclick` → focus existing window or open `/rally` tab.

### 2.3 iOS quirks

- Meta tags required for iOS 16.4+ web push: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.
- iOS only prompts for notification permission **after** the user adds to Home Screen. Build the in-app install hint ("Tap share → Add to Home Screen") so the permission ask isn't dead on arrival.

### 2.4 Icons

Need three PNGs: `192`, `512`, `512 maskable`. Brand-consistent:
- Oxblood background `#8B1A1A`
- White `X` or hazard-stripe glyph, centered
- Generate with one source SVG → export at all sizes + maskable safe-area padding

---

## 3. Track B · Push Notifications

### 3.1 VAPID keys

Generated once per deploy, stored in Supabase as edge-function secrets:

```
VAPID_PUBLIC_KEY   — exposed to browser, used by PushManager.subscribe({ applicationServerKey })
VAPID_PRIVATE_KEY  — edge-function only, used to sign web-push payloads
VAPID_SUBJECT      — mailto:ops@dailymax.app
```

### 3.2 New table

`0004_push.sql`:

```sql
create table public.push_subscriptions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);
create index on public.push_subscriptions (user_id);
```

RLS: self-only insert/delete/read. A user can have multiple subscriptions (phone + laptop + iPad).

### 3.3 Subscribe RPC

```sql
create function public.subscribe_push(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns push_subscriptions ...
```

Upsert on `(user_id, endpoint)` so re-subscribing doesn't duplicate.

### 3.4 Client flow

In `src/api.jsx`:

1. Register SW: `await navigator.serviceWorker.register('/sw.js')`.
2. Check `Notification.permission`. If `default`, show in-app soft prompt first ("Want a nudge when your crew needs you?") to protect the browser's one-time ask.
3. On confirm, `Notification.requestPermission()`.
4. On granted, `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`.
5. POST subscription to `subscribe_push` RPC.
6. Store local flag so we don't re-prompt.

### 3.5 Delivery

Replace the `// TODO: send push` in `supabase/functions/rally-fanout/index.ts` with real `web-push` using the Deno port:

```ts
import webpush from 'https://esm.sh/web-push@3';
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
await webpush.sendNotification(sub, JSON.stringify({
  title: '✊ The crew pulled up',
  body: `${count} rallies waiting. Tap to read.`,
  url: '/',
  tag: 'rally-digest',  // collapse into single nudge
}));
```

Errors → delete dead subscriptions (410 Gone, 404 Not Found).

---

## 4. Track C · Clan Flows

### 4.1 New screen: `screens-clan-entry.jsx`

Routed when `state.clanId` is null. Three paths, one screen.

**Layout** — brutalist, three large cards:

```
┌───────────────────────────────┐
│  FIND YOUR CREW               │
│  A crew of 2–10. Your commit- │
│  ment is yours. Your absence  │
│  is everyone's.               │
├───────────────────────────────┤
│  ◆ CREATE A CREW              │
│    Name it. Lead it.          │
├───────────────────────────────┤
│  ✊ JOIN BY CODE               │
│    Got an invite? Paste here. │
│    [________]  ENTER          │
├───────────────────────────────┤
│  ⌕ BROWSE REGIONAL            │
│    {city} · {ageBracket}      │
│    8 crews within 50 miles    │
└───────────────────────────────┘
```

### 4.2 Create modal

- Name (required, 3–24 chars, unique)
- Tag (optional, 2–4 chars, uppercase)
- Description (optional, 140 chars)
- Aesthetic picker (optional — clan color tint, defaults to leader's)

On submit: `create_clan` RPC → auto-adds self as `role='leader'`, returns clan row, sets `state.clanId`.

### 4.3 Join by code

- 6-char invite code, all caps, no ambiguous chars (no O/0/I/1). Example: `K4R7VM`.
- Generated via trigger on clan insert. Stored on `clans.invite_code` (unique).
- Clan leader can see/copy the code from clan settings.

### 4.4 Browse regional

- List of clans in same `city` OR same `ageBracket` (loose match).
- Shows: name, tag, member count, current streak mean.
- Join button → calls `join_clan(clan_id)` (no code needed for public clans).
- **Public flag** on clan — default true; leader can make private (code-only).

### 4.5 Clan settings panel

Accessed from Clan screen top-right (gear icon). Shows:

- Member list with roles + streaks
- Invite code + copy-link button (leader only)
- Edit name / description / public flag (leader only)
- Transfer leadership (leader only)
- **Leave crew** (self) — confirm modal
- **Kick member** (leader only) — for inactive / problem crew

### 4.6 Backend

New migration `0004_clans.sql`:

```sql
alter table public.clans add column if not exists description text;
alter table public.clans add column if not exists is_public boolean not null default true;
alter table public.clans add column if not exists invite_code text unique;
alter table public.clans add column if not exists city text;
alter table public.clans add column if not exists age_bracket text;
create index on public.clans (city);
create index on public.clans (age_bracket);

-- invite code generator (6-char, no ambiguous chars)
create function gen_invite_code() returns text as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '')
  from generate_series(1,6);
$$ language sql volatile;

-- trigger to auto-generate on insert
create trigger clans_invite_code
  before insert on public.clans
  for each row
  when (new.invite_code is null)
  execute function ... ;

-- RPCs
create function public.create_clan(p_name text, p_tag text, p_description text default null, p_is_public boolean default true)
returns clans ...

create function public.join_clan(p_clan_id uuid) returns clan_members ...
create function public.join_clan_by_code(p_code text) returns clan_members ...
create function public.leave_clan() returns void ...
create function public.list_regional_clans(p_city text, p_bracket text, p_limit int default 20) returns table (...) ...
create function public.transfer_leadership(p_to_user uuid) returns void ...
create function public.kick_member(p_user_id uuid) returns void ...
```

All `security definer`, check `auth.uid()`, validate leader role where needed.

### 4.7 State changes

Add to `defaultState` in `src/data.jsx`:
- `clanId: null` (replaces mock CLAN_SEED once joined)
- `clanRole: null` ('leader' | 'member')

Home screen: if `clanId === null`, the "CREW BATTLE" tile → "FIND YOUR CREW" → routes to entry screen instead of clan screen.

CLAN_SEED stays as a mock for offline / not-yet-joined preview, but never renders for joined users.

---

## 5. Track D · Auth (Username/Email + 6-digit PIN)

Right now the app has no sign-in. Every request to Supabase would fail RLS the moment we
wire real data, because `auth.uid()` returns null. Fix that before clan flows ship — clan
membership is meaningless without a stable identity.

### 5.1 Sign-up / sign-in screen

Single screen, two modes (toggle at top: **SIGN IN** / **NEW HERE**). First screen users see
before anything else renders. Brutalist, dead simple.

```
┌───────────────────────────────┐
│  THE DAILY MAX                │
│  ─────────────────────────    │
│  [ SIGN IN ]   NEW HERE       │
│                               │
│  USERNAME OR EMAIL            │
│  [______________________]     │
│                               │
│  6-DIGIT PIN                  │
│  [ _ _ _ _ _ _ ]              │
│                               │
│  [       ENTER       ]        │
│                               │
│  Forgot PIN? — tap here       │
└───────────────────────────────┘
```

On **NEW HERE** mode: extra field for display name (3–20 chars, unique). PIN confirmation
field. Optional email (required only if they want PIN recovery later).

### 5.2 How PIN maps to Supabase Auth

Supabase Auth doesn't have a native PIN concept. Two workable options — recommending (a):

**(a) Email + password, password = 6-digit PIN.**
- User picks a username on signup. We synthesize an email: `<username>@u.dailymax.app`
  (reserved subdomain, never accepts real mail) — stored as the auth email.
- If they also provide a real email, store it on `profiles.recovery_email` for PIN reset.
- Sign in by username: lookup username → synth email → call `signInWithPassword({ email, password: pin })`.
- Sign in by email: if input contains `@`, use it directly as the auth email.
- Supabase Auth enforces rate limiting (5/min/IP default). We layer our own: lock username
  after **5 consecutive failed PIN attempts** for 15 min (tracked in `auth_throttle` table).

**(b) Custom RPC + server-side session token.** Rolling our own auth is a security footgun.
Skip unless (a) turns out to be blocked by Supabase.

### 5.3 Security — PINs are weak, acknowledge it

6-digit PIN = **1,000,000** combinations. Without throttling, a brute-force attacker gets
through in minutes. Layered defense:

- **Per-username lockout**: 5 bad tries → 15 min lock (table-backed, survives IP rotation).
- **Banned PIN list**: reject `123456`, `000000`, `111111`, year patterns `19XX`/`20XX`,
  repeated digits `XXXXXX`, sequential `234567`, keypad patterns. ~200 banned values.
- **No PIN reuse on change**: track last 3 PIN hashes.
- **No PIN in URL / logs**: only POSTed; Supabase Auth handles hashing (bcrypt).
- **Optional stronger mode**: leader of a Crucible-bound clan must upgrade to 8-digit PIN
  (enforced at Crucible signup, not general sign-in).

This is explicitly **"good enough for a habit-tracking app, not good enough for banking."**
Call that out in the onboarding copy so users don't reuse a banking PIN here.

### 5.4 Forgot PIN flow

Only available if user provided a recovery email on signup. Otherwise: contact support.

1. User taps "Forgot PIN?" → enters username or recovery email.
2. Supabase sends a one-time 6-digit code to the recovery email (valid 10 min).
3. User enters code → prompted to set new PIN.
4. Old PIN invalidated. Active sessions revoked.

Note this is the only place email-code delivery is used. We said "no magic link" — a recovery
code on a user-initiated reset is not a magic link. If you want to ban this too, tell me and
we fall back to "forgot PIN means contact support manually."

### 5.5 Backend

New migration `0005_auth.sql` (or inlined into whatever migration ships first):

```sql
-- Profiles already exist from 0001. Add auth-facing columns:
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists recovery_email text;
alter table public.profiles add column if not exists display_name text;

create table public.auth_throttle (
  username      text primary key,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

-- RPC to resolve username → synth email (called before signInWithPassword)
create function public.resolve_login(p_handle text)
returns text language plpgsql security definer as $$
declare v_email text;
begin
  if position('@' in p_handle) > 0 then
    return p_handle;  -- already an email
  end if;
  select concat(username, '@u.dailymax.app') into v_email
    from public.profiles where lower(username) = lower(p_handle);
  return v_email;  -- nullable; client handles "no such user"
end $$;

-- RPC to register a failed attempt (called on signInWithPassword error)
create function public.register_failed_pin(p_username text) returns void ...
-- RPC to clear throttle on success
create function public.clear_throttle(p_username text) returns void ...
```

Trigger on new `auth.users` row → insert matching `public.profiles` row with username
pulled from user metadata.

### 5.6 Client flow

In `src/api.jsx`:

```js
async function signUp({ username, pin, email }) {
  const synthEmail = `${username.toLowerCase()}@u.dailymax.app`;
  const { data, error } = await sb.auth.signUp({
    email: synthEmail,
    password: pin,
    options: { data: { username, recovery_email: email || null } },
  });
  // trigger inserts profile row
  return { data, error };
}

async function signIn({ handle, pin }) {
  const { data: email } = await sb.rpc('resolve_login', { p_handle: handle });
  if (!email) return { error: 'no such user' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pin });
  if (error) await sb.rpc('register_failed_pin', { p_username: handle });
  else       await sb.rpc('clear_throttle', { p_username: handle });
  return { data, error };
}
```

On successful sign-in, session persists via Supabase's default localStorage. Route to
clan entry screen if `state.clanId` is null, else home.

### 5.7 State

- `state.userId` — from `auth.user().id`
- `state.username` — from profile
- `state.authed` — boolean gate for every screen

If `!state.authed`, render the auth screen and nothing else. No home, no stations, no nothing.

---

## 6. Build Order

Four milestones. Each shippable independently if we want to cut scope later.

**Milestone 0 — Auth screen (~2h)** *(must ship first — everything else depends on it)*
- `0005_auth.sql` migration (or roll into 0004)
- Sign-up / sign-in screen with mode toggle
- PIN-strength blocklist
- `resolve_login`, `register_failed_pin`, `clear_throttle` RPCs
- Throttle check before signInWithPassword
- Session persistence + route gate
- Ship → users can create an account, come back and sign in

**Milestone 1 — PWA shell (~2h)**
- manifest.json, icons, iOS meta tags, service worker with shell cache
- Install prompt component (in-app hint for iOS)
- Ship → installs work, no notifications yet

**Milestone 2 — Push delivery (~2h)**
- VAPID keys + secrets
- `0004_push.sql` migration
- Client subscription flow
- `rally-fanout` wired to actually send pushes
- Ship → missed days trigger real notifications

**Milestone 3 — Clan flows (~3h)**
- `0004_clans.sql` migration (or bump number if auth/push land first)
- Clan entry screen (create/join/browse)
- Clan settings panel
- Router wiring + home screen conditional
- Ship → real clan membership, kills the mock

Recommended order: **auth → PWA shell → push → clans.** Auth first because RLS is
meaningless without it and every subsequent migration assumes `auth.uid()` returns a
real user. PWA shell next so the icons/manifest get seeded before anyone installs.
Push third so no silent rallies land on real users. Clans last since it's the most
isolated change.

---

## 7. Open Questions

- **Region definition for browse** — ZIP radius (requires geocoding), metro, state, or just city-name exact match for v1? Exact match is the cheapest and probably fine if people onboard with consistent city strings.
- **Clan size cap** — you mentioned 2–10 in copy above. Lock that, or soft limit (warn past 10, hard block past 25)?
- **Invite code rotation** — static forever, or rotates every N days / on leader action? Static is simpler; rotating is safer if codes leak.
- **Private clans and Crucible** — private crew that only invite-by-code. Does a private clan still show up on regional leaderboards? Default: no, private = invisible.
- **What happens to CLAN_SEED** — delete it once all users have real clans, or keep as the fallback for signed-out / pre-join state forever?
- **Forgot-PIN recovery** — allow email one-time code (my recommendation), or hard "contact support" fallback so zero email flow exists?
- **Recovery email required or optional on signup?** — Optional means users who skip it and forget their PIN are stuck. Required adds friction.
- **Username case sensitivity** — `Cedric` and `cedric` both allowed, or collapsed to lowercase at creation?

---

## 8. Pressure Points (what I'd push back on)

- **Three clan entry paths may be too many for v1.** Could cut browse-regional and ship only create + join-by-code. Regional browse is a leaderboard-adjacent feature; it might survive better in a later polish pass. Saves ~1h and simplifies the entry screen.
- **Maskable icon is non-negotiable on Android** but easy to skip. Don't skip it — it's the difference between "looks professional" and "looks like a 2018 hack."
- **iOS push permission is a bloodbath** — 2026 data suggests ~40% of iOS users still deny on first ask. The soft prompt before the real prompt is critical. Don't merge push without it.
- **Clan size cap interacts with scoring.** Mean of 10 can be dragged to ~90% by one 0% member; mean of 3 drops to 66% from the same thing. Bigger clans = more forgiving math. If you keep the "no-carry" philosophy, smaller caps (2–6) are more honest.

---

## 9. Ship Criteria

This unit is done when:

- [ ] A new user can sign up with username + PIN, sign out, sign back in, and land on the right screen based on clan state
- [ ] PIN brute-force is throttled (5 bad tries → 15 min lock) and banned-PIN list rejects trivial codes
- [ ] Forgot-PIN via recovery email works end-to-end (or is explicitly deferred with support-contact fallback)
- [ ] App installable on iOS + Android home screen with the proper icon
- [ ] Push permission flow works end-to-end (soft → real → subscribe → appears in `push_subscriptions`)
- [ ] Missed-day-in-crew triggers a real notification via `rally-fanout` cron
- [ ] A new user can create a crew, get an invite code, share it, have someone else join via code
- [ ] Browse regional returns non-empty for any city with ≥1 public clan
- [ ] Clan settings supports leave + transfer + (if leader) kick + rename
- [ ] CLAN_SEED no longer renders for users with real clanId
- [ ] Home screen CTA tile routes correctly based on clan state

---

## 10. Locked Decisions (2026-04-22)

All pressure points resolved. Build from this.

**Auth (Track D)**
- Email + password backing, password = 6-digit PIN
- Username synthesizes `user@u.dailymax.app`; real email optional for recovery
- 5 bad tries → 15 min lock per username
- Banned-PIN blocklist (trivial patterns rejected)
- Forgot-PIN via email OTP (deferred Phase 2 if no recovery email on file → "contact support")
- Recovery email **optional** on signup; warning shown if skipped
- Usernames collapsed to lowercase at creation (case-insensitive uniqueness)

**Auth screen flair**
- Rotating phrases, 4–5 sec fade, round-robin through:
  - "Form over ego."
  - "Show up for yourself."
  - "Commit to all you can today."
  - "Come back tomorrow."
  - "Your PR is the only bar."
  - "Cap yourself at you."
  - "Tired counts. Zero doesn't."
  - "Yesterday is paid."
  - "One set is still a day."
  - "The only person you outwork is yesterday-you."
  - "Quiet reps, loud life."
  - "Partial reps are reps."
  - "Don't stack tomorrow."
  - "Small today is still today."

**Clans (Track C)**
- Browse-regional **kept** in v1
- Region = **US state** (dropdown on signup, stored `profiles.region_state`, international users → `OTHER`)
- Clan size **hard cap 25**
- Invite code **static + leader-triggered regeneration button** in settings
- Private clans invisible on leaderboards
- **"The DM Clan"** — system-owned clan (`is_system=true`), auto-join on signup if user skips create/join. Users can leave anytime to join a real crew. Nobody is ever crew-less.

**Age brackets**
- `20s`, `30s`, `40s`, `50s`, `60+` (five buckets, capped at 60+)

**Timer / caps**
- Remove all 75-second hollow-hold caps from code + copy
- 6-minute workout timer = **informational guide only**, not a hard stop

**Battle participation lock** *(Phase 2 — battles; noted here so clan schema anticipates it)*
- Participation floor: battle only counts if ≥60% of clan's 7-day-active members opt in
- Roster cooldown: battled in last 2 consecutive → auto-benched from next (waived if clan has <10 actives)
- Flagship/quarterly battles: mandatory full-roster, ghosts = 0.0 and drag the mean

**Elite clubs** *(Phase 2 — leaderboard feature)*
- Separate leaderboard page, achievement tiers, visible badges
- Tier 1 achievable in ~1 year of unbroken daily work at modest rates:
  - 10,000 Pushup Club
  - 2,000 Pullup Club
  - 10,000 Squat Club
  - 500-Minute Hollow Club
- Higher tiers (25k, 100k, etc.) designed in Phase 2
- Special feature/badge treatment for club members TBD in Phase 2
