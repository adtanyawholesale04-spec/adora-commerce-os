\set ON_ERROR_STOP on

begin;

do $$
begin
  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'organization_checkout_settings',
        'commerce_idempotency_keys'
      )
      and c.relrowsecurity
  ) <> 2 then
    raise exception 'Phase 1D foundation tables do not both have RLS enabled';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organization_checkout_settings',
        'commerce_idempotency_keys'
      )
  ) then
    raise exception 'Phase 1D foundation unexpectedly exposes a table policy';
  end if;

  if has_table_privilege(
    'anon',
    'public.organization_checkout_settings',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.organization_checkout_settings',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.commerce_idempotency_keys',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.commerce_idempotency_keys',
    'SELECT'
  ) then
    raise exception 'Browser role received Phase 1D foundation table access';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.organization_checkout_settings',
    'SELECT,INSERT,UPDATE'
  ) or not has_table_privilege(
    'service_role',
    'public.commerce_idempotency_keys',
    'SELECT,INSERT,UPDATE'
  ) then
    raise exception 'Service role is missing required foundation access';
  end if;

  if has_table_privilege(
    'service_role',
    'public.organization_checkout_settings',
    'DELETE'
  ) or has_table_privilege(
    'service_role',
    'public.commerce_idempotency_keys',
    'DELETE'
  ) then
    raise exception 'Service role received forbidden foundation DELETE access';
  end if;

  if not exists (
    select 1
    from public.features f
    where f.code = 'storefront.checkout'
      and f.feature_type = 'BOOLEAN'
      and f.status = 'ACTIVE'
      and f.unit is null
  ) then
    raise exception 'storefront.checkout feature was not seeded correctly';
  end if;

  if exists (
    select 1
    from public.organization_entitlements oe
    join public.features f on f.id = oe.feature_id
    where f.code = 'storefront.checkout'
  ) then
    raise exception 'Part 3B unexpectedly granted checkout entitlement';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'source_cart_id'
      and is_nullable = 'YES'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory_reservations'
      and column_name = 'order_item_id'
      and is_nullable = 'YES'
  ) then
    raise exception 'Additive Core reference columns are missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'protect_commerce_idempotency_key'
      and not p.prosecdef
      and p.proconfig @> array['search_path=public']
  ) then
    raise exception 'Idempotency protection trigger function is not hardened';
  end if;
end
$$;

insert into public.organizations (id, name, slug, status)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
    'Checkout Foundation Org A',
    'checkout-foundation-a',
    'ACTIVE'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb82',
    'Checkout Foundation Org B',
    'checkout-foundation-b',
    'ACTIVE'
  );

insert into public.customers (
  id,
  organization_id,
  customer_code,
  display_name,
  status
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
    'CHECKOUT-CUSTOMER-A',
    'Checkout Customer A',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccc82',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb82',
    'CHECKOUT-CUSTOMER-B',
    'Checkout Customer B',
    'ACTIVE'
  );

insert into public.organization_checkout_settings (
  organization_id,
  status,
  flat_shipping_charge
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
  'INACTIVE',
  0
);

do $$
begin
  begin
    insert into public.organization_checkout_settings (
      organization_id,
      status,
      reservation_minutes
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb82',
      'ACTIVE',
      61
    );
    raise exception 'Invalid checkout settings unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end
$$;

insert into public.commerce_idempotency_keys (
  id,
  organization_id,
  operation,
  request_id,
  customer_id,
  request_hash
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddd81',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
  'CHECKOUT_SUBMIT',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee81',
  'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
  decode(repeat('ab', 32), 'hex')
);

update public.commerce_idempotency_keys
set state = 'SUCCEEDED',
    result_entity_type = 'order',
    result_entity_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    completed_at = now()
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd81';

do $$
begin
  begin
    update public.commerce_idempotency_keys
    set completed_at = now() + interval '1 second'
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd81';
    raise exception 'Terminal idempotency update unexpectedly succeeded';
  exception
    when raise_exception then null;
  end;

  begin
    delete from public.commerce_idempotency_keys
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd81';
    raise exception 'Idempotency delete unexpectedly succeeded';
  exception
    when raise_exception then null;
  end;

  begin
    insert into public.commerce_idempotency_keys (
      organization_id,
      operation,
      request_id,
      customer_id,
      request_hash
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
      'CHECKOUT_SUBMIT',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee81',
      'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
      decode(repeat('cd', 32), 'hex')
    );
    raise exception 'Duplicate idempotency request unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.commerce_idempotency_keys (
      organization_id,
      operation,
      request_id,
      customer_id,
      request_hash
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
      'CART_CREATE',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee82',
      'cccccccc-cccc-4ccc-8ccc-cccccccccc82',
      decode(repeat('ef', 32), 'hex')
    );
    raise exception 'Cross-tenant idempotency customer unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end
$$;

insert into public.carts (
  id,
  organization_id,
  customer_id,
  source,
  status
)
values (
  '11111111-1111-4111-8111-111111111181',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
  'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
  'STOREFRONT',
  'OPEN'
);

do $$
begin
  begin
    insert into public.carts (
      organization_id,
      customer_id,
      source,
      status
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
      'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
      'STOREFRONT',
      'READY'
    );
    raise exception 'Duplicate active Storefront cart unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end
$$;

insert into public.orders (
  id,
  organization_id,
  customer_id,
  order_number,
  source,
  source_cart_id
)
values (
  '22222222-2222-4222-8222-222222222281',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
  'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
  'WEB-VALIDATION-0001',
  'STOREFRONT',
  '11111111-1111-4111-8111-111111111181'
);

do $$
begin
  begin
    insert into public.orders (
      organization_id,
      customer_id,
      order_number,
      source,
      source_cart_id
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb81',
      'cccccccc-cccc-4ccc-8ccc-cccccccccc81',
      'WEB-VALIDATION-0002',
      'STOREFRONT',
      '11111111-1111-4111-8111-111111111181'
    );
    raise exception 'Second order for one source cart unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end
$$;

select 'phase_1d_checkout_foundation' as test_name, 'pass' as result;

rollback;
