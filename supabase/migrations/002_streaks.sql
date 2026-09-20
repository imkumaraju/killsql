-- Goal streaks + Duolingo-style freezes
-- Apply after 001_initial.sql in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.user_stats
  add column if not exists streak_freeze_balance int not null default 0;

alter table public.user_stats
  drop constraint if exists user_stats_streak_freeze_balance_check;

alter table public.user_stats
  add constraint user_stats_streak_freeze_balance_check
  check (streak_freeze_balance between 0 and 2);

create table if not exists public.streak_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  duration_days int not null check (duration_days between 1 and 365),
  daily_quota int not null check (daily_quota between 1 and 20),
  start_date date not null,
  timezone text not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'broken', 'cancelled')),
  confirmed_toward_freeze int not null default 0
    check (confirmed_toward_freeze between 0 and 2),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists one_active_streak_per_user
  on public.streak_challenges (user_id)
  where status = 'active';

create index if not exists streak_challenges_user_id_idx
  on public.streak_challenges (user_id, created_at desc);

create index if not exists streak_challenges_active_idx
  on public.streak_challenges (status)
  where status = 'active';

create table if not exists public.streak_days (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.streak_challenges (id) on delete cascade,
  local_date date not null,
  problems_solved int not null default 0,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'confirmed', 'frozen', 'missed')),
  freeze_consumed boolean not null default false,
  unique (challenge_id, local_date)
);

create index if not exists streak_days_challenge_idx
  on public.streak_days (challenge_id, local_date);

alter table public.streak_challenges enable row level security;
alter table public.streak_days enable row level security;

drop policy if exists "public streak challenges" on public.streak_challenges;
create policy "public streak challenges" on public.streak_challenges
  for select using (true);

drop policy if exists "public streak days" on public.streak_days;
create policy "public streak days" on public.streak_days
  for select using (true);

revoke insert, update, delete on public.streak_challenges from public;
revoke insert, update, delete on public.streak_days from public;
grant select on public.streak_challenges to public;
grant select on public.streak_days to public;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.date_in_zone(ts timestamptz, tz text)
returns date
language sql
stable
as $$
  select (timezone(tz, ts))::date;
$$;

