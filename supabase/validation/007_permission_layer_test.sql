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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31',
    'authenticated',
    'authenticated',
    'permission-layer-viewer@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa32',
    'authenticated',
    'authenticated',
    'permission-layer-editor@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
    'Permission Layer Org',
    'permission-layer-org',
    'ACTIVE'
  );

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc31',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31',
    'Permission Layer Viewer',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc32',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa32',
    'Permission Layer Editor',
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
    'dddddddd-dddd-dddd-dddd-dddddddddd31',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
    'cccccccc-cccc-cccc-cccc-cccccccccc31',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd32',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
    'cccccccc-cccc-cccc-cccc-cccccccccc32',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777731',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
    'permission_layer_customer_viewer',
    'Permission Layer Customer Viewer',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777732',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
    'permission_layer_order_editor',
    'Permission Layer Order Editor',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777731'::uuid, id
from public.permissions
where code = 'customer.view';

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777732'::uuid, id
from public.permissions
where code in ('order.view', 'order.create', 'order.edit');

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd31',
    '77777777-7777-7777-7777-777777777731'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd32',
    '77777777-7777-7777-7777-777777777732'
  );

insert into public.customers (
  id,
  organization_id,
  customer_code,
  display_name,
  status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee31',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
  'PERM-CUST',
  'Permission Layer Customer',
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
  '99999999-9999-9999-9999-999999999931',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee31',
  'PERM-ORDER',
  'TEST',
  'DRAFT'
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31',
  true
);

do $$
declare
  v_count integer;
begin
  if not public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
    'customer.view'
  ) then
    raise exception 'viewer should have customer.view';
  end if;

  if public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
    'customer.edit'
  ) then
    raise exception 'viewer should not have customer.edit';
  end if;

  select count(*) into v_count
  from public.customers
  where customer_code = 'PERM-CUST';

  if v_count <> 1 then
    raise exception 'viewer customer select expected 1 row, got %', v_count;
  end if;

  select count(*) into v_count
  from public.orders
  where order_number = 'PERM-ORDER';

  if v_count <> 0 then
    raise exception 'viewer order select expected 0 rows, got %', v_count;
  end if;

  begin
    insert into public.customers (
      id,
      organization_id,
      customer_code,
      display_name
    ) values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee32',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
      'PERM-CUST-DENIED',
      'Permission Layer Denied Customer'
    );

    raise exception 'viewer customer insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa32',
  true
);

do $$
declare
  v_count integer;
  v_rows integer;
begin
  if public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
    'customer.view'
  ) then
    raise exception 'editor should not have customer.view';
  end if;

  if not public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
    'order.edit'
  ) then
    raise exception 'editor should have order.edit';
  end if;

  select count(*) into v_count
  from public.customers
  where customer_code = 'PERM-CUST';

  if v_count <> 0 then
    raise exception 'editor customer select expected 0 rows, got %', v_count;
  end if;

  select count(*) into v_count
  from public.orders
  where order_number = 'PERM-ORDER';

  if v_count <> 1 then
    raise exception 'editor order select expected 1 row, got %', v_count;
  end if;

  update public.orders
  set order_status = 'PENDING_CONFIRMATION'
  where id = '99999999-9999-9999-9999-999999999931'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'editor order update expected 1 row, got %', v_rows;
  end if;

  begin
    insert into public.warehouses (
      id,
      organization_id,
      code,
      name
    ) values (
      '88888888-8888-8888-8888-888888888831',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
      'PERM-WH-DENIED',
      'Permission Layer Denied Warehouse'
    );

    raise exception 'editor warehouse insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'permission_layer' as check_name, 'pass' as result;

rollback;
