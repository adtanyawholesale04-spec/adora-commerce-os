-- ADORA Commerce OS (ACOS)
-- 039_inventory_transaction_wrappers.sql
--
-- Purpose:
-- - Expose guarded inventory transaction RPC functions to authenticated users.
-- - Keep low-level transaction functions unavailable to browser/API roles.
-- - Require active auth + organization permission before privileged mutations.

create or replace function public.api_reserve_inventory(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_variant_id uuid,
  p_cart_id uuid,
  p_quantity numeric,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'inventory.adjust') then
    raise exception 'Missing permission: inventory.adjust' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.warehouses w
    where w.organization_id = p_organization_id
      and w.id = p_warehouse_id
  ) then
    raise exception 'Warehouse does not belong to organization' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.product_variants pv
    where pv.organization_id = p_organization_id
      and pv.id = p_variant_id
  ) then
    raise exception 'Product variant does not belong to organization' using errcode = '42501';
  end if;

  if p_cart_id is not null and not exists (
    select 1
    from public.carts c
    where c.organization_id = p_organization_id
      and c.id = p_cart_id
  ) then
    raise exception 'Cart does not belong to organization' using errcode = '42501';
  end if;

  return public.reserve_inventory(
    p_organization_id,
    p_warehouse_id,
    p_variant_id,
    p_cart_id,
    p_quantity,
    p_expires_at
  );
end;
$$;

create or replace function public.api_release_inventory_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select ir.organization_id
  into v_organization_id
  from public.inventory_reservations ir
  where ir.id = p_reservation_id;

  if v_organization_id is null then
    raise exception 'Inventory reservation not found';
  end if;

  if not public.has_org_permission(v_organization_id, 'inventory.adjust') then
    raise exception 'Missing permission: inventory.adjust' using errcode = '42501';
  end if;

  perform public.release_inventory_reservation(p_reservation_id);
end;
$$;

create or replace function public.api_convert_reservation_to_allocation(
  p_reservation_id uuid,
  p_order_id uuid,
  p_order_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select ir.organization_id
  into v_organization_id
  from public.inventory_reservations ir
  where ir.id = p_reservation_id;

  if v_organization_id is null then
    raise exception 'Inventory reservation not found';
  end if;

  if not public.has_org_permission(v_organization_id, 'inventory.adjust') then
    raise exception 'Missing permission: inventory.adjust' using errcode = '42501';
  end if;

  if not public.has_org_permission(v_organization_id, 'order.edit') then
    raise exception 'Missing permission: order.edit' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.orders o
    where o.organization_id = v_organization_id
      and o.id = p_order_id
  ) then
    raise exception 'Order does not belong to reservation organization' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.order_items oi
    where oi.organization_id = v_organization_id
      and oi.id = p_order_item_id
      and oi.order_id = p_order_id
  ) then
    raise exception 'Order item does not belong to order' using errcode = '42501';
  end if;

  return public.convert_reservation_to_allocation(
    p_reservation_id,
    p_order_id,
    p_order_item_id
  );
end;
$$;

create or replace function public.api_post_inventory_movement(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_variant_id uuid,
  p_movement_type varchar,
  p_quantity_delta numeric,
  p_reference_type varchar default null,
  p_reference_id uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'inventory.adjust') then
    raise exception 'Missing permission: inventory.adjust' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.warehouses w
    where w.organization_id = p_organization_id
      and w.id = p_warehouse_id
  ) then
    raise exception 'Warehouse does not belong to organization' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.product_variants pv
    where pv.organization_id = p_organization_id
      and pv.id = p_variant_id
  ) then
    raise exception 'Product variant does not belong to organization' using errcode = '42501';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  return public.post_inventory_movement(
    p_organization_id,
    p_warehouse_id,
    p_variant_id,
    p_movement_type,
    p_quantity_delta,
    p_reference_type,
    p_reference_id,
    p_reason,
    v_profile_id
  );
end;
$$;

revoke execute on function public.api_reserve_inventory(uuid, uuid, uuid, uuid, numeric, timestamptz)
  from public, anon;
revoke execute on function public.api_release_inventory_reservation(uuid)
  from public, anon;
revoke execute on function public.api_convert_reservation_to_allocation(uuid, uuid, uuid)
  from public, anon;
revoke execute on function public.api_post_inventory_movement(uuid, uuid, uuid, varchar, numeric, varchar, uuid, text)
  from public, anon;

grant execute on function public.api_reserve_inventory(uuid, uuid, uuid, uuid, numeric, timestamptz)
  to authenticated;
grant execute on function public.api_release_inventory_reservation(uuid)
  to authenticated;
grant execute on function public.api_convert_reservation_to_allocation(uuid, uuid, uuid)
  to authenticated;
grant execute on function public.api_post_inventory_movement(uuid, uuid, uuid, varchar, numeric, varchar, uuid, text)
  to authenticated;
