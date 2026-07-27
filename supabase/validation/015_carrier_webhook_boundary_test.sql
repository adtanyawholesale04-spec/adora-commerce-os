\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa151',
  'authenticated',
  'authenticated',
  'carrier-webhook-boundary@example.test',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.organizations (id, name, slug, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'Carrier Webhook Org A',
  'carrier-webhook-org-a',
  'ACTIVE'
);

insert into public.profiles (id, auth_user_id, display_name, status)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccb1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa151',
  'Carrier Webhook User',
  'ACTIVE'
);

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values (
  'dddddddd-dddd-dddd-dddd-ddddddddddb1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccb1',
  'ACTIVE',
  true,
  now()
);

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeb1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'CARRIER-CUST-A',
  'Carrier Customer A',
  'ACTIVE'
);

insert into public.products (
  id, organization_id, product_code, name, status
) values (
  '11111111-1111-1111-1111-1111111111b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'CARRIER-PROD-A',
  'Carrier Product A',
  'ACTIVE'
);

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name, base_price, cost_price, status
) values (
  '22222222-2222-2222-2222-2222222222b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '11111111-1111-1111-1111-1111111111b1',
  'CARRIER-SKU-A',
  'Carrier SKU A',
  100,
  60,
  'ACTIVE'
);

insert into public.orders (
  id, organization_id, customer_id, order_number, source, order_status
) values (
  '99999999-9999-9999-9999-9999999999b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeb1',
  'CARRIER-ORDER-A',
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
  '66666666-6666-6666-6666-6666666666b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '99999999-9999-9999-9999-9999999999b1',
  '22222222-2222-2222-2222-2222222222b1',
  'CARRIER-SKU-A',
  'Carrier Product A',
  'Carrier SKU A',
  1,
  100,
  100,
  100
);

insert into public.warehouses (
  id, organization_id, code, name, status
) values (
  '88888888-8888-8888-8888-8888888888b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'CARRIER-WH-A',
  'Carrier Warehouse A',
  'ACTIVE'
);

insert into public.fulfillments (
  id, organization_id, fulfillment_number, warehouse_id, status
) values (
  '16161616-1616-1616-1616-1616161616b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'CARRIER-FULFILL-A',
  '88888888-8888-8888-8888-8888888888b1',
  'READY_TO_SHIP'
);

insert into public.fulfillment_items (
  id, organization_id, fulfillment_id, order_id, order_item_id, variant_id, quantity
) values (
  '17171717-1717-1717-1717-1717171717b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '16161616-1616-1616-1616-1616161616b1',
  '99999999-9999-9999-9999-9999999999b1',
  '66666666-6666-6666-6666-6666666666b1',
  '22222222-2222-2222-2222-2222222222b1',
  1
);

insert into public.shipping_providers (
  id, organization_id, provider_code, name, status
) values (
  '18181818-1818-1818-1818-1818181818b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'CARRIER',
  'Carrier Provider',
  'ACTIVE'
);

insert into public.shipments (
  id,
  organization_id,
  fulfillment_id,
  shipping_provider_id,
  shipment_number,
  tracking_number,
  status,
  label_storage_path
) values (
  '19191919-1919-1919-1919-1919191919b1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '16161616-1616-1616-1616-1616161616b1',
  '18181818-1818-1818-1818-1818181818b1',
  'CARRIER-SHIPMENT-A',
  'TRACK-CARRIER-A',
  'READY_FOR_HANDOFF',
  'labels/CARRIER-SHIPMENT-A.pdf'
);

set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa151', true);

do $$
begin
  begin
    insert into public.carrier_webhook_events (
      organization_id,
      provider_code,
      idempotency_key,
      shipment_id,
      payload_hash,
      raw_payload_json
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'carrier',
      'auth-direct-should-fail',
      '19191919-1919-1919-1919-1919191919b1',
      'hash',
      '{}'::jsonb
    );

    raise exception 'authenticated carrier webhook log insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role service_role;

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_webhook_log_id uuid;
  v_tracking_event_id uuid;
  v_count integer;
begin
  insert into public.carrier_webhook_events (
    organization_id,
    provider_code,
    idempotency_key,
    shipment_id,
    external_event_id,
    event_code,
    mapped_shipment_status,
    payload_hash,
    signature_header,
    raw_payload_json
  ) values (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'carrier',
    'carrier-event-1',
    '19191919-1919-1919-1919-1919191919b1',
    'carrier-event-1',
    'PICKED_UP',
    'IN_TRANSIT',
    'hash-1',
    'sha256=test',
    '{"status":"PICKED_UP"}'::jsonb
  )
  returning id into v_webhook_log_id;

  begin
    insert into public.carrier_webhook_events (
      organization_id,
      provider_code,
      idempotency_key,
      shipment_id,
      payload_hash,
      raw_payload_json
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'carrier',
      'carrier-event-1',
      '19191919-1919-1919-1919-1919191919b1',
      'hash-1',
      '{}'::jsonb
    );

    raise exception 'duplicate idempotency key unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;

  v_tracking_event_id := public.api_record_carrier_tracking_event_from_webhook(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
    '19191919-1919-1919-1919-1919191919b1'::uuid,
    'PICKED_UP',
    'Carrier picked up shipment',
    '2026-07-29 10:00:00+07'::timestamptz,
    'IN_TRANSIT',
    'carrier-event-1',
    '{"status":"PICKED_UP"}'::jsonb
  );

  update public.carrier_webhook_events
  set processing_status = 'PROCESSED',
      tracking_event_id = v_tracking_event_id,
      processed_at = now()
  where id = v_webhook_log_id;

  select count(*) into v_count
  from public.carrier_webhook_events
  where id = v_webhook_log_id
    and processing_status = 'PROCESSED'
    and tracking_event_id = v_tracking_event_id;

  if v_count <> 1 then
    raise exception 'carrier webhook log expected processed row, got %', v_count;
  end if;

end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.shipments
  where id = '19191919-1919-1919-1919-1919191919b1'::uuid
    and status = 'IN_TRANSIT'
    and shipped_at = '2026-07-29 10:00:00+07'::timestamptz;

  if v_count <> 1 then
    raise exception 'service-role carrier tracking expected shipment IN_TRANSIT, got %', v_count;
  end if;

  select count(*) into v_count
  from public.fulfillment_events
  where fulfillment_id = '16161616-1616-1616-1616-1616161616b1'::uuid
    and event_type = 'CARRIER_TRACKING_EVENT'
    and actor_profile_id is null
    and payload_json ->> 'source' = 'carrier_webhook';

  if v_count <> 1 then
    raise exception 'service-role carrier tracking expected audit event, got %', v_count;
  end if;
end $$;

select 'carrier_webhook_boundary' as check_name, 'pass' as result;

rollback;
