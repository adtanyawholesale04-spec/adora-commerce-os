\set ON_ERROR_STOP on

begin;

grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.purchase_sessions to authenticated;
grant select, insert, update, delete on table public.orders to authenticated;
grant select, insert, update, delete on table public.warehouses to authenticated;

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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11',
    'authenticated',
    'authenticated',
    'domain-rls-user-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa22',
    'authenticated',
    'authenticated',
    'domain-rls-user-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11', 'Domain RLS Org A', 'domain-rls-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22', 'Domain RLS Org B', 'domain-rls-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc11',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11',
    'Domain RLS User A',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc22',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa22',
    'Domain RLS User B',
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
    'dddddddd-dddd-dddd-dddd-dddddddddd11',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'cccccccc-cccc-cccc-cccc-cccccccccc11',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd22',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
    'cccccccc-cccc-cccc-cccc-cccccccccc22',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777711',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'domain_rls_operator',
    'Domain RLS Operator',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777722',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
    'domain_rls_operator',
    'Domain RLS Operator',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.id in (
    '77777777-7777-7777-7777-777777777711'::uuid,
    '77777777-7777-7777-7777-777777777722'::uuid
  )
  and p.code in (
    'customer.view',
    'customer.edit',
    'order.view',
    'order.create',
    'order.edit',
    'inventory.view',
    'inventory.adjust'
  );

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd11',
    '77777777-7777-7777-7777-777777777711'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd22',
    '77777777-7777-7777-7777-777777777722'
  );

insert into public.customers (
  id,
  organization_id,
  customer_code,
  display_name,
  status
) values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'DOMAIN-CUST-A',
    'Domain Customer A',
    'ACTIVE'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee22',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
    'DOMAIN-CUST-B',
    'Domain Customer B',
    'ACTIVE'
  );

insert into public.purchase_sessions (
  id,
  organization_id,
  customer_id,
  session_number,
  source_context,
  status
) values
  (
    'ffffffff-ffff-ffff-ffff-ffffffffff11',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11',
    'DOMAIN-PS-A',
    'TEST',
    'OPEN'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffff22',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee22',
    'DOMAIN-PS-B',
    'TEST',
    'OPEN'
  );

insert into public.orders (
  id,
  organization_id,
  customer_id,
  order_number,
  source,
  order_status
) values
  (
    '99999999-9999-9999-9999-999999999911',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11',
    'DOMAIN-ORDER-A',
    'TEST',
    'DRAFT'
  ),
  (
    '99999999-9999-9999-9999-999999999922',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee22',
    'DOMAIN-ORDER-B',
    'TEST',
    'DRAFT'
  );

insert into public.warehouses (
  id,
  organization_id,
  code,
  name,
  status
) values
  (
    '88888888-8888-8888-8888-888888888811',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'DOMAIN-WH-A',
    'Domain Warehouse A',
    'ACTIVE'
  ),
  (
    '88888888-8888-8888-8888-888888888822',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
    'DOMAIN-WH-B',
    'Domain Warehouse B',
    'ACTIVE'
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11',
  true
);

do $$
declare
  v_count integer;
  v_rows integer;
begin
  select count(*) into v_count
  from public.customers
  where customer_code in ('DOMAIN-CUST-A', 'DOMAIN-CUST-B');

  if v_count <> 1 then
    raise exception 'user A customer RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.purchase_sessions
  where session_number in ('DOMAIN-PS-A', 'DOMAIN-PS-B');

  if v_count <> 1 then
    raise exception 'user A purchase session RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.orders
  where order_number in ('DOMAIN-ORDER-A', 'DOMAIN-ORDER-B');

  if v_count <> 1 then
    raise exception 'user A order RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.warehouses
  where code in ('DOMAIN-WH-A', 'DOMAIN-WH-B');

  if v_count <> 1 then
    raise exception 'user A warehouse RLS count expected 1, got %', v_count;
  end if;

  insert into public.customers (
    id,
    organization_id,
    customer_code,
    display_name
  ) values (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee13',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'DOMAIN-CUST-A-OWN-INSERT',
    'Domain Customer A Own Insert'
  );

  insert into public.purchase_sessions (
    id,
    organization_id,
    customer_id,
    session_number,
    source_context
  ) values (
    'ffffffff-ffff-ffff-ffff-ffffffffff13',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11',
    'DOMAIN-PS-A-OWN-INSERT',
    'TEST'
  );

  insert into public.orders (
    id,
    organization_id,
    customer_id,
    order_number,
    source
  ) values (
    '99999999-9999-9999-9999-999999999913',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11',
    'DOMAIN-ORDER-A-OWN-INSERT',
    'TEST'
  );

  insert into public.warehouses (
    id,
    organization_id,
    code,
    name
  ) values (
    '88888888-8888-8888-8888-888888888813',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11',
    'DOMAIN-WH-A-OWN-INSERT',
    'Domain Warehouse A Own Insert'
  );

  begin
    insert into public.customers (
      id,
      organization_id,
      customer_code,
      display_name
    ) values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee23',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
      'DOMAIN-CUST-B-CROSS-INSERT',
      'Domain Customer B Cross Insert'
    );

    raise exception 'user A cross-tenant customer insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.purchase_sessions (
      id,
      organization_id,
      customer_id,
      session_number,
      source_context
    ) values (
      'ffffffff-ffff-ffff-ffff-ffffffffff23',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee22',
      'DOMAIN-PS-B-CROSS-INSERT',
      'TEST'
    );

    raise exception 'user A cross-tenant purchase session insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.orders (
      id,
      organization_id,
      customer_id,
      order_number,
      source
    ) values (
      '99999999-9999-9999-9999-999999999923',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee22',
      'DOMAIN-ORDER-B-CROSS-INSERT',
      'TEST'
    );

    raise exception 'user A cross-tenant order insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.warehouses (
      id,
      organization_id,
      code,
      name
    ) values (
      '88888888-8888-8888-8888-888888888823',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22',
      'DOMAIN-WH-B-CROSS-INSERT',
      'Domain Warehouse B Cross Insert'
    );

    raise exception 'user A cross-tenant warehouse insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  update public.orders
  set order_status = 'PENDING_CONFIRMATION'
  where id = '99999999-9999-9999-9999-999999999911'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'user A own order update expected 1 row, got %', v_rows;
  end if;

  update public.orders
  set order_status = 'PENDING_CONFIRMATION'
  where id = '99999999-9999-9999-9999-999999999922'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 0 then
    raise exception 'user A cross-tenant order update expected 0 rows, got %', v_rows;
  end if;

  delete from public.warehouses
  where id = '88888888-8888-8888-8888-888888888822'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 0 then
    raise exception 'user A cross-tenant warehouse delete expected 0 rows, got %', v_rows;
  end if;

  delete from public.warehouses
  where id = '88888888-8888-8888-8888-888888888813'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'user A own warehouse delete expected 1 row, got %', v_rows;
  end if;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa22',
  true
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.customers
  where customer_code in ('DOMAIN-CUST-A', 'DOMAIN-CUST-B');

  if v_count <> 1 then
    raise exception 'user B customer RLS count expected 1, got %', v_count;
  end if;

  if exists (
    select 1
    from public.orders
    where id = '99999999-9999-9999-9999-999999999911'::uuid
  ) then
    raise exception 'user B can see user A order';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = '99999999-9999-9999-9999-999999999922'::uuid
  ) then
    raise exception 'user B cannot see own order';
  end if;
end $$;

reset role;

select 'domain_rls_crud' as check_name, 'pass' as result;

rollback;
