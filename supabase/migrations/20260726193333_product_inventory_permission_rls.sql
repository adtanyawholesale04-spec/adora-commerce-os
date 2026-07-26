-- ADORA Commerce OS (ACOS)
-- 038_product_inventory_permission_rls.sql
--
-- Purpose:
-- - Extend permission-aware RLS to product catalog and inventory core tables.
-- - Keep product variant cost columns private from browser/API roles for now.
-- - Keep inventory balances read-only and inventory movements append-only.

grant select, insert, update on table public.products to authenticated;

grant select (
  id,
  organization_id,
  product_id,
  stock_code,
  barcode,
  variant_name,
  base_price,
  weight_grams,
  width_cm,
  length_cm,
  height_cm,
  status,
  created_at,
  updated_at,
  archived_at
) on table public.product_variants to authenticated;

grant insert (
  id,
  organization_id,
  product_id,
  stock_code,
  barcode,
  variant_name,
  base_price,
  weight_grams,
  width_cm,
  length_cm,
  height_cm,
  status
) on table public.product_variants to authenticated;

grant update (
  stock_code,
  barcode,
  variant_name,
  base_price,
  weight_grams,
  width_cm,
  length_cm,
  height_cm,
  status,
  archived_at
) on table public.product_variants to authenticated;

grant select on table public.inventory_balances to authenticated;
grant select, insert on table public.inventory_movements to authenticated;

drop policy if exists products_permission_select on public.products;
create policy products_permission_select
on public.products
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'product.view'));

drop policy if exists products_permission_insert on public.products;
create policy products_permission_insert
on public.products
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'product.create'));

drop policy if exists products_permission_update on public.products;
create policy products_permission_update
on public.products
as restrictive
for update
to authenticated
using (public.has_org_permission(organization_id, 'product.edit'))
with check (public.has_org_permission(organization_id, 'product.edit'));

drop policy if exists product_variants_permission_select on public.product_variants;
create policy product_variants_permission_select
on public.product_variants
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'product.view'));

drop policy if exists product_variants_permission_insert on public.product_variants;
create policy product_variants_permission_insert
on public.product_variants
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'product.create'));

drop policy if exists product_variants_permission_update on public.product_variants;
create policy product_variants_permission_update
on public.product_variants
as restrictive
for update
to authenticated
using (public.has_org_permission(organization_id, 'product.edit'))
with check (public.has_org_permission(organization_id, 'product.edit'));

drop policy if exists inventory_balances_permission_select on public.inventory_balances;
create policy inventory_balances_permission_select
on public.inventory_balances
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'inventory.view'));

drop policy if exists inventory_movements_permission_select on public.inventory_movements;
create policy inventory_movements_permission_select
on public.inventory_movements
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'inventory.view'));

drop policy if exists inventory_movements_permission_insert on public.inventory_movements;
create policy inventory_movements_permission_insert
on public.inventory_movements
as restrictive
for insert
to authenticated
with check (public.has_org_permission(organization_id, 'inventory.adjust'));
