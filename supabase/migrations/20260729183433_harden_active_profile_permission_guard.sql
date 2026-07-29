-- Require an active profile at the shared organization permission boundary.
-- Keep the existing signature, role grants and permission semantics unchanged.

create or replace function public.has_org_permission(
  p_organization_id uuid,
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.profiles p on p.id = om.profile_id
    join public.membership_roles mr on mr.membership_id = om.id
    join public.roles r on r.id = mr.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions perm on perm.id = rp.permission_id
    where p.auth_user_id = auth.uid()
      and p.status = 'ACTIVE'
      and om.organization_id = p_organization_id
      and om.status = 'ACTIVE'
      and r.status = 'ACTIVE'
      and perm.code = p_permission_code
  )
$$;

revoke execute on function public.has_org_permission(uuid, text)
  from public, anon;
grant execute on function public.has_org_permission(uuid, text)
  to authenticated;
