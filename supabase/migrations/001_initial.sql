-- KillSQL initial schema
-- Applied to production only by `.github/workflows/supabase-migrate.yml`
-- (`supabase db push`). Do not paste this into the dashboard SQL editor.
-- Local: `docker compose up -d` or `npx supabase db push` against a linked project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_slug text not null,
  status text not null check (status in ('pass', 'fail')),
  sql_written text not null,
  solved_at timestamptz not null default now()
);

create index if not exists submissions_user_id_idx on public.submissions (user_id);
create index if not exists submissions_problem_slug_idx on public.submissions (problem_slug);
create index if not exists submissions_user_problem_status_idx
  on public.submissions (user_id, problem_slug, status);

create table if not exists public.user_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_solved int not null default 0,
  easy_solved int not null default 0,
  medium_solved int not null default 0,
  hard_solved int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date
);

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.user_stats enable row level security;

drop policy if exists "public profiles" on public.profiles;
create policy "public profiles" on public.profiles
  for select using (true);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own submissions" on public.submissions;
create policy "own submissions" on public.submissions
  for select using (auth.uid() = user_id);

drop policy if exists "insert own submissions" on public.submissions;
create policy "insert own submissions" on public.submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "public stats" on public.user_stats;
create policy "public stats" on public.user_stats
  for select using (true);

drop policy if exists "own stats write" on public.user_stats;
create policy "own stats write" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  handle text;
begin
  handle := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  handle := regexp_replace(lower(handle), '[^a-z0-9_]', '', 'g');
  if handle = '' then
    handle := 'user_' || substr(new.id::text, 1, 8);
  end if;

  if exists (select 1 from public.profiles where username = handle) then
    handle := handle || '_' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    handle,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
