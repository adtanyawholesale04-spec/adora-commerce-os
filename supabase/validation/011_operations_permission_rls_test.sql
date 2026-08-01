\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa71',
    'authenticated',
    'authenticated',
    'operations-user-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa72',
    'authenticated',
    'authenticated',
    'operations-user-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71', 'Operations Org A', 'operations-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72', 'Operations Org B', 'operations-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa71',
    'Operations User A',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc72',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa72',
    'Operations User B',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd71',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd72',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
    'cccccccc-cccc-cccc-cccc-cccccccccc72',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777771',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'operations_full',
    'Operations Full',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
    'operations_conversation_viewer',
    'Operations Conversation Viewer',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777771'::uuid, id
from public.permissions
where code in (
  'conversation.view',
  'conversation.reply',
  'conversation.assign',
  'payment.view',
  'payment.verify',
  'payment.refund',
  'return.view',
  'return.manage',
  'return.inspect',
  'warehouse.pick',
  'warehouse.qc',
  'warehouse.pack',
  'shipping.create'
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777772'::uuid, id
from public.permissions
where code = 'conversation.view';

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd71',
    '77777777-7777-7777-7777-777777777771'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd72',
    '77777777-7777-7777-7777-777777777772'
  );

insert into public.channel_accounts (
  id, organization_id, provider, external_account_id, display_name, status
) values
  (
    '12121212-1212-1212-1212-121212121271',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'LINE',
    'operations-channel-a',
    'Operations Channel A',
    'ACTIVE'
  ),
  (
    '12121212-1212-1212-1212-121212121272',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
    'LINE',
    'operations-channel-b',
    'Operations Channel B',
    'ACTIVE'
  );

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee71',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'OPS-CUST-A',
    'Operations Customer A',
    'ACTIVE'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee72',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
    'OPS-CUST-B',
    'Operations Customer B',
    'ACTIVE'
  );

insert into public.conversations (
  id, organization_id, channel_account_id, customer_id, external_conversation_id, status
) values
  (
    '13131313-1313-1313-1313-131313131371',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '12121212-1212-1212-1212-121212121271',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee71',
    'ops-conversation-a',
    'OPEN'
  ),
  (
    '13131313-1313-1313-1313-131313131372',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
    '12121212-1212-1212-1212-121212121272',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee72',
    'ops-conversation-b',
    'OPEN'
  );

insert into public.products (
  id, organization_id, product_code, name, status
) values
  (
    '11111111-1111-1111-1111-111111111171',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'OPS-PROD-A',
    'Operations Product A',
    'ACTIVE'
  );

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name, base_price, cost_price, status
) values
  (
    '22222222-2222-2222-2222-222222222271',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '11111111-1111-1111-1111-111111111171',
    'OPS-SKU-A',
    'Operations SKU A',
    100,
    60,
    'ACTIVE'
  );

insert into public.orders (
  id, organization_id, customer_id, order_number, source, order_status
) values
  (
    '99999999-9999-9999-9999-999999999971',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee71',
    'OPS-ORDER-A',
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
  '66666666-6666-6666-6666-666666666671',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  '99999999-9999-9999-9999-999999999971',
  '22222222-2222-2222-2222-222222222271',
  'OPS-SKU-A',
  'Operations Product A',
  'Operations SKU A',
  1,
  100,
  100,
  100
);

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received
) values (
  '14141414-1414-1414-1414-141414141471',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  '99999999-9999-9999-9999-999999999971',
  'UNPAID',
  100,
  0
);

insert into public.returns (
  id, organization_id, order_id, return_number, return_type, status, reason
) values (
  '15151515-1515-1515-1515-151515151571',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  '99999999-9999-9999-9999-999999999971',
  'OPS-RETURN-A',
  'CUSTOMER_RETURN',
  'REQUESTED',
  'Operations return fixture'
);

insert into public.warehouses (
  id, organization_id, code, name, status
) values (
  '88888888-8888-8888-8888-888888888871',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  'OPS-WH-A',
  'Operations Warehouse A',
  'ACTIVE'
);

insert into public.fulfillments (
  id, organization_id, fulfillment_number, warehouse_id, status
) values (
  '16161616-1616-1616-1616-161616161671',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  'OPS-FULFILL-A',
  '88888888-8888-8888-8888-888888888871',
  'READY_TO_PICK'
);

insert into public.fulfillment_items (
  id, organization_id, fulfillment_id, order_id, order_item_id, variant_id, quantity
) values (
  '17171717-1717-1717-1717-171717171771',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  '16161616-1616-1616-1616-161616161671',
  '99999999-9999-9999-9999-999999999971',
  '66666666-6666-6666-6666-666666666671',
  '22222222-2222-2222-2222-222222222271',
  1
);

insert into public.shipping_providers (
  id, organization_id, provider_code, name, status
) values (
  '18181818-1818-1818-1818-181818181871',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  'OPS-SHIPPER',
  'Operations Shipper',
  'ACTIVE'
);

insert into public.shipments (
  id, organization_id, fulfillment_id, shipping_provider_id, shipment_number, status
) values (
  '19191919-1919-1919-1919-191919191971',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  '16161616-1616-1616-1616-161616161671',
  '18181818-1818-1818-1818-181818181871',
  'OPS-SHIPMENT-A',
  'DRAFT'
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa71',
  true
);

do $$
declare
  v_count integer;
  v_rows integer;
