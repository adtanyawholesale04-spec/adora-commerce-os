-- ADORA Commerce OS (ACOS)
-- 035_security_rls_hardening.sql
--
-- Purpose:
-- - Enable RLS on public tables flagged by Supabase advisory.
-- - Add conservative read policies for relationship/catalog tables.
-- - Restrict default EXECUTE privileges on public SECURITY DEFINER functions.

alter table public.organizations enable row level security;
alter table public.membership_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.plan_features enable row level security;
alter table public.conversation_orders enable row level security;
alter table public.purchase_session_orders enable row level security;

create policy organizations_member_select
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

create policy membership_roles_member_select
on public.membership_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = membership_roles.membership_id
      and public.is_org_member(om.organization_id)
  )
);

create policy role_permissions_member_select
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.roles r
    where r.id = role_permissions.role_id
      and public.is_org_member(r.organization_id)
  )
);

create policy plan_features_authenticated_select
on public.plan_features
for select
to authenticated
using (
  exists (
    select 1
    from public.plans p
    where p.id = plan_features.plan_id
      and p.status = 'ACTIVE'
  )
);

create policy conversation_orders_member_select
on public.conversation_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_orders.conversation_id
      and public.is_org_member(c.organization_id)
  )
);

create policy purchase_session_orders_member_select
on public.purchase_session_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.purchase_sessions ps
    where ps.id = purchase_session_orders.purchase_session_id
      and public.is_org_member(ps.organization_id)
  )
);

-- SECURITY DEFINER helpers used by RLS policies should not retain default
-- PUBLIC execute privileges. Grant only the role needed for authenticated
-- application access.
revoke execute on function public.current_profile_id() from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_org_permission(uuid, text) from public, anon;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_permission(uuid, text) to authenticated;

-- Transaction-critical SECURITY DEFINER functions currently do not enforce
-- business permissions internally. Keep them unavailable to browser roles
-- until server-side wrappers or permission checks are implemented.
revoke execute on function public.next_document_number(uuid, varchar, varchar, varchar)
  from public, anon, authenticated;
revoke execute on function public.reserve_inventory(uuid, uuid, uuid, uuid, numeric, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.release_inventory_reservation(uuid)
  from public, anon, authenticated;
revoke execute on function public.convert_reservation_to_allocation(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.post_inventory_movement(uuid, uuid, uuid, varchar, numeric, varchar, uuid, text, uuid)
  from public, anon, authenticated;
