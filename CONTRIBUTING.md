# Contributing to KillSQL

Thanks for helping build a free, browser-native SQL practice platform.

## Adding a question

Questions are static JSON files. No database migration is required.

1. Fork the repository.
2. Create a file under `questions/easy/`, `questions/medium/`, or `questions/hard/`.
   Name it `{id}-{slug}.json`, for example `006-select-unique-titles.json`.
3. Follow the schema in `packages/question-types/src/index.ts` and the examples in `questions/`.
4. Run:

```bash
npm run validate:questions
npm run build:index
```

To inspect a solution's result set: `npx tsx scripts/dump-results.ts 091`.

5. Open a pull request.

### JSON checklist

- `slug` is unique, kebab-case, and matches the filename after the id (`{id}-{slug}.json`).
- `difficulty` matches the folder name.
- `tags` come from `TAG_TAXONOMY` in `packages/question-types/src/index.ts`.
- `schema_sql` creates tables and inserts enough rows to make the problem interesting.
- `solution_sql` actually solves the problem — `npm run validate:questions` executes it in DuckDB.
- At least one test case with `expected_row_count` and `expected_columns`.
- Hard questions (and any case where exact values matter) must include `expected_rows`.
- Prefer `validate_order: true` when the prompt requires a specific `ORDER BY`.
- `hints` should unlock the idea without pasting the full solution.

## Local development

```bash
cp .env.example apps/web/.env.local   # optional — SQL still runs without Supabase
npm install
npm run dev
```

Open http://localhost:3000.

Auth, submissions, profiles, goal streaks, and the leaderboard need a Supabase project. Apply `supabase/migrations/001_initial.sql` then `002_streaks.sql` in the SQL editor, enable GitHub OAuth, and set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Donations: the post-solve prompt works without Stripe. Set `STRIPE_SECRET_KEY` in `apps/web/.env.local` to enable Checkout. `NEXT_PUBLIC_SITE_URL` is used for Stripe success/cancel URLs.

## Code contributions

- Keep query execution in the browser. Do not add a server that runs user SQL.
- Match existing TypeScript, Tailwind, and component patterns.
- Prefer small, reviewable pull requests.
