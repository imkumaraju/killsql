-- Google auth profile fields, private emails, default avatars, first-login onboarding.
-- Applied after 002_streaks.sql by `.github/workflows/supabase-migrate.yml`.
-- Do not paste this into the dashboard SQL editor.
-- Google OAuth itself is enabled in the Supabase dashboard (Authentication → Providers),
-- not in SQL.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Emails live here so public profile reads (leaderboard, /profile, keep-alive)
-- cannot leak them via PostgREST. Google / OAuth email is also on auth.users.
create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  updated_at timestamptz not null default now()
);

create unique index if not exists profile_private_email_lower_idx
  on public.profile_private (lower(email))
  where email is not null;

alter table public.profile_private enable row level security;

drop policy if exists "own private profile" on public.profile_private;
create policy "own private profile" on public.profile_private
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke insert, update, delete on public.profile_private from public;
grant select, insert, update on public.profile_private to authenticated;

-- ---------------------------------------------------------------------------
-- Username helper (3–24 chars, a-z / 0-9 / _)
-- ---------------------------------------------------------------------------

create or replace function public.allocate_username(raw text, uid uuid)
returns text
language plpgsql
as $$
declare
  handle text;
  reserved text[] := array[
    'admin', 'api', 'auth', 'callback', 'donate', 'killsql', 'leaderboard',
    'learn', 'login', 'me', 'onboarding', 'problems', 'profile', 'settings',
    'signup', 'streak', 'support', 'user', 'welcome', 'www'
  ];
begin
  handle := coalesce(raw, '');
  handle := regexp_replace(lower(handle), '[^a-z0-9_]', '', 'g');
  handle := left(handle, 16);

  if handle = '' or handle = any (reserved) or char_length(handle) < 3 then
    handle := 'user_' || substr(uid::text, 1, 8);
  end if;

  if exists (select 1 from public.profiles where username = handle and id <> uid) then
    handle := left(handle, 16) || '_' || substr(uid::text, 1, 6);
  end if;

  return handle;
end;
$$;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,24}$');

-- ---------------------------------------------------------------------------
-- New-user trigger: store Google name + email, assign username + default avatar
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  handle text;
  full_name text;
begin
  handle := public.allocate_username(
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username',
      split_part(new.email, '@', 1)
    ),
    new.id
  );

  full_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  );

  insert into public.profiles (id, username, display_name, avatar_url, onboarding_completed)
  values (
    new.id,
    handle,
    left(full_name, 80),
    '/avatars/default.svg',
    false
  );

  insert into public.user_stats (user_id) values (new.id);

  insert into public.profile_private (user_id, email)
  values (new.id, new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill private emails for any profiles that already exist (empty prod today).
insert into public.profile_private (user_id, email)
select p.id, u.email
from public.profiles p
join auth.users u on u.id = p.id
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- First-login onboarding RPC
-- Blank username → keep the assigned handle. Blank avatar → default.svg.
-- ---------------------------------------------------------------------------

create or replace function public.complete_onboarding(
  p_username text default null,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_username text;
  next_avatar text;
  row public.profiles;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into row from public.profiles where id = uid for update;
  if not found then
    insert into public.profiles (id, username, avatar_url, onboarding_completed)
    values (uid, public.allocate_username(null, uid), '/avatars/default.svg', false);
    insert into public.user_stats (user_id) values (uid)
    on conflict (user_id) do nothing;
    insert into public.profile_private (user_id, email)
    select uid, email from auth.users where id = uid
    on conflict (user_id) do nothing;
    select * into row from public.profiles where id = uid for update;
  end if;

  next_username := row.username;
  if p_username is not null and length(trim(p_username)) > 0 then
    next_username := lower(trim(p_username));
    if next_username !~ '^[a-z0-9_]{3,24}$' then
      raise exception 'Username must be 3–24 characters: lowercase letters, numbers, underscore';
    end if;
    if next_username = any (array[
      'admin', 'api', 'auth', 'callback', 'donate', 'killsql', 'leaderboard',
      'learn', 'login', 'me', 'onboarding', 'problems', 'profile', 'settings',
      'signup', 'streak', 'support', 'user', 'welcome', 'www'
    ]) then
      raise exception 'Username is reserved';
    end if;
    if exists (select 1 from public.profiles where username = next_username and id <> uid) then
      raise exception 'Username is taken' using errcode = '23505';
    end if;
  end if;

  next_avatar := nullif(trim(coalesce(p_avatar_url, '')), '');
  if next_avatar is null then
    next_avatar := '/avatars/default.svg';
  end if;

  if char_length(next_avatar) > 2048 then
    raise exception 'Invalid avatar';
  end if;

  update public.profiles
  set
    username = next_username,
    avatar_url = next_avatar,
    onboarding_completed = true
  where id = uid
  returning * into row;

  return row;
end;
$$;

revoke all on function public.allocate_username(text, uuid) from public;
revoke all on function public.complete_onboarding(text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.complete_onboarding(text, text) to authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Avatar uploads (no-op on plain Docker Postgres without the storage schema)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'avatars',
      'avatars',
      true,
      2097152,
      array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    )
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "avatar public read" on storage.objects';
    execute $policy$
      create policy "avatar public read" on storage.objects
        for select using (bucket_id = 'avatars')
    $policy$;

    execute 'drop policy if exists "avatar own upload" on storage.objects';
    execute $policy$
      create policy "avatar own upload" on storage.objects
        for insert with check (
          bucket_id = 'avatars'
          and auth.uid() is not null
          and name like auth.uid()::text || '/%'
        )
    $policy$;

    execute 'drop policy if exists "avatar own update" on storage.objects';
    execute $policy$
      create policy "avatar own update" on storage.objects
        for update using (
          bucket_id = 'avatars'
          and auth.uid() is not null
          and name like auth.uid()::text || '/%'
        )
        with check (
          bucket_id = 'avatars'
          and name like auth.uid()::text || '/%'
        )
    $policy$;

    execute 'drop policy if exists "avatar own delete" on storage.objects';
    execute $policy$
      create policy "avatar own delete" on storage.objects
        for delete using (
          bucket_id = 'avatars'
          and auth.uid() is not null
          and name like auth.uid()::text || '/%'
        )
    $policy$;
  end if;
end $$;
