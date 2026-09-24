-- Explicit Data API grants for tables created before Supabase stopped
-- auto-granting public tables (2026-10-30). Existing production grants are
-- kept; this makes a fresh `supabase db reset` / preview branch reachable.
-- Roles are absent on plain Docker Postgres, so the block is a no-op there.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated')
     and exists (select 1 from pg_roles where rolname = 'service_role') then

    alter default privileges for role postgres in schema public
      revoke select, insert, update, delete on tables from anon, authenticated, service_role;

    alter default privileges for role postgres in schema public
      revoke usage, select on sequences from anon, authenticated, service_role;

    grant select on public.profiles to anon;
    grant select, insert, update, delete on public.profiles to authenticated;
    grant select, insert, update, delete on public.profiles to service_role;

    grant select, insert on public.submissions to authenticated;
    grant select, insert, update, delete on public.submissions to service_role;

    grant select on public.user_stats to anon;
    grant select, insert, update, delete on public.user_stats to authenticated;
    grant select, insert, update, delete on public.user_stats to service_role;
  end if;
end $$;
