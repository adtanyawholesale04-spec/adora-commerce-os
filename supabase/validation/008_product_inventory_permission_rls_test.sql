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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa41',
    'authenticated',
    'authenticated',
    'product-inventory-user-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa42',
    'authenticated',
    'authenticated',
    'product-inventory-user-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41', 'Product Inventory Org A', 'product-inventory-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'Product Inventory Org B', 'product-inventory-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc41',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa41',
    'Product Inventory User A',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc42',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa42',
    'Product Inventory User B',
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
    'dddddddd-dddd-dddd-dddd-dddddddddd41',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    'cccccccc-cccc-cccc-cccc-cccccccccc41',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd42',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    'cccccccc-cccc-cccc-cccc-cccccccccc42',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777741',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    'product_inventory_operator',
    'Product Inventory Operator',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777742',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    'product_inventory_operator',
    'Product Inventory Operator',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.id in (
    '77777777-7777-7777-7777-777777777741'::uuid,
    '77777777-7777-7777-7777-777777777742'::uuid
  )
  and p.code in (
    'product.view',
    'product.create',
    'product.edit',
    'inventory.view',
    'inventory.adjust'
  );

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd41',
    '77777777-7777-7777-7777-777777777741'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd42',
    '77777777-7777-7777-7777-777777777742'
  );

insert into public.products (
  id,
  organization_id,
  product_code,
  name,
  status
) values
  (
    '11111111-1111-1111-1111-111111111141',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    'PI-PROD-A',
    'Product Inventory Product A',
    'ACTIVE'
  ),
  (
    '11111111-1111-1111-1111-111111111142',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    'PI-PROD-B',
    'Product Inventory Product B',
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
  minimum_selling_price,
  status
) values
  (
    '22222222-2222-2222-2222-222222222241',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    '11111111-1111-1111-1111-111111111141',
    'PI-SKU-A',
    'Product Inventory SKU A',
    100,
    60,
    80,
    'ACTIVE'
  ),
  (
    '22222222-2222-2222-2222-222222222242',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    '11111111-1111-1111-1111-111111111142',
    'PI-SKU-B',
    'Product Inventory SKU B',
    100,
    60,
    80,
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
    '88888888-8888-8888-8888-888888888841',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    'PI-WH-A',
    'Product Inventory Warehouse A',
    'ACTIVE'
  ),
  (
    '88888888-8888-8888-8888-888888888842',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    'PI-WH-B',
    'Product Inventory Warehouse B',
    'ACTIVE'
  );

insert into public.inventory_balances (
  id,
  organization_id,
  warehouse_id,
  variant_id,
  on_hand,
  reserved,
  allocated,
  available
) values
  (
    '33333333-3333-3333-3333-333333333341',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    '88888888-8888-8888-8888-888888888841',
    '22222222-2222-2222-2222-222222222241',
    10,
    2,
    1,
    7
  ),
  (
    '33333333-3333-3333-3333-333333333342',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    '88888888-8888-8888-8888-888888888842',
    '22222222-2222-2222-2222-222222222242',
    10,
    2,
    1,
    7
  );

insert into public.inventory_movements (
  id,
  organization_id,
  warehouse_id,
  variant_id,
  movement_type,
  quantity_delta,
  reference_type,
  reason
) values
  (
    '44444444-4444-4444-4444-444444444441',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    '88888888-8888-8888-8888-888888888841',
    '22222222-2222-2222-2222-222222222241',
    'ADJUSTMENT',
    10,
    'TEST',
    'Product inventory RLS fixture A'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
    '88888888-8888-8888-8888-888888888842',
    '22222222-2222-2222-2222-222222222242',
    'ADJUSTMENT',
    10,
    'TEST',
    'Product inventory RLS fixture B'
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa41',
  true
);

do $$
declare
  v_count integer;
  v_rows integer;
