# KillSQL TODO

Snapshot: **2026-09-21**. v1 product code is largely built. The 100-problem bank, browser SQL engine, workspace, streaks, and donate prompt all exist. Supabase project **KillSQL** is created but empty. Remaining: wire secrets + auth, apply migrations via GitHub Actions, Dodo live payments, leaderboard polish, and committing local practice-UX / Dodo work.

## Status at a glance

| Area | Code | Live | Notes |
|---|---|---|---|
| Question bank | Done | Static in repo | 100 problems: 30 easy, 60 medium, 10 hard |
| Practice engine | Done | Works without an account | DuckDB-WASM, Monaco, validator, CI |
| Practice UX (items 2–11) | Done | **Uncommitted** | Schema preview, fail diffs, guest progress, tracks, daily, autocomplete |
| Auth, submissions, profiles, streaks | Done | **Secrets in Actions; schema not applied yet** | KillSQL @ `pbsrivwuhq2thtgut`; `.env.local` filled locally |
| Leaderboard | Basic page | **Not configured** | Polish (hide 0-solved, ties, highlight you) still open |
| Donations | Dodo draft | **Not live** | Stripe removed locally; merchant verification still pending |

`main` at `origin` is the original MVP plus Stripe donate and Vercel/CI fixes. Working tree on this machine also has the practice UX and the Dodo Payments swap.

## Next unblocked actions

1. **Push the migration workflows** and run **Deploy Supabase migrations**, then finish auth URLs / GitHub OAuth.
2. **Commit and push the practice UX** (and optionally the Dodo code swap). SQL practice does not need Dodo to ship.
3. **After Dodo merchant approval:** live Pay What You Want product, env keys, test checkout, one small live payment.

## Uncommitted local work

Do not commit API keys, product secrets, bank details, or identity documents.

- [ ] Commit the practice UX (learn tracks, daily problem, schema preview, fail diffs, guest progress, autocomplete, docs).
- [ ] Commit the Dodo Payments swap when you are ready for it to land on `main` (checkout still returns 503 until keys exist).
- [ ] Run typecheck, lint, and production build before pushing.

---

## Supabase setup

Status: **In progress.** Project **KillSQL** exists (`https://pbsrivwuhq2thtgut.supabase.co`, Postgres 15, Nano, empty). Schema is applied **only** through git (`supabase/migrations/` → GitHub Action `supabase db push`). Do not paste SQL in the dashboard editor, and do not use the dashboard **Connect** GitHub integration — that would fight the Actions pipeline.

### Secrets (public repo)

Real keys never go in git. GitHub Actions secrets are encrypted, hidden from the public repo, and masked in logs. Fork PRs do not receive them.

- [x] Workflows read only `${{ secrets.* }}` — no keys in YAML.
- [x] `.env` / `.env.local` gitignored; `scripts/check-secrets.mjs` runs in CI.
- [x] GitHub **Actions** secrets (not Codespaces): `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`.

- [ ] GitHub → **Settings → Code security** → enable **Secret scanning** and **Push protection** (free on public repos).
- [x] Local keys in `apps/web/.env.local` (gitignored).
- [ ] Vercel env for the running app (`SUPABASE_SERVICE_ROLE_KEY` is server-only; never `NEXT_PUBLIC_`).

The anon key will still appear in the browser after deploy — that is how Supabase client apps work. RLS on `profiles` / `submissions` is the actual lock. `service_role` and the DB password must stay in GitHub Secrets / Vercel / `.env.local`.

### Git pipeline (schema)

- [x] Keep all schema in `supabase/migrations/` (001 initial, 002 streaks).
- [x] Add `.github/workflows/supabase-migrate.yml` — `supabase link` + `supabase db push` on `main` and via **Run workflow**.
- [ ] After this pipeline is on `main`, run **Deploy Supabase migrations** if it did not start automatically, so 001 + 002 land on the empty project.
- [ ] Confirm `profiles`, `submissions`, `user_stats`, `streak_challenges`, `streak_days`, RLS, and the new-user trigger exist in Table Editor.
- [ ] Later schema changes: `npx supabase migration new descriptive_name`, PR, merge to `main`. Never edit production tables by hand.

### Free-tier keep-alive

Supabase pauses Free projects with too little **database** activity over ~7 days. A dashboard visit is not enough; the ping must hit Postgres.

- [x] Add `.github/workflows/supabase-keepalive.yml` — `SELECT` one `profiles` row via PostgREST.
- [x] Schedule **Monday and Thursday 08:00 UTC** (weekly at least once; twice leaves margin if GitHub delays a cron). Manual **Run workflow** is also enabled.
- [ ] After migrations are applied, run **Keep Supabase awake** once from the Actions tab and confirm it is green.
- [ ] If a pause-warning email arrives, bump the cron to daily (`0 8 * * *`). GitHub also stops scheduled workflows after ~60 days of zero repo activity — a push or manual run re-enables them.

