-- ADORA Commerce OS (ACOS)
-- Authenticated permission metadata grants
--
-- The tables remain protected by their existing tenant-scoped RLS policies.
-- These grants only allow authenticated sessions to reach the rows so RLS
-- can enforce the active organization boundary.

revoke select on table
  public.roles,
  public.role_permissions,
  public.membership_roles,
  public.permissions
from anon;

grant select on table
  public.roles,
  public.role_permissions,
  public.membership_roles,
  public.permissions
to authenticated;
