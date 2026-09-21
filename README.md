# KillSQL

A free, open-source, LeetCode-style SQL practice platform. Every query runs **in the browser** via DuckDB-WASM. The backend only stores auth and progress.

## Features

- Monaco SQL editor (the VS Code engine)
- DuckDB-WASM in a Web Worker — CTEs, window functions, UNNEST
- Static JSON questions anyone can add via pull request
- Google (primary) / GitHub / email auth, submissions, profiles, goal streaks, and a leaderboard (Supabase)
- Optional donations via Dodo Payments (prompt after a successful solve)
- Designed to stay on free tiers until tens of thousands of monthly users

## Quick start

```bash
git clone https://github.com/imkumaraju/killsql.git
cd killsql
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can solve problems with no account.

### Optional: auth and progress

Schema lives in `supabase/migrations/` and is applied by GitHub Actions (`supabase db push`). Do not paste migrations into the dashboard SQL editor.

1. Create a [Supabase](https://supabase.com) project (KillSQL uses `pbsrivwuhq2thtgut`).
2. Put real keys in **GitHub Actions secrets** (see below). Then run **Deploy Supabase migrations**.
3. Enable **Google** under Authentication → Providers (paste a Google Cloud OAuth Web client ID and secret). The redirect URI is `https://pbsrivwuhq2thtgut.supabase.co/auth/v1/callback`. GitHub and email are optional.
4. Copy `.env.example` to `apps/web/.env.local` (gitignored) and fill in the keys on your machine.
5. Add `http://localhost:3000/auth/callback` and `http://localhost:3000/welcome` to the Supabase redirect allow-list.

First sign-in opens `/welcome`: pick a username and either upload a photo or choose one of 32 avatars. Skipping assigns a unique handle and the default KillSQL avatar. Google name and email are stored on the profile (email is private).

### Secrets (public repo)

The git repo is public. **Never commit** `.env.local`, service-role keys, database passwords, or personal access tokens. `npm run check:secrets` / CI will reject them.

| Where | What |
|---|---|
| **GitHub → Settings → Secrets and variables → Actions** | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` — used by migrate + keep-alive workflows. Encrypted; not shown in the repo; masked in logs. |
| **Vercel project env** (server) | Same public URL/anon key, plus `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`. Mark the service-role key as sensitive. |
| **`apps/web/.env.local`** | Laptop only. Already gitignored. |

The **anon** key is meant to ship to the browser (`NEXT_PUBLIC_…`). Row Level Security is what protects user data, not hiding that key. The **service_role** key bypasses RLS — GitHub Secrets + Vercel only, never `NEXT_PUBLIC_`.

### Optional: donations

The donate prompt appears after a first successful run of a problem (and from the header **Donate** button) whether or not Dodo is configured. Checkout needs a [Dodo Payments](https://app.dodopayments.com) test API key and a Pay What You Want product:

```
DODO_PAYMENTS_API_KEY=your_test_api_key
DODO_PAYMENTS_PRODUCT_ID=pdt_your_donation_product
DODO_PAYMENTS_ENVIRONMENT=test_mode
```

Amounts are $3 / $5 / $10 or a custom USD value. Users can skip, or check **Don't show this again today** (stored in the browser for that local calendar day). After payment they return to `/donate/success`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js app on port 3000 |
| `npm run build` | Production build |
| `npm run validate:questions` | Lint every question JSON file and run official solutions in DuckDB |
| `npm run check:secrets` | Fail if `.env` files or live-looking keys are tracked in git |
| `npm run build:index` | Generate `questions/index.json` |

## Repository layout

```
apps/web          Next.js UI + API routes
packages/question-types   Shared TypeScript types
questions/        Static problem bank
scripts/          Index builder, DuckDB solution runner, JSON linter
supabase/         Postgres migrations
```

## Goal streaks

Signed-in users can start a challenge (for example 40 days, 2 problems per day) at `/streak`. Each local day is confirmed from passing submissions. Every 3 confirmed days awards a streak freeze (max 2). Missing a day consumes a freeze if you have one; otherwise the streak breaks.

Goal streaks ship in `002_streaks.sql` (applied by the migration workflow). Optional: set `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` so Vercel can run the daily freeze/break job. The app also ticks your own streak whenever you load `/streak` or save a submission. A twice-weekly GitHub Action pings `profiles` so the Free-plan project is not paused for inactivity.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design (including donations) and [CONTRIBUTING.md](./CONTRIBUTING.md) to add questions.

## License

MIT