### Project and local app

- [x] Create a Supabase project in the preferred production region (KillSQL, Free, Healthy).
- [x] Copy Project URL + anon key + service_role into `apps/web/.env.local` (from `.env.example`).
- [ ] Add the same values to Vercel encrypted env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` server-only.

### Authentication

- [ ] Authentication → URL configuration: Site URL. Local: `http://localhost:3000`. Production: the Vercel domain when you have one.
- [ ] Redirect allow-list: `http://localhost:3000/auth/callback` and `https://<production-domain>/auth/callback`.
- [ ] Email provider: leave enabled if you want email/password (already on by default).
- [ ] Create a GitHub OAuth App (callback `https://pbsrivwuhq2thtgut.supabase.co/auth/v1/callback`).
- [ ] Paste the GitHub client ID and secret into Authentication → Providers → GitHub.
- [ ] Test email and GitHub sign-in, sign-out, callback redirects, and profile creation.

### After auth is live

- [ ] Verify signed-in submission saving, solved-problem stats, profiles, leaderboard, and goal streaks.
- [ ] Verify the daily `/api/cron/streaks` job is authorized and running (needs `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` on Vercel).
- [ ] After first sign-in, push local guest solves up to `submissions` (today the UI only *merges* local + server slugs for display).

## Dodo Payments integration

Status: **Blocked — merchant verification submitted and pending approval.**

The Stripe-based donation flow is being replaced with Dodo Payments so KillSQL can accept optional support from global donors and receive payouts to an Indian bank account in INR.

### Resume after verification

- [ ] Confirm the Dodo Payments merchant account and INR payout account are approved.
- [ ] In Live Mode, create a one-time USD product named `KillSQL support`.
- [ ] Enable **Pay What You Want** with a $1 minimum and $500 maximum.
- [ ] Copy the live product ID (`pdt_...`).
- [ ] Create a live API key with write access.
- [ ] Configure deployment secrets:
  - `DODO_PAYMENTS_API_KEY`
  - `DODO_PAYMENTS_PRODUCT_ID`
  - `DODO_PAYMENTS_ENVIRONMENT=live_mode`
  - `NEXT_PUBLIC_SITE_URL=https://<production-domain>`
- [ ] Test the prepared Dodo checkout integration in Test Mode first.
- [ ] Verify the $3, $5, $10, and custom-amount paths.
- [ ] Verify successful checkout returns to `/donate/success`.
- [ ] Verify cancelled checkout returns to the originating problem.
- [ ] Make one small live payment and confirm it appears in Dodo Payments.
- [ ] Confirm settlement reaches the Indian bank account in INR via Local transfer.

### Current local state

A draft Dodo integration is in the working tree (replaces the Stripe SDK and checkout route) but has not been committed or pushed. The donate modal still appears without keys; checkout is disabled until `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_PRODUCT_ID` are set. Review and test after verification before treating donations as live.

## Practice UX

User-facing practice features. Items that need a live Supabase project wait until [Supabase setup](#supabase-setup) is done.

### Can ship without Supabase

- [x] **2. Readable schema** — Show tables, column types, and sample rows instead of raw `CREATE`/`INSERT` SQL.
- [x] **3. Better fail output** — Expected vs yours, and the first row/column that differs.
- [x] **4. Guest progress** — Persist solved slugs and drafts in `localStorage`. Merge with the account after sign-in (sync-to-server waits on Supabase).
- [x] **5. DuckDB dialect note** — Tell people queries run in DuckDB (Postgres-like) in the browser, and where syntax may differ from interview engines.
- [x] **6. Next / previous / random** — Plus continue where you left off.
- [x] **7. Company filter** — `companies` is already on the question JSON; expose it on the problems list.
- [x] **8. Topic tracks** — Curated paths (joins, window functions, `GROUP BY`) over the existing 100 problems. Nine tracks at `/learn`.
- [x] **9. Daily problem** — One featured slug per UTC day. No server required.
- [x] **10. Schema-aware autocomplete** — Table and column names in the Monaco editor.
- [x] **11. Attempt history on the problem** — Restore recent local runs now. Signed-in server submissions wait on Supabase.

### Blocked on Supabase

- [ ] **1. Turn auth on** — Progress, streaks, and the leaderboard stay dead until the project, OAuth, and env vars are live.
- [ ] **12. Leaderboard polish** — Hide 0-solved accounts, break ties, highlight the signed-in user. Needs a live `user_stats` feed.

## Later / out of scope

SQL dialects, timed challenges, paid streak freezes, a public donor list, discussion threads, server-side Postgres verification, AI hints, and a mobile editor are listed in [ARCHITECTURE.md](./ARCHITECTURE.md#15-future-considerations). They are not part of this launch.
