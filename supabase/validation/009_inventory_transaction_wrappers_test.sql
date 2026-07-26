\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa51',
    'authenticated',
    'authenticated',
    'inventory-wrapper-user-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa52',
    'authenticated',
    'authenticated',
    'inventory-wrapper-user-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51', 'Inventory Wrapper Org A', 'inventory-wrapper-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52', 'Inventory Wrapper Org B', 'inventory-wrapper-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc51',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa51',
    'Inventory Wrapper User A',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc52',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa52',
    'Inventory Wrapper User B',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id,
  organization_id,
  profile_id,
  status,
  is_default,
  joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd51',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
    'cccccccc-cccc-cccc-cccc-cccccccccc51',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd52',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52',
    'cccccccc-cccc-cccc-cccc-cccccccccc52',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777751',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
    'inventory_wrapper_adjuster',
    'Inventory Wrapper Adjuster',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777752',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52',
    'inventory_wrapper_viewer',
    'Inventory Wrapper Viewer',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777751'::uuid, id
from public.permissions
where code in ('inventory.adjust', 'inventory.view', 'order.edit');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777752'::uuid, id
from public.permissions
where code = 'inventory.view';

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd51',
    '77777777-7777-7777-7777-777777777751'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd52',
    '77777777-7777-7777-7777-777777777752'
  );

insert into public.products (
  id,
  organization_id,
  product_code,
  name,
  status
) values
  (
    '11111111-1111-1111-1111-111111111151',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
    'IW-PROD-A',
    'Inventory Wrapper Product A',
    'ACTIVE'
  ),
  (
    '11111111-1111-1111-1111-111111111152',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52',
    'IW-PROD-B',
    'Inventory Wrapper Product B',
    'ACTIVE'
  );

insert into public.product_variants (
  id,
  organization_id,
  product_id,
  stock_code,
  variant_name,
  base_price,
  cost_price,
  status
) values
  (
    '22222222-2222-2222-2222-222222222251',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
    '11111111-1111-1111-1111-111111111151',
    'IW-SKU-A',
    'Inventory Wrapper SKU A',
    100,
    60,
    'ACTIVE'
  ),
  (
    '22222222-2222-2222-2222-222222222252',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52',
    '11111111-1111-1111-1111-111111111152',
    'IW-SKU-B',
    'Inventory Wrapper SKU B',
    100,
    60,
    'ACTIVE'
  );

insert into public.warehouses (
  id,
  organization_id,
  code,
  name,
  status
) values
  (
    '88888888-8888-8888-8888-888888888851',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
    'IW-WH-A',
    'Inventory Wrapper Warehouse A',
    'ACTIVE'
  ),
  (
    '88888888-8888-8888-8888-888888888852',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52',
    'IW-WH-B',
    'Inventory Wrapper Warehouse B',
    'ACTIVE'
  );

insert into public.customers (
  id,
  organization_id,
  customer_code,
  display_name,
  status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee51',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
  'IW-CUST-A',
  'Inventory Wrapper Customer A',
  'ACTIVE'
);

insert into public.orders (
  id,
  organization_id,
  customer_id,
  order_number,
  source,
  order_status
) values (
  '99999999-9999-9999-9999-999999999951',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee51',
  'IW-ORDER-A',
  'TEST',
  'DRAFT'
);

insert into public.order_items (
  id,
  organization_id,
  order_id,
  variant_id,
  sku_snapshot,
  product_name_snapshot,
  variant_name_snapshot,
  quantity,
  original_unit_price,
  applied_unit_price,
  line_total
) values (
  '66666666-6666-6666-6666-666666666651',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51',
  '99999999-9999-9999-9999-999999999951',
  '22222222-2222-2222-2222-222222222251',
  'IW-SKU-A',
  'Inventory Wrapper Product A',
  'Inventory Wrapper SKU A',
  1,
  100,
  100,
  100
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa51',
  true
);