begin
  select count(*) into v_count
  from public.products
  where product_code in ('PI-PROD-A', 'PI-PROD-B');

  if v_count <> 1 then
    raise exception 'user A product RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.product_variants
  where stock_code in ('PI-SKU-A', 'PI-SKU-B');

  if v_count <> 1 then
    raise exception 'user A variant RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.inventory_balances
  where variant_id in (
    '22222222-2222-2222-2222-222222222241'::uuid,
    '22222222-2222-2222-2222-222222222242'::uuid
  );

  if v_count <> 1 then
    raise exception 'user A inventory balance RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.inventory_movements
  where id in (
    '44444444-4444-4444-4444-444444444441'::uuid,
    '44444444-4444-4444-4444-444444444442'::uuid
  );

  if v_count <> 1 then
    raise exception 'user A inventory movement RLS count expected 1, got %', v_count;
  end if;

  begin
    perform cost_price
    from public.product_variants
    where id = '22222222-2222-2222-2222-222222222241'::uuid;

    raise exception 'user A cost_price select unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  insert into public.products (
    id,
    organization_id,
    product_code,
    name,
    status
  ) values (
    '11111111-1111-1111-1111-111111111143',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    'PI-PROD-A-INSERT',
    'Product Inventory Product A Insert',
    'ACTIVE'
  );

  insert into public.product_variants (
    id,
    organization_id,
    product_id,
    stock_code,
    variant_name,
    base_price,
    status
  ) values (
    '22222222-2222-2222-2222-222222222243',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    '11111111-1111-1111-1111-111111111143',
    'PI-SKU-A-INSERT',
    'Product Inventory SKU A Insert',
    120,
    'ACTIVE'
  );

  insert into public.inventory_movements (
    id,
    organization_id,
    warehouse_id,
    variant_id,
    movement_type,
    quantity_delta,
    reference_type,
    reason
  ) values (
    '44444444-4444-4444-4444-444444444443',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41',
    '88888888-8888-8888-8888-888888888841',
    '22222222-2222-2222-2222-222222222241',
    'ADJUSTMENT',
    5,
    'TEST',
    'Product inventory own movement insert'
  );

  begin
    insert into public.products (
      id,
      organization_id,
      product_code,
      name,
      status
    ) values (
      '11111111-1111-1111-1111-111111111144',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
      'PI-PROD-B-CROSS',
      'Product Inventory Product B Cross',
      'ACTIVE'
    );

    raise exception 'user A cross-tenant product insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.inventory_movements (
      id,
      organization_id,
      warehouse_id,
      variant_id,
      movement_type,
      quantity_delta,
      reference_type,
      reason
    ) values (
      '44444444-4444-4444-4444-444444444444',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42',
      '88888888-8888-8888-8888-888888888842',
      '22222222-2222-2222-2222-222222222242',
      'ADJUSTMENT',
      5,
      'TEST',
      'Product inventory cross movement insert'
    );

    raise exception 'user A cross-tenant inventory movement insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  update public.products
  set name = 'Product Inventory Product A Updated'
  where id = '11111111-1111-1111-1111-111111111141'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'user A own product update expected 1 row, got %', v_rows;
  end if;

  update public.product_variants
  set variant_name = 'Product Inventory SKU A Updated'
  where id = '22222222-2222-2222-2222-222222222241'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'user A own variant update expected 1 row, got %', v_rows;
  end if;

  update public.products
  set name = 'Product Inventory Product B Cross Update'
  where id = '11111111-1111-1111-1111-111111111142'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 0 then
    raise exception 'user A cross-tenant product update expected 0 rows, got %', v_rows;
  end if;

  begin
    update public.inventory_balances
    set on_hand = 20
    where id = '33333333-3333-3333-3333-333333333341'::uuid;

    raise exception 'user A inventory balance update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.inventory_movements
    set reason = 'Product inventory movement update denied'
    where id = '44444444-4444-4444-4444-444444444441'::uuid;

    raise exception 'user A inventory movement update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa42',
  true
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.products
  where product_code in ('PI-PROD-A', 'PI-PROD-B');

  if v_count <> 1 then
    raise exception 'user B product RLS count expected 1, got %', v_count;
  end if;

  if exists (
    select 1
    from public.inventory_balances
    where id = '33333333-3333-3333-3333-333333333341'::uuid
  ) then
    raise exception 'user B can see user A inventory balance';
  end if;

  if not exists (
    select 1
    from public.inventory_balances
    where id = '33333333-3333-3333-3333-333333333342'::uuid
  ) then
    raise exception 'user B cannot see own inventory balance';
  end if;
end $$;

reset role;

select 'product_inventory_permission_rls' as check_name, 'pass' as result;

rollback;
