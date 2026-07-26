\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa141',
    'authenticated',
    'authenticated',
    'shipping-workflow-full@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa142',
    'authenticated',
    'authenticated',
    'shipping-workflow-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1', 'Shipping Workflow Org A', 'shipping-workflow-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba2', 'Shipping Workflow Org B', 'shipping-workflow-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccca1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa141',
    'Shipping Workflow Full',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccca2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa142',
    'Shipping Workflow Limited',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddda1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
    'cccccccc-cccc-cccc-cccc-cccccccccca1',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddda2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
    'cccccccc-cccc-cccc-cccc-cccccccccca2',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-7777777777a1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
    'shipping_workflow_full',
    'Shipping Workflow Full',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-7777777777a2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
    'shipping_workflow_limited',
    'Shipping Workflow Limited',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-7777777777a1'::uuid, id
from public.permissions
where code in (
  'warehouse.pick',
  'warehouse.qc',
  'shipping.create',
  'shipping.print_label'
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-7777777777a2'::uuid, id
from public.permissions
where code in (
  'shipping.create'
);

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddda1', '77777777-7777-7777-7777-7777777777a1'),
  ('dddddddd-dddd-dddd-dddd-dddddddddda2', '77777777-7777-7777-7777-7777777777a2');

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  'SHIPWF-CUST-A',
  'Shipping Workflow Customer A',
  'ACTIVE'
);

insert into public.products (
  id, organization_id, product_code, name, status
) values (
  '11111111-1111-1111-1111-1111111111a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  'SHIPWF-PROD-A',
  'Shipping Workflow Product A',
  'ACTIVE'
);

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name, base_price, cost_price, status
) values (
  '22222222-2222-2222-2222-2222222222a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  '11111111-1111-1111-1111-1111111111a1',
  'SHIPWF-SKU-A',
  'Shipping Workflow SKU A',
  100,
  60,
  'ACTIVE'
);

insert into public.orders (
  id, organization_id, customer_id, order_number, source, order_status
) values (
  '99999999-9999-9999-9999-9999999999a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea1',
  'SHIPWF-ORDER-A',
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
  '66666666-6666-6666-6666-6666666666a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  '99999999-9999-9999-9999-9999999999a1',
  '22222222-2222-2222-2222-2222222222a1',
  'SHIPWF-SKU-A',
  'Shipping Workflow Product A',
  'Shipping Workflow SKU A',
  1,
  100,
  100,
  100
);

insert into public.warehouses (
  id, organization_id, code, name, status
) values (
  '88888888-8888-8888-8888-8888888888a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  'SHIPWF-WH-A',
  'Shipping Workflow Warehouse A',
  'ACTIVE'
);

insert into public.fulfillments (
  id, organization_id, fulfillment_number, warehouse_id, status
) values (
  '16161616-1616-1616-1616-1616161616a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  'SHIPWF-FULFILL-A',
  '88888888-8888-8888-8888-8888888888a1',
  'QC_PENDING'
);

insert into public.fulfillment_items (
  id, organization_id, fulfillment_id, order_id, order_item_id, variant_id, quantity
) values (
  '17171717-1717-1717-1717-1717171717a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  '16161616-1616-1616-1616-1616161616a1',
  '99999999-9999-9999-9999-9999999999a1',
  '66666666-6666-6666-6666-6666666666a1',
  '22222222-2222-2222-2222-2222222222a1',
  1
);

insert into public.fulfillment_qc_sessions (
  id, organization_id, fulfillment_id, status, started_by, started_at
) values (
  '27272727-2727-2727-2727-2727272727a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  '16161616-1616-1616-1616-1616161616a1',
  'IN_PROGRESS',
  'cccccccc-cccc-cccc-cccc-cccccccccca1',
  now()
);

insert into public.fulfillment_qc_item_totals (
  id,
  organization_id,
  qc_session_id,
  fulfillment_item_id,
  required_quantity,
  scanned_quantity,
  status
) values (
  '33333333-3333-3333-3333-3333333333a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  '27272727-2727-2727-2727-2727272727a1',
  '17171717-1717-1717-1717-1717171717a1',
  1,
  1,
  'PASSED'
);

insert into public.shipping_providers (
  id, organization_id, provider_code, name, status
) values (
  '18181818-1818-1818-1818-1818181818a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  'SHIPWF-CARRIER',
  'Shipping Workflow Carrier',
  'ACTIVE'
);

insert into public.shipments (
  id, organization_id, fulfillment_id, shipping_provider_id, shipment_number, status
) values (
  '19191919-1919-1919-1919-1919191919a1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  '16161616-1616-1616-1616-1616161616a1',
  '18181818-1818-1818-1818-1818181818a1',
  'SHIPWF-SHIPMENT-A',
  'DRAFT'
);

set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa141', true);

do $$
declare
  v_qc_id uuid;
  v_shipment_id uuid;
  v_tracking_id uuid;
  v_count integer;