do $$
declare
  v_movement_id uuid;
  v_reservation_id uuid;
  v_release_reservation_id uuid;
  v_allocation_id uuid;
  v_on_hand numeric;
  v_reserved numeric;
  v_allocated numeric;
  v_available numeric;
  v_created_by uuid;
begin
  v_movement_id := public.api_post_inventory_movement(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51'::uuid,
    '88888888-8888-8888-8888-888888888851'::uuid,
    '22222222-2222-2222-2222-222222222251'::uuid,
    'ADJUSTMENT',
    10,
    'TEST',
    null,
    'Inventory wrapper initial stock'
  );

  if v_movement_id is null then
    raise exception 'api_post_inventory_movement returned null';
  end if;

  select created_by
  into v_created_by
  from public.inventory_movements
  where id = v_movement_id;

  if v_created_by <> 'cccccccc-cccc-cccc-cccc-cccccccccc51'::uuid then
    raise exception 'api_post_inventory_movement did not stamp current profile';
  end if;

  v_reservation_id := public.api_reserve_inventory(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51'::uuid,
    '88888888-8888-8888-8888-888888888851'::uuid,
    '22222222-2222-2222-2222-222222222251'::uuid,
    null,
    3,
    now() + interval '1 hour'
  );

  v_release_reservation_id := public.api_reserve_inventory(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51'::uuid,
    '88888888-8888-8888-8888-888888888851'::uuid,
    '22222222-2222-2222-2222-222222222251'::uuid,
    null,
    2,
    now() + interval '1 hour'
  );

  perform public.api_release_inventory_reservation(v_release_reservation_id);

  v_allocation_id := public.api_convert_reservation_to_allocation(
    v_reservation_id,
    '99999999-9999-9999-9999-999999999951'::uuid,
    '66666666-6666-6666-6666-666666666651'::uuid
  );

  if v_allocation_id is null then
    raise exception 'api_convert_reservation_to_allocation returned null';
  end if;

  select on_hand, reserved, allocated, available
  into v_on_hand, v_reserved, v_allocated, v_available
  from public.inventory_balances
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51'::uuid
    and warehouse_id = '88888888-8888-8888-8888-888888888851'::uuid
    and variant_id = '22222222-2222-2222-2222-222222222251'::uuid;

  if v_on_hand <> 10 or v_reserved <> 0 or v_allocated <> 3 or v_available <> 7 then
    raise exception
      'unexpected balance after wrappers: on_hand %, reserved %, allocated %, available %',
      v_on_hand,
      v_reserved,
      v_allocated,
      v_available;
  end if;

  begin
    perform public.post_inventory_movement(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb51'::uuid,
      '88888888-8888-8888-8888-888888888851'::uuid,
      '22222222-2222-2222-2222-222222222251'::uuid,
      'ADJUSTMENT',
      1,
      'TEST',
      null,
      'Low-level direct call should fail',
      'cccccccc-cccc-cccc-cccc-cccccccccc51'::uuid
    );

    raise exception 'low-level post_inventory_movement unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_post_inventory_movement(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52'::uuid,
      '88888888-8888-8888-8888-888888888852'::uuid,
      '22222222-2222-2222-2222-222222222252'::uuid,
      'ADJUSTMENT',
      1,
      'TEST',
      null,
      'Cross-tenant wrapper call should fail'
    );

    raise exception 'cross-tenant wrapper call unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa52',
  true
);

do $$
begin
  begin
    perform public.api_post_inventory_movement(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb52'::uuid,
      '88888888-8888-8888-8888-888888888852'::uuid,
      '22222222-2222-2222-2222-222222222252'::uuid,
      'ADJUSTMENT',
      1,
      'TEST',
      null,
      'Missing inventory.adjust should fail'
    );

    raise exception 'viewer wrapper call unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'inventory_transaction_wrappers' as check_name, 'pass' as result;

rollback;
