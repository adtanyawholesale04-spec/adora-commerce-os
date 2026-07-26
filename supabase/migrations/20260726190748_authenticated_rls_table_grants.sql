-- ADORA Commerce OS (ACOS)
-- 036_authenticated_rls_table_grants.sql
--
-- Purpose:
-- - Allow authenticated browser/API roles to reach core identity tables.
-- - Keep row visibility constrained by existing RLS policies.

revoke select on table public.profiles from anon;
revoke select on table public.organization_memberships from anon;
revoke select on table public.organizations from anon;

grant select on table public.profiles to authenticated;
grant select on table public.organization_memberships to authenticated;
grant select on table public.organizations to authenticated;
