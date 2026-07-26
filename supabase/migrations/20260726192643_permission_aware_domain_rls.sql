-- ADORA Commerce OS (ACOS)
-- 037_permission_aware_domain_rls.sql
--
-- Purpose:
-- - Add action-level permissions on top of existing organization membership RLS.
-- - Explicitly expose selected domain tables to authenticated Data API users.
--
-- Existing tenant policies still require public.is_org_member(organization_id).
-- The restrictive policies below are ANDed with those permissive tenant policies.

grant select, insert, update on table public.customers to authenticated;
grant select, insert, update on table public.purchase_sessions to authenticated;
grant select, insert, update on table public.orders to authenticated;
grant select, insert, update on table public.warehouses to authenticated;

drop policy if exists customers_permission_select on public.customers;
create policy customers_permission_select
on public.customers
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'customer.view'));

drop policy if exists customers_permission_insert on public.customers;
create policy customers_permission_insert
on public.customers
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'customer.edit'));

drop policy if exists customers_permission_update on public.customers;
create policy customers_permission_update
on public.customers
as restrictive
for update
to authenticated
using (public.has_org_permission(organization_id, 'customer.edit'))
with check (public.has_org_permission(organization_id, 'customer.edit'));

drop policy if exists purchase_sessions_permission_select on public.purchase_sessions;
create policy purchase_sessions_permission_select
on public.purchase_sessions
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'order.view'));

drop policy if exists purchase_sessions_permission_insert on public.purchase_sessions;
create policy purchase_sessions_permission_insert
on public.purchase_sessions
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'order.create'));

drop policy if exists purchase_sessions_permission_update on public.purchase_sessions;
create policy purchase_sessions_permission_update
on public.purchase_sessions
as restrictive
for update
to authenticated
using (public.has_org_permission(organization_id, 'order.edit'))
with check (public.has_org_permission(organization_id, 'order.edit'));

drop policy if exists orders_permission_select on public.orders;
create policy orders_permission_select
on public.orders
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'order.view'));

drop policy if exists orders_permission_insert on public.orders;
create policy orders_permission_insert
on public.orders
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'order.create'));

drop policy if exists orders_permission_update on public.orders;
create policy orders_permission_update
on public.orders
as restrictive
for update
to authenticated
using (public.has_org_permission(organization_id, 'order.edit'))
with check (public.has_org_permission(organization_id, 'order.edit'));

drop policy if exists warehouses_permission_select on public.warehouses;
create policy warehouses_permission_select
on public.warehouses
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'inventory.view'));

drop policy if exists warehouses_permission_insert on public.warehouses;
create policy warehouses_permission_insert
on public.warehouses
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'inventory.adjust'));

drop policy if exists warehouses_permission_update on public.warehouses;
create policy warehouses_permission_update
on public.warehouses
as restrictive
for update
to authenticated
using (public.has_org_permission(organization_id, 'inventory.adjust'))
with check (public.has_org_permission(organization_id, 'inventory.adjust'));
