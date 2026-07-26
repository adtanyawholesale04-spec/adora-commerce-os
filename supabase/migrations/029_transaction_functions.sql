-- ADORA Commerce OS (ACOS)
-- 029_transaction_functions.sql

create or replace function public.reserve_inventory(
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
declare
  v_balance public.inventory_balances%rowtype;
  v_reservation_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'Reservation quantity must be greater than zero';
  end if;

  select *
  into v_balance
  from public.inventory_balances
  where organization_id = p_organization_id
    and warehouse_id = p_warehouse_id
    and variant_id = p_variant_id
  for update;

  if not found then
    raise exception 'Inventory balance row not found';
  end if;

  if v_balance.available < p_quantity then
    raise exception 'Insufficient available inventory';
  end if;

  insert into public.inventory_reservations (
    organization_id, warehouse_id, variant_id, cart_id,
    quantity, status, reserved_at, expires_at
  ) values (
    p_organization_id, p_warehouse_id, p_variant_id, p_cart_id,
    p_quantity, 'ACTIVE', now(), p_expires_at
  )
  returning id into v_reservation_id;

  update public.inventory_balances
  set reserved = reserved + p_quantity,
      available = available - p_quantity,
      updated_at = now()
  where id = v_balance.id;

  return v_reservation_id;
end;
$$;

create or replace function public.release_inventory_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.inventory_reservations%rowtype;
begin
  select * into v_res
  from public.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found or v_res.status <> 'ACTIVE' then
    raise exception 'Active reservation not found';
  end if;

  update public.inventory_reservations
  set status = 'RELEASED', released_at = now()
  where id = v_res.id;

  update public.inventory_balances
  set reserved = reserved - v_res.quantity,
      available = available + v_res.quantity,
      updated_at = now()
  where organization_id = v_res.organization_id
    and warehouse_id = v_res.warehouse_id
    and variant_id = v_res.variant_id;
end;
$$;

create or replace function public.convert_reservation_to_allocation(
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
  v_res public.inventory_reservations%rowtype;
  v_allocation_id uuid;
begin
  select * into v_res
  from public.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found or v_res.status <> 'ACTIVE' then
    raise exception 'Active reservation not found';
  end if;

  insert into public.inventory_allocations (
    organization_id, warehouse_id, variant_id,
    order_id, order_item_id, quantity, status, allocated_at
  ) values (
    v_res.organization_id, v_res.warehouse_id, v_res.variant_id,
    p_order_id, p_order_item_id, v_res.quantity, 'ACTIVE', now()
  )
  returning id into v_allocation_id;

  update public.inventory_reservations
  set status = 'CONVERTED', released_at = now(), order_id = p_order_id
  where id = v_res.id;

  update public.inventory_balances
  set reserved = reserved - v_res.quantity,
      allocated = allocated + v_res.quantity,
      updated_at = now()
  where organization_id = v_res.organization_id
    and warehouse_id = v_res.warehouse_id
    and variant_id = v_res.variant_id;

  return v_allocation_id;
end;
$$;

create or replace function public.post_inventory_movement(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_variant_id uuid,
  p_movement_type varchar,
  p_quantity_delta numeric,
  p_reference_type varchar default null,
  p_reference_id uuid default null,
  p_reason text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_quantity_delta = 0 then
    raise exception 'Inventory movement cannot be zero';
  end if;

  insert into public.inventory_movements (
    organization_id, warehouse_id, variant_id,
    movement_type, quantity_delta, reference_type, reference_id, reason, created_by
  ) values (
    p_organization_id, p_warehouse_id, p_variant_id,
    p_movement_type, p_quantity_delta, p_reference_type, p_reference_id, p_reason, p_created_by
  )
  returning id into v_id;

  insert into public.inventory_balances (
    organization_id, warehouse_id, variant_id,
    on_hand, reserved, allocated, available
  ) values (
    p_organization_id, p_warehouse_id, p_variant_id,
    p_quantity_delta, 0, 0, p_quantity_delta
  )
  on conflict (organization_id, warehouse_id, variant_id)
  do update set
    on_hand = public.inventory_balances.on_hand + excluded.on_hand,
    available = public.inventory_balances.available + excluded.on_hand,
    updated_at = now();

  return v_id;
end;
$$;
