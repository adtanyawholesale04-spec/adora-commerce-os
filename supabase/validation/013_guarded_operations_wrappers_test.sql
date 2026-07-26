\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa131',
    'authenticated',
    'authenticated',
    'guarded-ops-full@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa132',
    'authenticated',
    'authenticated',
    'guarded-ops-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91', 'Guarded Ops Org A', 'guarded-ops-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb92', 'Guarded Ops Org B', 'guarded-ops-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa131',
    'Guarded Ops Full',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc92',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa132',
    'Guarded Ops Limited',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd91',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd92',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'cccccccc-cccc-cccc-cccc-cccccccccc92',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777791',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'guarded_ops_full',
    'Guarded Ops Full',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777792',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'guarded_ops_limited',
    'Guarded Ops Limited',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777791'::uuid, id
from public.permissions
where code in (
  'payment.view',
  'payment.refund',
  'warehouse.pick',
  'warehouse.qc',
  'warehouse.qc.override',
  'shipping.create',
  'shipping.print_label'
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777792'::uuid, id
from public.permissions
where code in (
  'payment.view',
  'warehouse.qc',
  'shipping.create'
);

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd91', '77777777-7777-7777-7777-777777777791'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd92', '77777777-7777-7777-7777-777777777792');

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee91',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'GUARDED-CUST-A',
  'Guarded Ops Customer A',
  'ACTIVE'
);

insert into public.products (
  id, organization_id, product_code, name, status
) values (
  '11111111-1111-1111-1111-111111111191',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'GUARDED-PROD-A',
  'Guarded Ops Product A',
  'ACTIVE'
);

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name, base_price, cost_price, status
) values (
  '22222222-2222-2222-2222-222222222291',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '11111111-1111-1111-1111-111111111191',
  'GUARDED-SKU-A',
  'Guarded Ops SKU A',
  100,
  60,
  'ACTIVE'
);

insert into public.orders (
  id, organization_id, customer_id, order_number, source, order_status
) values (
  '99999999-9999-9999-9999-999999999991',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee91',
  'GUARDED-ORDER-A',
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
  '66666666-6666-6666-6666-666666666691',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '99999999-9999-9999-9999-999999999991',
  '22222222-2222-2222-2222-222222222291',
  'GUARDED-SKU-A',
  'Guarded Ops Product A',
  'Guarded Ops SKU A',
  1,
  100,
  100,
  100
);

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received
) values (
  '14141414-1414-1414-1414-141414141491',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '99999999-9999-9999-9999-999999999991',
  'PAID',
  100,
  100
);

insert into public.payment_transactions (
  id,
  organization_id,
  payment_id,
  transaction_type,
  payment_method,
  amount,
  status
) values (
  '21212121-2121-2121-2121-212121212191',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '14141414-1414-1414-1414-141414141491',
  'PAYMENT',
  'CASH',
  100,
  'SUCCEEDED'
);

insert into public.returns (
  id, organization_id, order_id, return_number, return_type, status, reason
) values (
  '15151515-1515-1515-1515-151515151591',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '99999999-9999-9999-9999-999999999991',
  'GUARDED-RETURN-A',
  'CUSTOMER_RETURN',
  'APPROVED',
  'Guarded return fixture'
);

insert into public.warehouses (
  id, organization_id, code, name, status
) values (
  '88888888-8888-8888-8888-888888888891',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'GUARDED-WH-A',
  'Guarded Ops Warehouse A',
  'ACTIVE'
);

insert into public.fulfillments (
  id, organization_id, fulfillment_number, warehouse_id, status
) values (
  '16161616-1616-1616-1616-161616161691',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'GUARDED-FULFILL-A',
  '88888888-8888-8888-8888-888888888891',
  'QC_PENDING'
);

insert into public.fulfillment_items (
  id, organization_id, fulfillment_id, order_id, order_item_id, variant_id, quantity
) values (
  '17171717-1717-1717-1717-171717171791',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '16161616-1616-1616-1616-161616161691',
  '99999999-9999-9999-9999-999999999991',
  '66666666-6666-6666-6666-666666666691',
  '22222222-2222-2222-2222-222222222291',
  1
);

insert into public.fulfillment_qc_sessions (
  id, organization_id, fulfillment_id, status, started_by, started_at, failure_reason
) values (
  '27272727-2727-2727-2727-272727272791',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '16161616-1616-1616-1616-161616161691',
  'FAILED',
  'cccccccc-cccc-cccc-cccc-cccccccccc91',
  now(),
  'Barcode mismatch'
);

insert into public.shipping_providers (
  id, organization_id, provider_code, name, status
) values (
  '18181818-1818-1818-1818-181818181891',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'GUARDED-SHIPPER',
  'Guarded Ops Shipper',
  'ACTIVE'
);

insert into public.shipments (
  id, organization_id, fulfillment_id, shipping_provider_id, shipment_number, status
) values (
  '19191919-1919-1919-1919-191919191991',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  '16161616-1616-1616-1616-161616161691',
  '18181818-1818-1818-1818-181818181891',
  'GUARDED-SHIPMENT-A',
  'DRAFT'
);

