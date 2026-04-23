# THE DAILY MAX

Crew-based movement habit app. Four stations (push-ups, squats, hollow hold, pull-ups).
Your score caps at 100% of your own PR — titans can't carry.

## Stack

- **Front-end:** React 18 via CDN + Babel-in-browser. Pure static HTML, no build step.
- **Back-end:** Supabase (Postgres + RLS + Edge Functions).
- **Cron:** Cloudflare Worker (triggers edge functions on schedule).
- **CI:** GitHub Actions (on push to `main`: run migrations → deploy edge functions → deploy Worker).

## Local dev

Just open `THE DAILY MAX.html` in a browser. The app is fully usable offline via `localStorage`
(`dailymax:v2`). Supabase is only wired in when `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY`
are set before `src/api.jsx` loads.

## Back-end layout

```
supabase/
  config.toml
  migrations/
    0001_init.sql          -- tables
    0002_rls.sql           -- row-level security
    0003_functions.sql     -- RPCs: log_workout, send_rally, clan_score, settle_battle
  functions/
    rally-fanout/          -- aggregate un-pushed rallies, fire one combined nudge
    settle-battles/        -- close finished clan battles
    streak-sweep/          -- consume insurance or list user on rally board
cloudflare/
  worker.js                -- cron → invokes edge functions
  wrangler.toml
.github/workflows/
  deploy.yml
```

## First-time deploy

### 1. Supabase project

```bash
# Install CLI
npm i -g supabase

# Create a project on supabase.com, grab the project ref.
supabase login
supabase link --project-ref <ref>
supabase db push
supabase functions deploy rally-fanout  --no-verify-jwt
supabase functions deploy settle-battles --no-verify-jwt
supabase functions deploy streak-sweep   --no-verify-jwt
```

Capture from the Supabase dashboard:
- `SUPABASE_URL` (Project Settings → API)
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never ship to client)
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN` (Account → Access Tokens)

### 2. Cloudflare Worker

```bash
cd cloudflare
npm i -g wrangler
wrangler login
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler deploy
```

### 3. GitHub Actions secrets

Set these under **Repo → Settings → Secrets and variables → Actions**:

| Secret                        | Where it comes from                 |
| ----------------------------- | ----------------------------------- |
| `SUPABASE_ACCESS_TOKEN`       | supabase.com → Account → Tokens     |
| `SUPABASE_PROJECT_REF`        | Supabase project URL                |
| `SUPABASE_DB_PASSWORD`        | Set on project creation             |
| `SUPABASE_URL`                | Project Settings → API              |
| `SUPABASE_SERVICE_ROLE_KEY`   | Project Settings → API (service)    |
| `CLOUDFLARE_API_TOKEN`        | dash.cloudflare.com → My Profile    |
| `CLOUDFLARE_ACCOUNT_ID`       | dash.cloudflare.com sidebar         |

Push to `main` and Actions handles the rest.

## Wiring the client

Add before `src/api.jsx` in `THE DAILY MAX.html`:

```html
<script>
  window.SUPABASE_URL = 'https://xxx.supabase.co';
  window.SUPABASE_ANON_KEY = 'eyJ...';
</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="text/babel" src="./src/api.jsx"></script>
```

Until those are set, the app runs entirely on `localStorage` and every `api.*` call no-ops.

## Scoring math (authoritative)

Lives in the client (`src/data.jsx`) and mirrored server-side (`0003_functions.sql`).

```
effort_score(day, pbs) = min( day_total / pr_total, 1.0 )
clan_score(clan, day)  = mean( effort_score for each member of clan on day )
```

Three things to remember:

1. **Scores cap at 1.0.** A titan can't pull a sleeping crew over the line.
2. **Cross-class matches auto-switch to % scoring.** Class buckets by mean PR total (S≥300 / A≥200 / B≥100 / C<100). If the two crews land in different classes, the battle is labeled cross-class and everyone's numbers are already normalized.
3. **Missing a day doesn't auto-lose.** It just drags the mean. One 0% entry in a 6-person crew costs 16.6 points.

## Cron schedule

Set in `cloudflare/wrangler.toml`:

| Cron (UTC)       | Fires              | What it does                                    |
| ---------------- | ------------------ | ----------------------------------------------- |
| `0 10 * * *`     | rally-fanout       | 06:00 ET combined push for missed-day crew      |
| `5 4 * * *`      | streak-sweep       | consume insurance or list user on rally board   |
| `*/15 * * * *`   | settle-battles     | close any battle past its `ends_at`             |

## Data migration

`dailymax:v1` → `dailymax:v2` runs on load (see `migrateV1()` in `src/data.jsx`). Sit-up reps
are reset to 0 because the unit changed (reps → seconds of hollow hold). Everything else carries.

## File map (client)

```
src/
  data.jsx              -- state, bests, scoring, constants, CLAN_SEED
  voice.jsx             -- voice lines (dry / hype / drill / zen / auto)
  ui.jsx                -- primitives (Shell, TopBar, HazardBar, buttons)
  screens-entrance.jsx  -- daily intro
  screens-home.jsx      -- hub + SHOWED UP score
  screens-timer.jsx     -- 4 stations, hollow is time-based
  screens-log.jsx       -- manual log (no yesterday comparison)
  screens-done.jsx      -- post-workout
  screens-extras.jsx    -- MaxCard, Leaderboard, Draft, Night, Kickoff
  screens-rally.jsx     -- board + inbox
  screens-clan.jsx      -- crew-vs-crew battle, 1.0 cap visible
  tweaks.jsx            -- settings panel
  api.jsx               -- Supabase client wrapper (no-ops without env)
  app.jsx               -- router
```
