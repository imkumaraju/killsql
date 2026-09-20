# KillSQL

A free, open-source, LeetCode-style SQL practice platform. Every query runs **in the browser** via DuckDB-WASM. The backend only stores auth and progress.

## Features

- Monaco SQL editor (the VS Code engine)
- DuckDB-WASM in a Web Worker — CTEs, window functions, UNNEST
- Static JSON questions anyone can add via pull request
- GitHub / email auth, submissions, profiles, goal streaks, and a leaderboard (Supabase)
- Optional donations via Stripe Checkout (prompt after a successful solve)
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

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/migrations/001_initial.sql` then `002_streaks.sql` in the SQL editor.
3. Enable GitHub OAuth (and optionally email) under Authentication.
4. Copy `.env.example` to `apps/web/.env.local` and fill in the keys.
5. Add `http://localhost:3000/auth/callback` to the Supabase redirect allow-list.

### Optional: donations

The donate prompt appears after a first successful run of a problem (and from the header **Donate** button) whether or not Stripe is configured. Checkout needs a [Stripe](https://dashboard.stripe.com/apikeys) secret key:

```
STRIPE_SECRET_KEY=sk_test_your_secret_key
```

Amounts are $3 / $5 / $10 or a custom USD value. Users can skip, or check **Don't show this again today** (stored in the browser for that local calendar day). After payment they return to `/donate/success`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js app on port 3000 |
| `npm run build` | Production build |
| `npm run validate:questions` | Lint every question JSON file and run official solutions in DuckDB |
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

Apply `002_streaks.sql` for this feature. Optional: set `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` so Vercel can run the daily freeze/break job. The app also ticks your own streak whenever you load `/streak` or save a submission.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design (including donations) and [CONTRIBUTING.md](./CONTRIBUTING.md) to add questions.

## License

MIT
