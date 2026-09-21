-- Minimal local Postgres for inspecting KillSQL tables.
-- Full auth (Google OAuth, RLS with auth.uid()) needs a real Supabase project
-- or `npx supabase start`. This stub lets docker-compose boot a compatible schema.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql
stable
as $$
  select null::uuid;
$$;