begin
  select count(*) into v_count
  from public.conversations
  where id in (
    '13131313-1313-1313-1313-131313131371'::uuid,
    '13131313-1313-1313-1313-131313131372'::uuid
  );

  if v_count <> 1 then
    raise exception 'operations user A conversation RLS count expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.payments
  where id = '14141414-1414-1414-1414-141414141471'::uuid;

  if v_count <> 1 then
    raise exception 'operations user A payment view expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.returns
  where id = '15151515-1515-1515-1515-151515151571'::uuid;

  if v_count <> 1 then
    raise exception 'operations user A return view expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.fulfillments
  where id = '16161616-1616-1616-1616-161616161671'::uuid;

  if v_count <> 1 then
    raise exception 'operations user A fulfillment view expected 1, got %', v_count;
  end if;

  select count(*) into v_count
  from public.shipments
  where id = '19191919-1919-1919-1919-191919191971'::uuid;

  if v_count <> 1 then
    raise exception 'operations user A shipment view expected 1, got %', v_count;
  end if;

  insert into public.messages (
    id,
    organization_id,
    conversation_id,
    external_message_id,
    direction,
    sender_type,
    message_type,
    content_text
  ) values (
    '20202020-2020-2020-2020-202020202071',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '13131313-1313-1313-1313-131313131371',
    'ops-message-a',
    'OUTBOUND',
    'STAFF',
    'TEXT',
    'Operations reply'
  );

  begin
    insert into public.payment_transactions (
      id,
      organization_id,
      payment_id,
      transaction_type,
      payment_method,
      amount,
      status
    ) values (
      '21212121-2121-2121-2121-212121212171',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
      '14141414-1414-1414-1414-141414141471',
      'PAYMENT',
      'CASH',
      100,
      'SUCCEEDED'
    );

    raise exception 'direct authenticated payment transaction insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  insert into public.return_status_history (
    id,
    organization_id,
    return_id,
    to_status,
    changed_by,
    reason
  ) values (
    '23232323-2323-2323-2323-232323232371',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '15151515-1515-1515-1515-151515151571',
    'APPROVED',
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    'Operations return approved'
  );

  insert into public.return_items (
    id,
    organization_id,
    return_id,
    order_item_id,
    quantity,
    condition_status,
    restockable
  ) values (
    '24242424-2424-2424-2424-242424242471',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '15151515-1515-1515-1515-151515151571',
    '66666666-6666-6666-6666-666666666671',
    1,
    'NEW',
    true
  );

  insert into public.return_inventory_dispositions (
    id,
    organization_id,
    return_item_id,
    disposition,
    quantity,
    warehouse_id,
    inspected_by,
    reason
  ) values (
    '25252525-2525-2525-2525-252525252571',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '24242424-2424-2424-2424-242424242471',
    'RESTOCK',
    1,
    '88888888-8888-8888-8888-888888888871',
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    'Operations return inspection'
  );

  insert into public.fulfillment_events (
    id,
    organization_id,
    fulfillment_id,
    event_type,
    actor_profile_id
  ) values (
    '26262626-2626-2626-2626-262626262671',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '16161616-1616-1616-1616-161616161671',
    'PICK_STARTED',
    'cccccccc-cccc-cccc-cccc-cccccccccc71'
  );

  insert into public.fulfillment_qc_sessions (
    id,
    organization_id,
    fulfillment_id,
    status,
    started_by,
    started_at
  ) values (
    '27272727-2727-2727-2727-272727272771',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '16161616-1616-1616-1616-161616161671',
    'IN_PROGRESS',
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    now()
  );

  insert into public.fulfillment_qc_scans (
    id,
    organization_id,
    qc_session_id,
    fulfillment_item_id,
    variant_id,
    scan_type,
    scan_value,
    matched,
    quantity_increment,
    scanned_by
  ) values (
    '28282828-2828-2828-2828-282828282871',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '27272727-2727-2727-2727-272727272771',
    '17171717-1717-1717-1717-171717171771',
    '22222222-2222-2222-2222-222222222271',
    'STOCK_CODE',
    'OPS-SKU-A',
    true,
    1,
    'cccccccc-cccc-cccc-cccc-cccccccccc71'
  );

  insert into public.shipment_packages (
    id,
    organization_id,
    shipment_id,
    package_number,
    weight_grams
  ) values (
    '29292929-2929-2929-2929-292929292971',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    '19191919-1919-1919-1919-191919191971',
    1,
    500
  );

  update public.conversations
  set assigned_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc71'::uuid
  where id = '13131313-1313-1313-1313-131313131371'::uuid;

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'operations conversation assignment update expected 1 row, got %', v_rows;
  end if;

  begin
    insert into public.messages (
      id,
      organization_id,
      conversation_id,
      direction,
      sender_type,
      message_type,
      content_text
    ) values (
      '20202020-2020-2020-2020-202020202072',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
      '13131313-1313-1313-1313-131313131372',
      'OUTBOUND',
      'STAFF',
      'TEXT',
      'Cross tenant reply should fail'
    );

    raise exception 'operations cross-tenant message insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa72',
  true
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.conversations
  where id in (
    '13131313-1313-1313-1313-131313131371'::uuid,
    '13131313-1313-1313-1313-131313131372'::uuid
  );

  if v_count <> 1 then
    raise exception 'operations user B conversation view expected 1 own row, got %', v_count;
  end if;

  select count(*) into v_count
  from public.payments
  where id = '14141414-1414-1414-1414-141414141471'::uuid;

  if v_count <> 0 then
    raise exception 'operations user B payment view expected 0 rows, got %', v_count;
  end if;

  begin
    insert into public.messages (
      id,
      organization_id,
      conversation_id,
      direction,
      sender_type,
      message_type,
      content_text
    ) values (
      '20202020-2020-2020-2020-202020202073',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72',
      '13131313-1313-1313-1313-131313131372',
      'OUTBOUND',
      'STAFF',
      'TEXT',
      'Missing reply permission should fail'
    );

    raise exception 'operations user B message insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'operations_permission_rls' as check_name, 'pass' as result;

rollback;
