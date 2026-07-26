\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa121',
    'authenticated',
    'authenticated',
    'role-matrix-owner@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa122',
    'authenticated',
    'authenticated',
    'role-matrix-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa123',
    'authenticated',
    'authenticated',
    'role-matrix-warehouse@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa124',
    'authenticated',
    'authenticated',
    'role-matrix-support@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81', 'Role Matrix Org A', 'role-matrix-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb82', 'Role Matrix Org B', 'role-matrix-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc81',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa121',
    'Role Matrix Owner',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc82',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa122',
    'Role Matrix Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc83',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa123',
    'Role Matrix Warehouse',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc84',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa124',
    'Role Matrix Support',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd81',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'cccccccc-cccc-cccc-cccc-cccccccccc81',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd82',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'cccccccc-cccc-cccc-cccc-cccccccccc82',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd83',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'cccccccc-cccc-cccc-cccc-cccccccccc83',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd84',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'cccccccc-cccc-cccc-cccc-cccccccccc84',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777781',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'owner',
    'Owner',
    'ACTIVE',
    true
  ),
  (
    '77777777-7777-7777-7777-777777777782',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'manager',
    'Manager',
    'ACTIVE',
    true
  ),
  (
    '77777777-7777-7777-7777-777777777783',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'warehouse',
    'Warehouse',
    'ACTIVE',
    true
  ),
  (
    '77777777-7777-7777-7777-777777777784',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'support',
    'Support',
    'ACTIVE',
    true
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777781'::uuid, id
from public.permissions;

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777782'::uuid, id
from public.permissions
where code in (
  'product.view',
  'product.create',
  'product.edit',
  'customer.view',
  'customer.edit',
  'order.view',
  'order.create',
  'order.edit',
  'payment.view',
  'payment.verify',
  'return.view',
  'return.manage',
  'conversation.view',
  'conversation.assign',
  'report.view'
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777783'::uuid, id
from public.permissions
where code in (
  'product.view',
  'inventory.view',
  'inventory.adjust',
  'inventory.transfer',
  'warehouse.pick',
  'warehouse.qc',
  'warehouse.pack',
  'shipping.create',
  'shipping.print_label'
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777784'::uuid, id
from public.permissions
where code in (
  'customer.view',
  'order.view',
  'conversation.view',
  'conversation.reply'
);

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd81', '77777777-7777-7777-7777-777777777781'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd82', '77777777-7777-7777-7777-777777777782'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd83', '77777777-7777-7777-7777-777777777783'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd84', '77777777-7777-7777-7777-777777777784');

insert into public.channel_accounts (
  id, organization_id, provider, external_account_id, display_name, status
) values (
  '12121212-1212-1212-1212-121212121281',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  'LINE',
  'role-matrix-channel-a',
  'Role Matrix Channel A',
  'ACTIVE'
);

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee81',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  'RM-CUST-A',
  'Role Matrix Customer A',
  'ACTIVE'
);

insert into public.conversations (
  id, organization_id, channel_account_id, customer_id, external_conversation_id, status
) values (
  '13131313-1313-1313-1313-131313131381',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  '12121212-1212-1212-1212-121212121281',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee81',
  'role-matrix-conversation-a',
  'OPEN'
);

insert into public.products (
  id, organization_id, product_code, name, status
) values
  (
    '11111111-1111-1111-1111-111111111181',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'RM-PROD-A',
    'Role Matrix Product A',
    'ACTIVE'
  ),
  (
    '11111111-1111-1111-1111-111111111182',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb82',
    'RM-PROD-B',
    'Role Matrix Product B',
    'ACTIVE'
  );

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name, base_price, cost_price, status
) values (
  '22222222-2222-2222-2222-222222222281',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  '11111111-1111-1111-1111-111111111181',
  'RM-SKU-A',
  'Role Matrix SKU A',
  100,
  60,
  'ACTIVE'
);

insert into public.orders (
  id, organization_id, customer_id, order_number, source, order_status
) values (
  '99999999-9999-9999-9999-999999999981',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee81',
  'RM-ORDER-A',
  'TEST',
  'DRAFT'
);

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received
) values (
  '14141414-1414-1414-1414-141414141481',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  '99999999-9999-9999-9999-999999999981',
  'UNPAID',
  100,
  0
);