create or replace function public.award_streak_freeze(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats (user_id, streak_freeze_balance)
  values (p_user_id, 1)
  on conflict (user_id) do update
    set streak_freeze_balance = least(public.user_stats.streak_freeze_balance + 1, 2);
end;
$$;

-- Close missed days after local midnight. Consume a freeze when possible.
create or replace function public.tick_user_goal_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.streak_challenges%rowtype;
  today date;
  end_date date;
  d date;
  day_outcome text;
  freeze_bal int;
begin
  select * into c
  from public.streak_challenges
  where user_id = p_user_id and status = 'active'
  for update;

  if not found then
    return;
  end if;

  today := public.date_in_zone(now(), c.timezone);
  end_date := c.start_date + (c.duration_days - 1);
  d := c.start_date;

  while d <= least(today - 1, end_date) loop
    insert into public.streak_days (challenge_id, local_date)
    values (c.id, d)
    on conflict (challenge_id, local_date) do nothing;

    select outcome into day_outcome
    from public.streak_days
    where challenge_id = c.id and local_date = d
    for update;

    if day_outcome in ('confirmed', 'frozen') then
      d := d + 1;
      continue;
    end if;

    if day_outcome = 'missed' then
      update public.streak_challenges
      set status = 'broken', ended_at = now()
      where id = c.id;
      return;
    end if;

    select coalesce(streak_freeze_balance, 0) into freeze_bal
    from public.user_stats
    where user_id = p_user_id
    for update;

    freeze_bal := coalesce(freeze_bal, 0);

    if freeze_bal > 0 then
      update public.user_stats
      set streak_freeze_balance = streak_freeze_balance - 1
      where user_id = p_user_id;

      update public.streak_days
      set outcome = 'frozen', freeze_consumed = true
      where challenge_id = c.id and local_date = d;

      if d = end_date then
        update public.streak_challenges
        set status = 'completed', ended_at = now()
        where id = c.id;
        return;
      end if;
    else
      update public.streak_days
      set outcome = 'missed'
      where challenge_id = c.id and local_date = d;

      update public.streak_challenges
      set status = 'broken', ended_at = now()
      where id = c.id;
      return;
    end if;

    d := d + 1;
  end loop;

  if today > end_date then
    if exists (
      select 1
      from public.streak_days
      where challenge_id = c.id
        and local_date = end_date
        and outcome in ('confirmed', 'frozen')
    ) then
      update public.streak_challenges
      set status = 'completed', ended_at = now()
      where id = c.id and status = 'active';
    end if;
  end if;
end;
$$;

-- Count distinct passing problems today and confirm the day when quota is met.
create or replace function public.apply_pass_to_goal_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.streak_challenges%rowtype;
  today date;
  end_date date;
  solved int;
  prev_outcome text;
begin
  select * into c
  from public.streak_challenges
  where user_id = p_user_id and status = 'active'
  for update;

  if not found then
    return;
  end if;

  today := public.date_in_zone(now(), c.timezone);
  end_date := c.start_date + (c.duration_days - 1);

  if today < c.start_date or today > end_date then
    return;
  end if;

  select count(distinct problem_slug)::int into solved
  from public.submissions
  where user_id = p_user_id
    and status = 'pass'
    and public.date_in_zone(solved_at, c.timezone) = today;

  insert into public.streak_days (challenge_id, local_date, problems_solved)
  values (c.id, today, solved)
  on conflict (challenge_id, local_date) do update
    set problems_solved = excluded.problems_solved;

  select outcome into prev_outcome
  from public.streak_days
  where challenge_id = c.id and local_date = today;

  if prev_outcome <> 'pending' then
    return;
  end if;

  if solved < c.daily_quota then
    return;
  end if;

  update public.streak_days
  set outcome = 'confirmed'
  where challenge_id = c.id and local_date = today;

  if c.confirmed_toward_freeze >= 2 then
    update public.streak_challenges
    set confirmed_toward_freeze = 0
    where id = c.id;
    perform public.award_streak_freeze(p_user_id);
  else
    update public.streak_challenges
    set confirmed_toward_freeze = confirmed_toward_freeze + 1
    where id = c.id;
  end if;

  if today = end_date then
    update public.streak_challenges
    set status = 'completed', ended_at = now()
    where id = c.id;
  end if;
end;
$$;

create or replace function public.on_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.tick_user_goal_streak(new.user_id);
  if new.status = 'pass' then
    perform public.apply_pass_to_goal_streak(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_submission_insert_streak on public.submissions;
create trigger on_submission_insert_streak
  after insert on public.submissions
  for each row execute procedure public.on_submission_insert();

-- ---------------------------------------------------------------------------
-- RPCs (called from Next.js)
-- ---------------------------------------------------------------------------

create or replace function public.start_goal_streak(
  p_duration_days int,
  p_daily_quota int,
  p_timezone text
)
returns public.streak_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date;
  new_row public.streak_challenges;
  i int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 365 then
    raise exception 'duration_days must be between 1 and 365';
  end if;

  if p_daily_quota is null or p_daily_quota < 1 or p_daily_quota > 20 then
    raise exception 'daily_quota must be between 1 and 20';
  end if;

  if p_timezone is null or length(trim(p_timezone)) = 0 or length(p_timezone) > 64 then
    raise exception 'Invalid timezone';
  end if;

  -- Raises if IANA name is unknown.
  perform timezone(p_timezone, now());

  if exists (
    select 1 from public.streak_challenges
    where user_id = uid and status = 'active'
  ) then
    raise exception 'An active streak already exists';
  end if;

  today := public.date_in_zone(now(), p_timezone);

  update public.profiles
  set timezone = p_timezone
  where id = uid;

  insert into public.streak_challenges (
    user_id, duration_days, daily_quota, start_date, timezone, status
  )
  values (uid, p_duration_days, p_daily_quota, today, p_timezone, 'active')
  returning * into new_row;

  for i in 0 .. p_duration_days - 1 loop
    insert into public.streak_days (challenge_id, local_date)
    values (new_row.id, today + i)
    on conflict (challenge_id, local_date) do nothing;
  end loop;

  return new_row;
end;
$$;

create or replace function public.cancel_goal_streak()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.streak_challenges
  set status = 'cancelled', ended_at = now()
  where user_id = uid and status = 'active';
end;
$$;

create or replace function public.tick_my_goal_streak()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform public.tick_user_goal_streak(auth.uid());
end;
$$;

create or replace function public.tick_goal_streaks()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
begin
  for r in
    select user_id from public.streak_challenges where status = 'active'
  loop
    perform public.tick_user_goal_streak(r.user_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.start_goal_streak(int, int, text) from public;
revoke all on function public.cancel_goal_streak() from public;
revoke all on function public.tick_my_goal_streak() from public;
revoke all on function public.tick_user_goal_streak(uuid) from public;
revoke all on function public.tick_goal_streaks() from public;
revoke all on function public.apply_pass_to_goal_streak(uuid) from public;
revoke all on function public.award_streak_freeze(uuid) from public;

grant execute on function public.date_in_zone(timestamptz, text) to public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.start_goal_streak(int, int, text) to authenticated;
    grant execute on function public.cancel_goal_streak() to authenticated;
    grant execute on function public.tick_my_goal_streak() to authenticated;
    grant execute on function public.date_in_zone(timestamptz, text) to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.date_in_zone(timestamptz, text) to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.tick_goal_streaks() to service_role;
    grant execute on function public.tick_user_goal_streak(uuid) to service_role;
  end if;
end $$;