begin
  v_qc_id := public.api_complete_qc_session(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
    '27272727-2727-2727-2727-2727272727a1'::uuid,
    'All items matched'
  );

  if v_qc_id <> '27272727-2727-2727-2727-2727272727a1'::uuid then
    raise exception 'QC completion returned unexpected id %', v_qc_id;
  end if;

  select count(*) into v_count
  from public.fulfillment_qc_sessions
  where id = v_qc_id
    and status = 'PASSED'
    and completed_by = 'cccccccc-cccc-cccc-cccc-cccccccccca1'::uuid;

  if v_count <> 1 then
    raise exception 'QC completion expected one passed session, got %', v_count;
  end if;

  select count(*) into v_count
  from public.fulfillments
  where id = '16161616-1616-1616-1616-1616161616a1'::uuid
    and status = 'QC_PASSED';

  if v_count <> 1 then
    raise exception 'QC completion expected fulfillment QC_PASSED, got %', v_count;
  end if;

  v_shipment_id := public.api_create_shipment_label(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
    '19191919-1919-1919-1919-1919191919a1'::uuid,
    'labels/SHIPWF-SHIPMENT-A.pdf',
    'TRACK-SHIPWF-A',
    'carrier-shipment-a',
    65
  );

  v_shipment_id := public.api_mark_shipment_ready_for_handoff(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
    v_shipment_id,
    'Packed and staged'
  );

  select count(*) into v_count
  from public.shipments
  where id = v_shipment_id
    and status = 'READY_FOR_HANDOFF'
    and label_storage_path = 'labels/SHIPWF-SHIPMENT-A.pdf';

  if v_count <> 1 then
    raise exception 'handoff expected one ready shipment, got %', v_count;
  end if;

  select count(*) into v_count
  from public.fulfillments
  where id = '16161616-1616-1616-1616-1616161616a1'::uuid
    and status = 'READY_TO_SHIP';

  if v_count <> 1 then
    raise exception 'handoff expected fulfillment READY_TO_SHIP, got %', v_count;
  end if;

  begin
    insert into public.tracking_events (
      organization_id,
      shipment_id,
      event_code,
      event_description,
      event_at
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
      '19191919-1919-1919-1919-1919191919a1',
      'DIRECT',
      'Direct tracking event should fail',
      now()
    );

    raise exception 'direct tracking event insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  v_tracking_id := public.api_record_carrier_tracking_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
    '19191919-1919-1919-1919-1919191919a1'::uuid,
    'PICKED_UP',
    'Carrier picked up shipment',
    '2026-07-27 10:00:00+07'::timestamptz,
    'IN_TRANSIT',
    'carrier-event-1',
    '{"source":"validation"}'::jsonb
  );

  select count(*) into v_count
  from public.tracking_events
  where id = v_tracking_id
    and event_code = 'PICKED_UP'
    and external_event_id = 'carrier-event-1';

  if v_count <> 1 then
    raise exception 'tracking wrapper expected one tracking event, got %', v_count;
  end if;

  select count(*) into v_count
  from public.shipments
  where id = '19191919-1919-1919-1919-1919191919a1'::uuid
    and status = 'IN_TRANSIT'
    and shipped_at = '2026-07-27 10:00:00+07'::timestamptz;

  if v_count <> 1 then
    raise exception 'tracking wrapper expected shipment IN_TRANSIT with shipped_at, got %', v_count;
  end if;

  perform public.api_record_carrier_tracking_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
    '19191919-1919-1919-1919-1919191919a1'::uuid,
    'DELIVERED',
    'Delivered to customer',
    '2026-07-28 15:30:00+07'::timestamptz,
    'DELIVERED',
    'carrier-event-2',
    '{"source":"validation"}'::jsonb
  );

  select count(*) into v_count
  from public.shipments
  where id = '19191919-1919-1919-1919-1919191919a1'::uuid
    and status = 'DELIVERED'
    and delivered_at = '2026-07-28 15:30:00+07'::timestamptz;

  if v_count <> 1 then
    raise exception 'tracking wrapper expected shipment DELIVERED, got %', v_count;
  end if;

  select count(*) into v_count
  from public.fulfillments
  where id = '16161616-1616-1616-1616-1616161616a1'::uuid
    and status = 'COMPLETED'
    and fulfilled_at = '2026-07-28 15:30:00+07'::timestamptz;

  if v_count <> 1 then
    raise exception 'tracking wrapper expected fulfillment COMPLETED, got %', v_count;
  end if;

  begin
    perform public.api_record_carrier_tracking_event(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
      '19191919-1919-1919-1919-1919191919a1'::uuid,
      'LATE_EVENT',
      'Terminal update should fail',
      now(),
      'IN_TRANSIT'
    );

    raise exception 'terminal tracking update unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa142', true);

do $$
begin
  begin
    perform public.api_complete_qc_session(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1'::uuid,
      '27272727-2727-2727-2727-2727272727a1'::uuid,
      'Missing QC permission'
    );

    raise exception 'limited user QC completion unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_record_carrier_tracking_event(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba2'::uuid,
      '19191919-1919-1919-1919-1919191919a1'::uuid,
      'CROSS_TENANT',
      'Cross tenant should fail',
      now(),
      'IN_TRANSIT'
    );

    raise exception 'cross-tenant tracking update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'shipping_workflow_wrappers' as check_name, 'pass' as result;

rollback;