insert into public.warehouses (
  id, organization_id, code, name, status
) values (
  '88888888-8888-8888-8888-888888888881',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
  'RM-WH-A',
  'Role Matrix Warehouse A',
  'ACTIVE'
);

set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa121', true);

do $$
declare
  v_count integer;
  v_cost numeric;
begin
  if not public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'payment.refund') then
    raise exception 'owner should have payment.refund';
  end if;

  if not public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'warehouse.qc.override') then
    raise exception 'owner should have warehouse.qc.override';
  end if;

  select count(*) into v_count
  from public.products
  where product_code in ('RM-PROD-A', 'RM-PROD-B');

  if v_count <> 1 then
    raise exception 'owner product RLS cross-tenant count expected 1, got %', v_count;
  end if;

  select cost_price
  into v_cost
  from public.api_get_product_variant_cost(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    '22222222-2222-2222-2222-222222222281'::uuid
  );

  if v_cost <> 60 then
    raise exception 'owner cost wrapper expected 60, got %', v_cost;
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa122', true);

do $$
declare
  v_rows integer;
begin
  if not public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'payment.verify') then
    raise exception 'manager should have payment.verify';
  end if;

  if public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'product.cost.view') then
    raise exception 'manager should not have product.cost.view';
  end if;

  update public.products
  set name = 'Role Matrix Product A Manager Updated'
  where id = '11111111-1111-1111-1111-111111111181'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'manager product update expected 1 row, got %', v_rows;
  end if;

  update public.payments
  set status = 'PAID',
      amount_received = 100
  where id = '14141414-1414-1414-1414-141414141481'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'manager payment update expected 1 row, got %', v_rows;
  end if;

  begin
    perform *
    from public.api_get_product_variant_cost(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
      '22222222-2222-2222-2222-222222222281'::uuid
    );

    raise exception 'manager cost read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_post_inventory_movement(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
      '88888888-8888-8888-8888-888888888881'::uuid,
      '22222222-2222-2222-2222-222222222281'::uuid,
      'ADJUSTMENT',
      1,
      'TEST',
      null,
      'Manager should not adjust inventory'
    );

    raise exception 'manager inventory adjustment unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa123', true);

do $$
declare
  v_movement_id uuid;
  v_count integer;
begin
  if not public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'warehouse.qc') then
    raise exception 'warehouse should have warehouse.qc';
  end if;

  if public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'payment.refund') then
    raise exception 'warehouse should not have payment.refund';
  end if;

  v_movement_id := public.api_post_inventory_movement(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    '88888888-8888-8888-8888-888888888881'::uuid,
    '22222222-2222-2222-2222-222222222281'::uuid,
    'ADJUSTMENT',
    5,
    'TEST',
    null,
    'Warehouse role matrix adjustment'
  );

  if v_movement_id is null then
    raise exception 'warehouse inventory wrapper returned null';
  end if;

  select count(*) into v_count
  from public.payments
  where id = '14141414-1414-1414-1414-141414141481'::uuid;

  if v_count <> 0 then
    raise exception 'warehouse payment visibility expected 0 rows, got %', v_count;
  end if;

  begin
    perform *
    from public.api_get_product_variant_cost(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
      '22222222-2222-2222-2222-222222222281'::uuid
    );

    raise exception 'warehouse cost read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa124', true);

do $$
declare
  v_count integer;
  v_rows integer;
begin
  if not public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'conversation.reply') then
    raise exception 'support should have conversation.reply';
  end if;

  if public.has_org_permission('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid, 'payment.verify') then
    raise exception 'support should not have payment.verify';
  end if;

  insert into public.messages (
    id,
    organization_id,
    conversation_id,
    direction,
    sender_type,
    message_type,
    content_text
  ) values (
    '20202020-2020-2020-2020-202020202081',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    '13131313-1313-1313-1313-131313131381',
    'OUTBOUND',
    'STAFF',
    'TEXT',
    'Support role matrix reply'
  );

  select count(*) into v_count
  from public.payments
  where id = '14141414-1414-1414-1414-141414141481'::uuid;

  if v_count <> 0 then
    raise exception 'support payment visibility expected 0 rows, got %', v_count;
  end if;

  update public.products
  set name = 'Support should not edit products'
  where id = '11111111-1111-1111-1111-111111111181'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 0 then
    raise exception 'support product update expected 0 rows, got %', v_rows;
  end if;
end $$;

reset role;

select 'role_matrix_validation' as check_name, 'pass' as result;

rollback;