set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa131', true);

do $$
declare
  v_refund_id uuid;
  v_qc_id uuid;
  v_shipment_id uuid;
  v_count integer;
begin
  v_refund_id := public.api_process_refund(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
    '99999999-9999-9999-9999-999999999991'::uuid,
    'GUARDED-REFUND-A',
    40,
    'CASH',
    'Customer return approved',
    '15151515-1515-1515-1515-151515151591'::uuid,
    '21212121-2121-2121-2121-212121212191'::uuid,
    'manual',
    'manual-ref-1'
  );

  select count(*) into v_count
  from public.refunds
  where id = v_refund_id
    and status = 'PROCESSING'
    and created_by = 'cccccccc-cccc-cccc-cccc-cccccccccc91'::uuid;

  if v_count <> 1 then
    raise exception 'guarded refund wrapper expected one processing refund, got %', v_count;
  end if;

  select count(*) into v_count
  from public.refund_transactions
  where refund_id = v_refund_id
    and amount = 40
    and status = 'PENDING';

  if v_count <> 1 then
    raise exception 'guarded refund wrapper expected one pending transaction, got %', v_count;
  end if;

  begin
    perform public.api_process_refund(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
      '99999999-9999-9999-9999-999999999991'::uuid,
      'GUARDED-REFUND-TOO-HIGH',
      70,
      'CASH',
      'Over refund',
      null,
      '21212121-2121-2121-2121-212121212191'::uuid
    );

    raise exception 'over refund unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    insert into public.refunds (
      organization_id,
      order_id,
      payment_transaction_id,
      refund_number,
      amount,
      refund_method,
      status
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
      '99999999-9999-9999-9999-999999999991',
      '21212121-2121-2121-2121-212121212191',
      'GUARDED-DIRECT-REFUND',
      1,
      'CASH',
      'PENDING'
    );

    raise exception 'direct refund insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  v_qc_id := public.api_override_qc_session(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
    '27272727-2727-2727-2727-272727272791'::uuid,
    'Supervisor accepted manual count',
    '{"source":"validation"}'::jsonb
  );

  if v_qc_id <> '27272727-2727-2727-2727-272727272791'::uuid then
    raise exception 'QC wrapper returned unexpected id %', v_qc_id;
  end if;

  select count(*) into v_count
  from public.fulfillment_qc_sessions
  where id = v_qc_id
    and status = 'PASSED'
    and completed_by = 'cccccccc-cccc-cccc-cccc-cccccccccc91'::uuid;

  if v_count <> 1 then
    raise exception 'QC override expected one passed session, got %', v_count;
  end if;

  select count(*) into v_count
  from public.fulfillments
  where id = '16161616-1616-1616-1616-161616161691'::uuid
    and status = 'QC_PASSED';

  if v_count <> 1 then
    raise exception 'QC override expected fulfillment status QC_PASSED, got %', v_count;
  end if;

  begin
    update public.fulfillment_qc_sessions
    set status = 'FAILED'
    where id = '27272727-2727-2727-2727-272727272791'::uuid;

    raise exception 'direct QC session update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  v_shipment_id := public.api_create_shipment_label(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
    '19191919-1919-1919-1919-191919191991'::uuid,
    'labels/GUARDED-SHIPMENT-A.pdf',
    'TRACK-GUARDED-A',
    'provider-shipment-a',
    55
  );

  if v_shipment_id <> '19191919-1919-1919-1919-191919191991'::uuid then
    raise exception 'shipment label wrapper returned unexpected id %', v_shipment_id;
  end if;

  select count(*) into v_count
  from public.shipments
  where id = v_shipment_id
    and status = 'LABEL_CREATED'
    and tracking_number = 'TRACK-GUARDED-A'
    and label_storage_path = 'labels/GUARDED-SHIPMENT-A.pdf'
    and shipping_cost = 55;

  if v_count <> 1 then
    raise exception 'shipment label wrapper expected one labeled shipment, got %', v_count;
  end if;

  begin
    update public.shipments
    set label_storage_path = 'labels/direct.pdf'
    where id = '19191919-1919-1919-1919-191919191991'::uuid;

    raise exception 'direct shipment label update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa132', true);

do $$
begin
  begin
    perform public.api_process_refund(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
      '99999999-9999-9999-9999-999999999991'::uuid,
      'GUARDED-REFUND-LIMITED',
      1,
      'CASH',
      'Missing permission',
      null,
      '21212121-2121-2121-2121-212121212191'::uuid
    );

    raise exception 'limited user refund unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_override_qc_session(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
      '27272727-2727-2727-2727-272727272791'::uuid,
      'Missing override permission'
    );

    raise exception 'limited user QC override unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_create_shipment_label(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid,
      '19191919-1919-1919-1919-191919191991'::uuid,
      'labels/limited.pdf'
    );

    raise exception 'limited user shipment label unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_create_shipment_label(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb92'::uuid,
      '19191919-1919-1919-1919-191919191991'::uuid,
      'labels/cross-tenant.pdf'
    );

    raise exception 'cross-tenant shipment label unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'guarded_operations_wrappers' as check_name, 'pass' as result;

rollback;
