# KillSQL — Architecture Document

> A free, open-source, LeetCode-style SQL practice platform.
> SQL queries run **entirely in the browser** — no query execution server required.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Client-Side SQL Execution](#4-client-side-sql-execution)
5. [Question Format & Storage](#5-question-format--storage)
6. [Validation Flow](#6-validation-flow)
7. [Page Routes & UI Structure](#7-page-routes--ui-structure)
8. [Donations](#8-donations)
9. [Goal Streaks](#9-goal-streaks)
10. [Database Schema (Supabase)](#10-database-schema-supabase)
11. [Repository Structure](#11-repository-structure)
12. [Cost Analysis](#12-cost-analysis)
13. [Open Source Strategy](#13-open-source-strategy)
14. [MVP Build Order](#14-mvp-build-order)
15. [Future Considerations](#15-future-considerations)

---

## 1. Core Philosophy

- **SQL runs in the browser.** Every query a user writes is executed locally using DuckDB compiled to WebAssembly. There is no backend query execution server.
- **Questions are static files.** v1 ships 100 problems as plain `.json` files in the repository, versioned via Git and served from a CDN. No database write is needed when a new question is added. The format is designed to scale toward 1000+ questions.
- **Backend is thin.** The server only stores user identity, progress, goal streaks, and submission history. It never touches SQL. Optional donations go through Stripe Checkout.
- **Open and contributable.** Anyone can add a question by opening a Pull Request with a single JSON file.

---

## 2. Technology Stack

### Frontend

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSG for problem pages, SSR for auth, great Vercel integration |
| Language | **TypeScript** | Type safety across question types and API contracts |
| Styling | **TailwindCSS + shadcn/ui** | Fast, consistent, accessible components |
| Code Editor | **Monaco Editor** | Same engine as VS Code; SQL syntax highlighting out of the box |
| SQL Engine | **DuckDB-WASM** | Runs full DuckDB in-browser; supports CTEs, window functions, UNNEST |
| Client State | **Zustand** | Lightweight; manages current problem, result set, theme |
| Server State | **TanStack Query (React Query)** | Caching, loading states for user profile and submissions |

### Backend

| Concern | Choice | Why |
|---|---|---|
| API Layer | **Next.js API Routes (Serverless)** | No dedicated server; co-located with the frontend on Vercel |
| Auth | **Supabase Auth** | Built-in email + GitHub OAuth; integrates with RLS |
| Database | **Supabase Postgres** | Managed Postgres with Row Level Security; free tier covers ~50K MAU |
| Payments | **Stripe Checkout** | Optional donations; no donor table in v1 |

### Infrastructure

| Concern | Choice | Cost |
|---|---|---|
| Hosting | **Vercel** | Free (100 GB bandwidth); Pro at $20/mo when needed |
| Database + Auth | **Supabase** | Free (500 MB DB, 50K MAU); Pro at $25/mo when needed |
| Payments | **Stripe** | No monthly fee; per-donation processing only |
| Question CDN | **Vercel Edge Network** | Questions are static assets — zero additional cost |
| CI | **GitHub Actions** | Free for public repos |

**Launch cost: $0/month.**

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────────┐      ┌───────────────────────────┐   │
│  │ Monaco Editor│─────▶│  Web Worker               │   │
│  │ (SQL input)  │      │  ┌─────────────────────┐  │   │
│  └──────────────┘      │  │   DuckDB-WASM        │  │   │
│         ▲              │  │  (query execution)   │  │   │
│         │ result/diff  │  └─────────────────────┘  │   │
│         └──────────────│  validator.ts             │   │
│                        └───────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │               Next.js App                        │  │
│  │  /problems  /problems/[slug]  /profile  /leader  │  │
│  │  /streak    /donate/success                      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────┬──────────────────┬─────────────────────┘
                 │ fetch questions  │ auth + submissions
                 │                  │ donate checkout
                 ▼                  ▼
       ┌──────────────────┐  ┌──────────────────────┐
       │  Vercel Edge CDN │  │  Next.js API Routes  │
       │  /questions/*.   │  │  (Serverless fns)    │
       │  json            │  └──────────┬───────────┘
       └──────────────────┘             │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                 ┌─────────────────┐         ┌─────────────────┐
                 │   Supabase      │         │   Stripe        │
                 │  Auth + Postgres│         │   Checkout      │
                 └─────────────────┘         └─────────────────┘
```

### Data Flow Summary

1. User opens `/problems/select-all-employees`
2. Next.js statically renders the page; question JSON is fetched from the Vercel edge
3. User writes SQL in Monaco Editor and clicks **Run**
4. Monaco posts `{ schema_sql, user_sql }` to the Web Worker
5. Web Worker initializes DuckDB-WASM (lazy-loaded once per session), executes the schema, then the user's query
6. Worker compares the result set to the expected output and sends `{ pass, result, diff }` back to the main thread
7. If the user is logged in and the test passes, the Next.js API Route saves the submission to Supabase
8. On the first pass in that workspace session, if the user has not dismissed the donate prompt for today, the donate modal opens (guests included)

---

## 4. Client-Side SQL Execution

### Why DuckDB-WASM over sql.js

| Feature | DuckDB-WASM | sql.js |
|---|---|---|
| Window functions | ✅ Full support | ⚠️ Limited |
| CTEs (WITH clause) | ✅ | ✅ |
| UNNEST / arrays | ✅ | ❌ |
| Analytical SQL | ✅ Excellent | ⚠️ Basic |
| Bundle size | ~5 MB (WASM) | ~1.3 MB |
| Performance | Fast (native WASM) | Slower |

### Web Worker Setup

DuckDB-WASM runs inside a **Web Worker** to avoid blocking the UI thread during query execution.

```
apps/web/worker/sql.worker.ts
```

The worker exposes a simple message-passing interface:

```typescript
// Message types
type WorkerRequest =
  | { type: 'INIT' }
  | { type: 'RUN'; schema_sql: string; user_sql: string; test_cases: TestCase[] }

type WorkerResponse =
  | { type: 'READY' }
  | { type: 'RESULT'; rows: Record<string, unknown>[]; columns: string[] }
  | { type: 'PASS'; result: QueryResult }
  | { type: 'FAIL'; result: QueryResult; diff: ResultDiff }
  | { type: 'ERROR'; message: string }
```

### Validation Logic (`validator.ts`)

For each test case the validator checks:

1. **Column names** — Are the required columns present?
2. **Row count** — Does the result have the expected number of rows?
3. **Row values** — Do individual cell values match? (order-insensitive by default)
4. **Order** — Only enforced when `validate_order: true` in the test case

Result comparison uses a canonical JSON hash of each row (column values sorted by key) to enable order-insensitive set equality.

---

## 5. Question Format & Storage

### File Location

All questions live in the repository under `questions/`:

```
questions/
├── easy/
│   ├── 001-select-all-employees.json
│   └── 002-filter-by-salary.json
├── medium/
│   ├── 031-salary-by-department.json
│   └── ...
└── hard/
    ├── 091-managers-above-team-average.json
    └── ...
```

### JSON Schema

```json
{
  "id": "001",
  "slug": "select-all-employees",
  "title": "Select All Employees",
  "difficulty": "easy",
  "tags": ["SELECT"],
  "description": "Write a SQL query to return **all rows and columns** from the `employees` table.\n\n**Table: employees**\n\n| Column | Type |\n|--------|------|\n| id | INT |\n| name | VARCHAR |\n| salary | INT |",
  "schema_sql": "CREATE TABLE employees (id INT, name VARCHAR, salary INT); INSERT INTO employees VALUES (1,'Alice',70000),(2,'Bob',55000),(3,'Carol',90000);",
  "solution_sql": "SELECT * FROM employees",
  "test_cases": [
    {
      "id": "tc1",
      "description": "Returns all 3 rows",
      "expected_row_count": 3,
      "expected_columns": ["id", "name", "salary"],
      "validate_order": false
    }
  ],
  "hints": [
    "The `*` wildcard selects all columns.",
    "You do not need a WHERE clause to return all rows."
  ],
  "explanation": "The simplest possible SELECT statement. `SELECT *` returns every column and every row from the specified table.",
  "companies": ["Google", "Meta"],
  "created_at": "2026-09-20"
}
```

### TypeScript Type

```typescript
// packages/question-types/src/index.ts

export interface TestCase {
  id: string;
  description: string;
  expected_row_count?: number;
  expected_columns?: string[];
  expected_rows?: Record<string, unknown>[];
  validate_order: boolean;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  description: string;         // Markdown
  schema_sql: string;
  solution_sql: string;
  test_cases: TestCase[];
  hints: string[];
  explanation: string;         // Markdown
  companies?: string[];
  created_at: string;          // ISO date
}
```

Tags must be chosen from `TAG_TAXONOMY` in the same file (`SELECT`, `window functions`, `INTERSECT`, `LAST_VALUE`, …). `npm run validate:questions` rejects unknown tags, checks `{id}-{slug}.json` filenames, requires `expected_rows` on hard problems, and **executes every `solution_sql` in DuckDB**.

### Question Index

A build script generates `questions/index.json` — a lightweight list of all questions (without `schema_sql`, `solution_sql`, `test_cases`) used to render the problem list page quickly:

```json
[
  { "id": "001", "slug": "select-all-employees", "title": "Select All Employees", "difficulty": "easy", "tags": ["SELECT"] },
  ...
]
```

---

## 6. Validation Flow

```
User types SQL
      │
      ▼
  Click "Run"
      │
      ▼
Monaco → postMessage({ type:'RUN', schema_sql, user_sql, test_cases }) → Web Worker
                                                                              │
                                                              ┌───────────────┘
                                                              │
                                                    DuckDB.exec(schema_sql)   ← creates tables + inserts data
                                                              │
                                                    DuckDB.exec(user_sql)     ← user's query
                                                              │
                                                    rows = fetchAllResults()
                                                              │
                                                    validator.run(rows, test_cases)
                                                              │
                                               ┌─────────────┴──────────────┐
                                            PASS                           FAIL
                                               │                            │
                                   { type:'PASS', result }     { type:'FAIL', result, diff }
                                               │                            │
                                               └────────────────────────────┘
                                                              │
                                                     Main thread receives
                                                              │
                                                   ┌──────────┴──────────┐
                                                PASS                    FAIL
                                                   │                     │
                                         Save submission          Show diff table
                                         to Supabase via          (expected vs actual)
                                         API Route
```

---

## 7. Page Routes & UI Structure

### Routes

| Route | Type | Description |
|---|---|---|
| `/` | Static | Landing page — hero, stats, sample problem, CTA |
| `/problems` | Static (ISR) | Problem list with filter by difficulty, tag, solved status |
| `/problems/[slug]` | Static (ISR) | Problem workspace — description, editor, results |
| `/streak` | SSR | Start or manage a goal streak — duration, daily quota, calendar, today progress |
| `/profile/[username]` | SSR | User profile — solved count, streak calendar, recent activity |
| `/leaderboard` | SSR | Top users by solve count |
| `/login` | Static | GitHub OAuth / email login via Supabase |
| `/donate/success` | Static | Thank-you page after Stripe Checkout |

### Problem Workspace Layout (`/problems/[slug]`)

```
┌─────────────────────────────────────────────────────────────┐
│  KillSQL         Problems   Streak   Leaderboard   Donate  [Login]  │  ← Nav
├──────────────────────────┬──────────────────────────────────┤
│  Problem Description     │  SQL Editor (Monaco)             │
│                          │                                  │
│  Title + Difficulty      │  -- Write your query here        │
│  Tags                    │  SELECT ...                      │
│                          │                                  │
│  Description (Markdown)  │  [Run ▶]  [Reset]  [Hint 💡]    │
│                          ├──────────────────────────────────┤
│  Schema Tables           │  Results                         │
│  (expandable)            │                                  │
│                          │  ✅ Test case 1 passed           │
│  [Show Hints]            │  ❌ Test case 2 failed           │
│  [Show Solution]         │  (diff table shown on fail)      │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 8. Donations

KillSQL stays free by asking for optional support after a successful solve. Payments go through **Stripe Checkout**. There is no donations table in v1 — Stripe is the source of truth.

### When the prompt appears

After `getSqlEngine().run()` in `apps/web/components/editor/sql-workspace.tsx`:

- Open only when `result.passed` is true **and** this workspace session had not already passed (re-running a correct query does not nag).
- Skip entirely if localStorage key `killsql-donate-hide-until` equals today's local `YYYY-MM-DD`.
- Guests and signed-in users both see it; donations do not require login.

A later problem the same day can still show the prompt unless the user checked **Don't show this again today**. The header **Donate** button always opens the same modal.

### Modal

`apps/web/components/donate/donate-prompt.tsx` — $3 / $5 / $10 chips (default $5), custom USD amount ($1–$500), **Donate**, **Skip**, and the daily-dismiss checkbox. Skip / overlay / Escape close the modal; if the checkbox is on, persist dismiss.

### Checkout

`POST /api/donate/checkout` with `{ amountCents, returnPath }`:

- Validate amount (integer cents, $1–$500) and `returnPath` (must start with `/`, no open redirect).
- Create a Checkout Session: `mode: "payment"`, `submit_type: "donate"`, one USD `price_data` line item.
- `success_url` → `/donate/success?next=...`, `cancel_url` → original problem.
- Client redirects to `session.url`.

Env: `STRIPE_SECRET_KEY` (server-only) and `NEXT_PUBLIC_SITE_URL` (success/cancel URLs). If Stripe is not configured, Donate shows an inline error instead of a broken redirect.

Dismiss is stored on skip-with-checkbox, Donate click, and the thank-you page. No webhook in v1.

---

## 9. Goal Streaks

Users **start a streak** — it does not begin automatically. They choose how many days to run and how many problems they must solve each day. Example: **40 days, 2 problems per day**. The streak stays alive only if that quota is confirmed every calendar day until the challenge ends.

This is separate from `user_stats.current_streak` (a lifetime consecutive-day count of any passing activity). Goal streaks are explicit challenges with a start, a quota, and an end.

### Start flow

1. Logged-in user clicks **Start a streak** on home, profile, or `/streak`
2. Picks **duration** (presets: 7 / 14 / 21 / 30 / 40, or custom days) and **daily quota** (1 / 2 / 3 / 5 problems)
3. Confirms **timezone** (IANA, e.g. `Asia/Kolkata`) — all day boundaries use this timezone so midnight is local, not UTC
4. One **active** streak per user. Starting a new one requires cancelling the current one

### Daily confirmation logic

A calendar day is **confirmed** when the user has at least `daily_quota` **distinct** problems with a `pass` submission on that date in the streak timezone.

| Rule | Behavior |
|---|---|
| What counts | Distinct `problem_slug` with `status = 'pass'` that calendar day |
| Re-solves | Count toward the day's quota (practice volume, not only first-time uniques) |
| Fail submissions | Do not count |
| Today in progress | UI shows `1/2 today` until quota is met |
| Missed yesterday | After local midnight: consume a freeze if available, else `status = broken` |
| Last day confirmed or frozen | If every day in `duration_days` is confirmed or frozen → `status = completed` |
| Streak freeze | Earned every 3 quota-met days; auto-used on a miss; max 2 held |

```
User starts streak: 40 days, 2 problems/day
        │
        ▼
Each passing submission
        │
        ▼
Count DISTINCT problem_slug WHERE status='pass'
  AND date(solved_at AT TIME ZONE streak.timezone) = today
        │
        ├── count >= daily_quota → mark streak_days.confirmed_at
        │                              │
        │                              └── if day == last day → status = completed
        │
        └── count < daily_quota  → leave day unconfirmed
                                        │
Vercel cron (hourly, checks local midnight per timezone)
        │
        └── yesterday unconfirmed AND status = active
                ├── freeze_balance > 0 → consume 1 freeze, mark day frozen, stay active
                └── freeze_balance = 0 → status = broken
```

```
                ┌──────────┐
   start        │  active  │────── quota met each day ──────┐
                └────┬─────┘                                │
         miss a day  │                                      │ last day confirmed or frozen
                     │                                      ▼
        freeze > 0?  │                                ┌───────────┐
           yes ↓  no ↓                                │ completed │
        consume 1  ┌─────────┐                        └───────────┘
        stay active│ broken  │
                   └─────────┘
                     ▲
                     │ user cancels → cancelled
```

### Streak freezes (Duolingo-style)

Freezes are a reward for keeping the challenge alive — not a purchase. They work like Duolingo: if you miss a day and you have a freeze, it is spent automatically and the streak continues.

| Rule | Behavior |
|---|---|
| Earn | Every **3 consecutive quota-met days** awards **1 freeze**. Frozen days do **not** count toward this 3 |
| Cap | Hold at most **2** (classic Duolingo). Awards while at cap are discarded |
| Use | Automatic at local midnight. No “use freeze” button — if yesterday missed quota and `streak_freeze_balance > 0`, one freeze is consumed |
| Effect | Day is marked `frozen`. Streak stays `active`. Duration day still counts |
| Next freeze | Frozen days do not increment `confirmed_toward_freeze` |
| Inventory | Account-level on `user_stats.streak_freeze_balance` — leftover freezes carry into the next challenge |
| Consecutive misses | Allowed if you have multiple freezes (2 in a row if you hold 2) |

Earn counter example on a 40-day / 2-per-day streak:

```
Day 1 confirmed → toward_freeze = 1
Day 2 confirmed → toward_freeze = 2
Day 3 confirmed → toward_freeze = 0, freeze_balance = 1
Day 4 missed, freeze used → frozen, toward_freeze stays 0, freeze_balance = 0
Day 5–7 confirmed → freeze_balance = 1 again
```

### UI

- **No active streak:** CTA **Start a streak** on home, profile, and `/streak`
- **Active chip** in nav / home: `Day 12/40 · 1/2 today · ❄ 2`
- **`/streak` calendar:** green = confirmed, amber = today incomplete, ice = freeze used, red = missed (broken), grey = future
- After a freeze is consumed: toast **“Streak freeze used — your streak is safe”**
- **Profile:** active challenge, freeze balance, completed history, plus the lifetime consecutive-day count from `user_stats`

### Server rules

- Counts are derived from `submissions` — the client never sends a trusted “I solved it today” or “I used a freeze” flag
- On each passing submission, recompute today's distinct-pass count and upsert `streak_days`; when a day flips to `confirmed`, increment `confirmed_toward_freeze`; on 3, award a freeze (cap 2) and reset the counter
- A **Vercel cron** (hourly is enough) runs after local midnight per streak timezone:
  - yesterday `confirmed` → no-op
  - yesterday unconfirmed and `streak_freeze_balance > 0` → decrement balance, mark day `frozen`
  - yesterday unconfirmed and no freeze → `status = broken`
- Unique partial index: at most one `active` row per `user_id`

---

## 10. Database Schema (Supabase)

### Tables

```sql
-- User profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  bio         TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',  -- IANA, e.g. Asia/Kolkata
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Every submission attempt (pass or fail)
CREATE TABLE submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  problem_slug TEXT NOT NULL,
  status       TEXT CHECK (status IN ('pass', 'fail')) NOT NULL,
  sql_written  TEXT NOT NULL,
  solved_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated stats per user (updated via DB trigger or API)
CREATE TABLE user_stats (
  user_id                UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_solved           INT DEFAULT 0,
  easy_solved            INT DEFAULT 0,
  medium_solved          INT DEFAULT 0,
  hard_solved            INT DEFAULT 0,
  current_streak         INT DEFAULT 0,
  longest_streak         INT DEFAULT 0,
  last_active_date       DATE,
  streak_freeze_balance  INT NOT NULL DEFAULT 0
    CHECK (streak_freeze_balance BETWEEN 0 AND 2)
);

-- User-started goal streak (one active row per user)
CREATE TABLE streak_challenges (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  duration_days           INT NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  daily_quota             INT NOT NULL CHECK (daily_quota BETWEEN 1 AND 20),
  start_date              DATE NOT NULL,
  timezone                TEXT NOT NULL,  -- frozen at start so day boundaries stay stable
  status                  TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'broken', 'cancelled')),
  confirmed_toward_freeze INT NOT NULL DEFAULT 0 CHECK (confirmed_toward_freeze BETWEEN 0 AND 2),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  ended_at                TIMESTAMPTZ
);

CREATE UNIQUE INDEX one_active_streak_per_user
  ON streak_challenges (user_id) WHERE status = 'active';

-- One row per calendar day of a challenge
CREATE TABLE streak_days (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID REFERENCES streak_challenges(id) ON DELETE CASCADE,
  local_date      DATE NOT NULL,
  problems_solved INT NOT NULL DEFAULT 0,
  outcome         TEXT NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending', 'confirmed', 'frozen', 'missed')),
  freeze_consumed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (challenge_id, local_date)
);
```

### Row Level Security Policies

```sql
-- Users can only read/write their own submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own submissions" ON submissions
  USING (auth.uid() = user_id);

-- Profiles are publicly readable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public profiles" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Streaks: own rows only (freeze consume is server-side / service role)
ALTER TABLE streak_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streaks" ON streak_challenges
  USING (auth.uid() = user_id);

ALTER TABLE streak_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streak days" ON streak_days
  USING (
    EXISTS (
      SELECT 1 FROM streak_challenges c
      WHERE c.id = challenge_id AND c.user_id = auth.uid()
    )
  );
```

---

## 11. Repository Structure

```
killsql/
├── apps/
│   └── web/                          # Next.js application
│       ├── app/
│       │   ├── page.tsx              # Landing page
│       │   ├── problems/
│       │   │   ├── page.tsx          # Problem list
│       │   │   └── [slug]/
│       │   │       └── page.tsx      # Problem workspace
│       │   ├── streak/
│       │   │   └── page.tsx          # Start / manage goal streak
│       │   ├── profile/
│       │   │   └── [username]/
│       │   │       └── page.tsx      # User profile
│       │   ├── leaderboard/
│       │   │   └── page.tsx          # Leaderboard
│       │   ├── donate/
│       │   │   └── success/
│       │   │       └── page.tsx      # Thank-you after Stripe Checkout
│       │   └── api/
│       │       ├── submissions/
│       │       │   └── route.ts      # POST /api/submissions
│       │       ├── donate/
│       │       │   └── checkout/
│       │       │       └── route.ts  # POST /api/donate/checkout
│       │       ├── streaks/
│       │       │   └── route.ts      # POST start / GET active streak
│       │       ├── cron/
│       │       │   └── streaks/
│       │       │       └── route.ts  # Hourly: freeze consume or break
│       │       └── user/
│       │           └── route.ts      # GET /api/user
│       ├── components/
│       │   ├── donate/
│       │   │   └── donate-prompt.tsx # Post-solve / header donate modal
│       │   ├── editor/
│       │   │   ├── MonacoEditor.tsx
│       │   │   └── ResultsPanel.tsx
│       │   ├── problems/
│       │   │   ├── ProblemList.tsx
│       │   │   └── ProblemCard.tsx
│       │   └── ui/                   # shadcn/ui components (incl. dialog)
│       ├── lib/
│       │   ├── donate.ts             # Amounts, daily dismiss, return-path safety
│       │   ├── duckdb.ts             # DuckDB-WASM initializer + wrapper
│       │   ├── validator.ts          # Result set comparison logic
│       │   ├── supabase.ts           # Supabase browser client
│       │   └── questions.ts          # Question loader (static JSON)
│       ├── worker/
│       │   └── sql.worker.ts         # Web Worker: DuckDB execution
│       └── types/
│           └── index.ts              # App-specific TypeScript types
│
├── packages/
│   └── question-types/               # Shared: Question + TestCase TS types
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── questions/                        # Static question bank (100 files for v1)
│   ├── index.json                    # Generated: lightweight question list
│   ├── easy/                         # 001–030
│   ├── medium/                       # 031–090
│   └── hard/                         # 091–100
│
├── scripts/
│   ├── validate-questions.ts         # JSON schema + DuckDB solution runner
│   ├── duckdb-exec.ts                # In-memory DuckDB for scripts
│   ├── build-index.ts                # Generates questions/index.json
│   └── copy-questions.ts             # Copies bank into apps/web/public
│
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint, validate questions (DuckDB), production build
│
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql           # profiles, submissions, user_stats
│       └── 002_streaks.sql           # streak challenges + freeze
│
├── docker/
│   └── init.sql                      # auth.uid() stub for local Postgres
├── docker-compose.yml                # Local Postgres with KillSQL migrations
├── package.json                      # npm workspaces (apps/web, packages/question-types)
├── .env.example                      # Supabase + optional Stripe keys
├── LICENSE                           # MIT
├── CONTRIBUTING.md                   # How to add questions / run locally
└── ARCHITECTURE.md                   # This document
```

---

## 12. Cost Analysis

### Monthly Active Users → Estimated Cost

| MAU Range | Vercel | Supabase | Total |
|---|---|---|---|
| 0 – 50K | Free ($0) | Free ($0) | **$0/month** |
| 50K – 200K | Pro ($20) | Pro ($25) | **~$45/month** |
| 200K – 500K | Pro ($20) | Pro ($25) + add-ons (~$50) | **~$95/month** |
| 500K+ | Enterprise (negotiate) | Enterprise (negotiate) | Custom |

### Why Costs Stay Low

- **No SQL execution server.** The biggest cost in a typical LeetCode-like platform is running user-submitted code in sandboxed containers. Here that cost is **zero** — all query execution happens in the user's browser.
- **Questions are static files.** Serving JSON from a CDN is essentially free at any scale.
- **Serverless API routes.** Vercel serverless functions only run when someone logs in, saves a submission, or starts a donation — not for every problem view.
- **Supabase free tier is generous.** 500 MB of Postgres + 50K MAU covers early growth entirely.
- **Stripe has no monthly fee.** Checkout is pay-per-donation (~2.9% + $0.30). The donate prompt works without a key; checkout is disabled until `STRIPE_SECRET_KEY` is set.

---

## 13. Open Source Strategy

### License
**MIT** — permissive, encourages community forks, corporate sponsorship, and third-party tooling.

### Community Question Contributions

The lowest-friction open-source contribution is adding a question:

1. Fork the repo
2. Create `questions/easy/123-my-new-question.json`
3. Run `npm run validate:questions` locally (validates JSON schema + runs test cases through DuckDB-Node)
4. Open a Pull Request

No backend changes, no migrations — just one JSON file.

### GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  validate:
    - Lint all question JSON files against the Question schema
    - Run every question's solution_sql through DuckDB-Node and assert test_cases pass
    - TypeScript typecheck
    - ESLint
```

This ensures every merged question is guaranteed to be valid and solvable.

### Local Development

```bash
# Optional: local Postgres with KillSQL tables (auth.uid() is stubbed)
docker compose up -d

npm install
npm run validate:questions   # JSON schema + run every official solution in DuckDB
npm run dev                  # Next.js on :3000
```

SQL practice works with no database. Auth, submissions, streaks, and the leaderboard need a [Supabase](https://supabase.com) project (or `npx supabase start`) and `apps/web/.env.local`. The donate prompt appears without Stripe; set `STRIPE_SECRET_KEY` to enable Checkout. `NEXT_PUBLIC_SITE_URL` is used for OAuth and Stripe return URLs.

---

## 14. MVP Build Order

Build in this order to get to a usable product as fast as possible:

1. **DuckDB-WASM + Monaco integration** — The core feature. A user can write SQL and see results locally. No backend needed yet.
2. **Static question loader** — Load a question JSON file and display it. Prove the full run → validate → pass/fail loop works.
3. **Problem workspace page** — The `/problems/[slug]` split-pane view.
4. **Problem list page** — `/problems` with filtering by difficulty and tag.
5. **Supabase auth** — GitHub OAuth login. Users can now be identified.
6. **Submission saving** — POST to `/api/submissions` on pass. Mark problems as solved in the UI.
7. **Profile page** — Show solved count, streak calendar, recent submissions.
8. **Goal streaks** — Start N-day / M-problems-per-day challenge; daily confirmation; **streak freeze every 3 confirmed days** (cap 2, auto-use on miss).
9. **Landing page + leaderboard** — Polish and growth features.
10. **Donations** — Post-solve prompt, header Donate, Stripe Checkout, daily localStorage dismiss.

---

## 15. Future Considerations

These are explicitly **out of scope for MVP** but worth designing for later:

| Feature | Notes |
|---|---|
| **SQL dialects** | DuckDB-WASM is DuckDB dialect. Future: toggle between DuckDB / PostgreSQL / MySQL syntax modes |
| **Timed challenges** | Could be client-side only (countdown timer, no server needed) |
| **Streak freeze shop / gems** | Freezes are earned only (every 3 confirmed days). Paid freeze packs are a later monetization option |
| **Donor list / webhooks** | v1 donations are Stripe-only. A webhook + `donations` table can power a public supporters list later |
| **Collections / Learning Paths** | Group questions into curated tracks (e.g., "Window Functions 101") |
| **Company-tagged problems** | Already in the question JSON schema via `companies[]` |
| **Discussion threads** | Could use GitHub Discussions or a Supabase `comments` table |
| **Sandboxed server-side execution** | If dialect fidelity matters at scale, consider Fly.io ephemeral containers — but only as an optional "verify on real Postgres" feature |
| **AI hints** | Stream hints from an LLM API (OpenAI / Anthropic) only when user requests — pay-per-use, not per query |
| **Mobile** | Monaco Editor doesn't work well on mobile; consider CodeMirror 6 as an alternative for mobile |

---

*Document generated: 2026-09-20 | KillSQL is open source under the MIT License.*
