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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa161',
    'authenticated',
    'authenticated',
    'commerce-a2-full@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa162',
    'authenticated',
    'authenticated',
    'commerce-a2-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1', 'Commerce A2 Org A', 'commerce-a2-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf2', 'Commerce A2 Org B', 'commerce-a2-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccf1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa161',
    'Commerce A2 Full',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccf2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa162',
    'Commerce A2 Limited',
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
    'dddddddd-dddd-dddd-dddd-ddddddddddf1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
    'cccccccc-cccc-cccc-cccc-ccccccccccf1',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddf2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
    'cccccccc-cccc-cccc-cccc-ccccccccccf2',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-7777777777f1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
    'commerce_a2_full',
    'Commerce A2 Full',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-7777777777f2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
    'commerce_a2_limited',
    'Commerce A2 Limited',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-7777777777f1'::uuid, id
from public.permissions
where code in (
  'product.view',
  'inventory.view',
  'inventory.adjust',
  'customer.view',
  'customer.edit',
  'conversation.view',
  'conversation.reply',
  'conversation.assign',
  'order.view',
  'order.create',
  'order.edit',
  'promotion.view',
  'payment.view',
  'payment.verify',
  'payment.refund',
  'warehouse.pick',
  'warehouse.qc',
  'shipping.create',
  'shipping.print_label',
  'return.view',
  'return.manage',
  'return.inspect'
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-7777777777f2'::uuid, id
from public.permissions
where code in (
  'product.view',
  'inventory.view',
  'customer.view',
  'conversation.view',
  'order.view'
);

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddf1',
    '77777777-7777-7777-7777-7777777777f1'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddf2',
    '77777777-7777-7777-7777-7777777777f2'
  );

insert into public.channel_accounts (
  id,
  organization_id,
  provider,
  external_account_id,
  display_name,
  status
) values (
  '55555555-5555-5555-5555-5555555555f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'LINE',
  'commerce-a2-line',
  'Commerce A2 LINE',
  'ACTIVE'
);

insert into public.customers (
  id,
  organization_id,
  customer_code,
  display_name,
  phone,
  status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-CUST-A',
  'Commerce A2 Customer',
  '0800000000',
  'ACTIVE'
);

insert into public.conversations (
  id,
  organization_id,
  channel_account_id,
  customer_id,
  external_conversation_id,
  status,
  assigned_profile_id,
  last_message_at
) values (
  '12121212-1212-1212-1212-1212121212f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '55555555-5555-5555-5555-5555555555f1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  'a2-conversation-1',
  'OPEN',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1',
  now()
);

insert into public.messages (
  id,
  organization_id,
  conversation_id,
  external_message_id,
  direction,
  sender_type,
  message_type,
  content_text,
  received_at
) values (
  '13131313-1313-1313-1313-1313131313f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '12121212-1212-1212-1212-1212121212f1',
  'a2-message-1',
  'INBOUND',
  'CUSTOMER',
  'TEXT',
  'CF A2-SKU-A 2',
  now()
);

insert into public.products (
  id,
  organization_id,
  product_code,
  name,
  status
) values (
  '11111111-1111-1111-1111-1111111111f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-PROD-A',
  'Commerce A2 Product',
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
) values (
  '22222222-2222-2222-2222-2222222222f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '11111111-1111-1111-1111-1111111111f1',
  'A2-SKU-A',
  'Commerce A2 Variant',
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
) values (
  '88888888-8888-8888-8888-8888888888f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-WH-A',
  'Commerce A2 Warehouse',
  'ACTIVE'
);

insert into public.carts (
  id,
  organization_id,
  customer_id,
  conversation_id,
  source,
  status,
  subtotal,
  discount_total,
  grand_total,
  created_by
) values (
  '33333333-3333-3333-3333-3333333333f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  '12121212-1212-1212-1212-1212121212f1',
  'CHAT',
  'OPEN',
  200,
  20,
  180,
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.cart_items (
  id,
  organization_id,
  cart_id,
  variant_id,
  requested_quantity,
  reserved_quantity,
  original_unit_price,
  calculated_unit_price,
  line_discount_total,
  line_total,
  pricing_snapshot_json
) values (
  '44444444-4444-4444-4444-4444444444f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '33333333-3333-3333-3333-3333333333f1',
  '22222222-2222-2222-2222-2222222222f1',
  2,
  0,
  100,
  90,
  20,
  180,
  '{"price_source":"validation","promotion_code":"A2-PROMO"}'::jsonb
);

update public.cart_items
set reserved_quantity = 2
where id = '44444444-4444-4444-4444-4444444444f1';

update public.carts
set status = 'RESERVED'
where id = '33333333-3333-3333-3333-3333333333f1';

insert into public.purchase_sessions (
  id,
  organization_id,
  customer_id,
  session_number,
  source_context,
  status,
  created_by
) values (
  '66666666-6666-6666-6666-6666666666f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  'A2-SESSION-A',
  'CHAT',
  'OPEN',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.orders (
  id,
  organization_id,
  customer_id,
  order_number,
  source,
  order_status,
  payment_status,
  fulfillment_status,
  subtotal,
  item_discount_total,
  grand_total,
  amount_due,
  created_by
) values (
  '99999999-9999-9999-9999-9999999999f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  'A2-ORDER-A',
  'CHAT',
  'CONFIRMED',
  'UNPAID',
  'UNFULFILLED',
  200,
  20,
  180,
  180,
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.order_items (
  id,
  organization_id,
  order_id,
  variant_id,
  sku_snapshot,
  sale_code_snapshot,
  product_name_snapshot,
  variant_name_snapshot,
  quantity,
  original_unit_price,
  applied_unit_price,
  unit_cost_snapshot,
  line_discount_total,
  line_total,
  source_cart_item_id
) values (
  '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '99999999-9999-9999-9999-9999999999f1',
  '22222222-2222-2222-2222-2222222222f1',
  'A2-SKU-A',
  'A2-SALE',
  'Commerce A2 Product',
  'Commerce A2 Variant',
  2,
  100,
  90,
  60,
  20,
  180,
  '44444444-4444-4444-4444-4444444444f1'
);

insert into public.purchase_session_orders (
  purchase_session_id,
  order_id,
  added_by
) values (
  '66666666-6666-6666-6666-6666666666f1',
  '99999999-9999-9999-9999-9999999999f1',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.conversation_orders (
  conversation_id,
  order_id
) values (
  '12121212-1212-1212-1212-1212121212f1',
  '99999999-9999-9999-9999-9999999999f1'
);

insert into public.promotion_campaigns (
  id,
  organization_id,
  code,
  name,
  status,
  scope,
  priority,
  stackable,
  created_by
) values (
  'abababab-abab-abab-abab-abababababf1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-PROMO',
  'Commerce A2 Promotion',
  'ACTIVE',
  'ORDER',
  10,
  true,
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.promotion_campaign_versions (
  id,
  organization_id,
  campaign_id,
  version_number,
  status,
  published_at,
  published_by
) values (
  'abababab-abab-abab-abab-abababababf2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'abababab-abab-abab-abab-abababababf1',
  1,
  'ACTIVE',
  now(),
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.promotion_rules (
  id,
  organization_id,
  campaign_version_id,
  rule_type,
  scope_type,
  min_quantity,
  priority,
  value_json
) values (
  'abababab-abab-abab-abab-abababababf3',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'abababab-abab-abab-abab-abababababf2',
  'MIN_QUANTITY',
  'ORDER',
  2,
  10,
  '{"min_quantity":2}'::jsonb
);

insert into public.promotion_actions (
  id,
  organization_id,
  campaign_version_id,
  rule_id,
  action_type,
  priority,
  value_json
) values (
  'abababab-abab-abab-abab-abababababf4',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'abababab-abab-abab-abab-abababababf2',
  'abababab-abab-abab-abab-abababababf3',
  'FIXED_DISCOUNT',
  10,
  '{"amount":20}'::jsonb
);

insert into public.promotion_applied_benefits (
  id,
  organization_id,
  order_id,
  order_item_id,
  purchase_session_id,
  campaign_id,
  campaign_version_id,
  rule_id,
  action_id,
  benefit_type,
  original_amount,
  benefit_amount,
  final_amount,
  quantity,
  snapshot_json
) values (
  'abababab-abab-abab-abab-abababababf5',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '99999999-9999-9999-9999-9999999999f1',
  '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1',
  '66666666-6666-6666-6666-6666666666f1',
  'abababab-abab-abab-abab-abababababf1',
  'abababab-abab-abab-abab-abababababf2',
  'abababab-abab-abab-abab-abababababf3',
  'abababab-abab-abab-abab-abababababf4',
  'FIXED_DISCOUNT',
  200,
  20,
  180,
  2,
  '{"campaign_code":"A2-PROMO","version":1,"benefit_amount":20}'::jsonb
);

insert into public.payments (
  id,
  organization_id,
  order_id,
  status,
  amount_expected,
  amount_received
) values (
  '14141414-1414-1414-1414-1414141414f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '99999999-9999-9999-9999-9999999999f1',
  'PAID',
  180,
  180
);

insert into public.payment_transactions (
  id,
  organization_id,
  payment_id,
  transaction_type,
  payment_method,
  amount,
  provider,
  external_reference,
  status,
  paid_at,
  created_by
) values (
  '21212121-2121-2121-2121-2121212121f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '14141414-1414-1414-1414-1414141414f1',
  'PAYMENT',
  'CASH',
  180,
  'manual',
  'a2-payment-1',
  'SUCCEEDED',
  now(),
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

update public.orders
set payment_status = 'PAID',
    amount_paid = 180,
    amount_due = 0
where id = '99999999-9999-9999-9999-9999999999f1';

insert into public.customer_credit_accounts (
  id,
  organization_id,
  customer_id,
  available_balance,
  status
) values (
  '43434343-4343-4343-4343-4343434343f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  25,
  'ACTIVE'
);

insert into public.customer_credit_lots (
  id,
  organization_id,
  credit_account_id,
  lot_type,
  source_type,
  source_id,
  original_amount,
  remaining_amount
) values (
  '45454545-4545-4545-4545-4545454545f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '43434343-4343-4343-4343-4343434343f1',
  'REFUND',
  'RETURN',
  null,
  25,
  25
);

insert into public.customer_credit_transactions (
  id,
  organization_id,
  credit_account_id,
  lot_id,
  transaction_type,
  amount_delta,
  order_id,
  payment_transaction_id,
  source_type,
  source_id,
  reason,
  created_by
) values (
  '46464646-4646-4646-4646-4646464646f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '43434343-4343-4343-4343-4343434343f1',
  '45454545-4545-4545-4545-4545454545f1',
  'CREDIT_ISSUED',
  25,
  '99999999-9999-9999-9999-9999999999f1',
  '21212121-2121-2121-2121-2121212121f1',
  'RETURN',
  null,
  'A2 credit validation',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.loyalty_programs (
  id,
  organization_id,
  code,
  name,
  status,
  earning_trigger
) values (
  '51515151-5151-5151-5151-5151515151f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-LOYALTY',
  'Commerce A2 Loyalty',
  'ACTIVE',
  'PAID'
);

insert into public.loyalty_accounts (
  id,
  organization_id,
  program_id,
  customer_id,
  points_balance,
  status
) values (
  '52525252-5252-5252-5252-5252525252f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '51515151-5151-5151-5151-5151515151f1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeef1',
  18,
  'ACTIVE'
);

insert into public.loyalty_transactions (
  id,
  organization_id,
  loyalty_account_id,
  transaction_type,
  points_delta,
  order_id,
  order_item_id,
  source_type,
  source_id
) values (
  '53535353-5353-5353-5353-5353535353f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '52525252-5252-5252-5252-5252525252f1',
  'EARN',
  18,
  '99999999-9999-9999-9999-9999999999f1',
  '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1',
  'ORDER_PAID',
  '99999999-9999-9999-9999-9999999999f1'
);

insert into public.fulfillments (
  id,
  organization_id,
  fulfillment_number,
  warehouse_id,
  status,
  created_by
) values (
  '16161616-1616-1616-1616-1616161616f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-FULFILL-A',
  '88888888-8888-8888-8888-8888888888f1',
  'QC_PENDING',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.fulfillment_items (
  id,
  organization_id,
  fulfillment_id,
  order_id,
  order_item_id,
  variant_id,
  quantity
) values (
  '17171717-1717-1717-1717-1717171717f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '16161616-1616-1616-1616-1616161616f1',
  '99999999-9999-9999-9999-9999999999f1',
  '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1',
  '22222222-2222-2222-2222-2222222222f1',
  2
);

insert into public.fulfillment_qc_sessions (
  id,
  organization_id,
  fulfillment_id,
  status,
  started_by,
  started_at
) values (
  '27272727-2727-2727-2727-2727272727f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '16161616-1616-1616-1616-1616161616f1',
  'IN_PROGRESS',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1',
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
  '28282828-2828-2828-2828-2828282828f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '27272727-2727-2727-2727-2727272727f1',
  '17171717-1717-1717-1717-1717171717f1',
  2,
  2,
  'PASSED'
);

insert into public.shipping_providers (
  id,
  organization_id,
  provider_code,
  name,
  status
) values (
  '18181818-1818-1818-1818-1818181818f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  'A2-CARRIER',
  'Commerce A2 Carrier',
  'ACTIVE'
);

insert into public.shipments (
  id,
  organization_id,
  fulfillment_id,
  shipping_provider_id,
  shipment_number,
  status
) values (
  '19191919-1919-1919-1919-1919191919f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '16161616-1616-1616-1616-1616161616f1',
  '18181818-1818-1818-1818-1818181818f1',
  'A2-SHIPMENT-A',
  'DRAFT'
);

insert into public.returns (
  id,
  organization_id,
  order_id,
  return_number,
  return_type,
  status,
  resolution_type,
  reason,
  created_by
) values (
  '15151515-1515-1515-1515-1515151515f1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '99999999-9999-9999-9999-9999999999f1',
  'A2-RETURN-A',
  'CUSTOMER_RETURN',
  'APPROVED',
  'REFUND',
  'A2 return validation',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.return_items (
  id,
  organization_id,
  return_id,
  order_item_id,
  quantity,
  condition_status,
  restockable,
  refund_amount
) values (
  '1e1e1e1e-1e1e-1e1e-1e1e-1e1e1e1e1ef1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '15151515-1515-1515-1515-1515151515f1',
  '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1',
  1,
  'RESTOCKABLE',
  true,
  90
);

insert into public.returns (
  id,
  organization_id,
  order_id,
  return_number,
  return_type,
  status,
  reason,
  created_by
) values (
  '15151515-1515-1515-1515-1515151515f2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '99999999-9999-9999-9999-9999999999f1',
  'A2-RTO-A',
  'RTO',
  'RECEIVED',
  'A2 RTO validation',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

insert into public.return_items (
  id,
  organization_id,
  return_id,
  order_item_id,
  quantity,
  condition_status,
  restockable,
  refund_amount
) values (
  '1e1e1e1e-1e1e-1e1e-1e1e-1e1e1e1e1ef2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '15151515-1515-1515-1515-1515151515f2',
  '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1',
  1,
  'QUARANTINE',
  false,
  null
);

insert into public.return_inventory_dispositions (
  id,
  organization_id,
  return_item_id,
  disposition,
  quantity,
  warehouse_id,
  reason,
  inspected_by
) values (
  '2a2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2af2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
  '1e1e1e1e-1e1e-1e1e-1e1e-1e1e1e1e1ef2',
  'QUARANTINE',
  1,
  '88888888-8888-8888-8888-8888888888f1',
  'RTO stock held for inspection',
  'cccccccc-cccc-cccc-cccc-ccccccccccf1'
);

do $$
declare
  v_original_snapshot jsonb;
  v_current_snapshot jsonb;
begin
  select snapshot_json into v_original_snapshot
  from public.promotion_applied_benefits
  where id = 'abababab-abab-abab-abab-abababababf5'::uuid;

  update public.promotion_campaign_versions
  set status = 'RETIRED'
  where id = 'abababab-abab-abab-abab-abababababf2'::uuid;

  select snapshot_json into v_current_snapshot
  from public.promotion_applied_benefits
  where id = 'abababab-abab-abab-abab-abababababf5'::uuid;

  if v_current_snapshot <> v_original_snapshot
     or v_current_snapshot ->> 'campaign_code' <> 'A2-PROMO'
     or (v_current_snapshot ->> 'benefit_amount')::numeric <> 20 then
    raise exception 'promotion applied benefit snapshot mutated unexpectedly';
  end if;

  begin
    update public.customer_credit_transactions
    set amount_delta = 1
    where id = '46464646-4646-4646-4646-4646464646f1'::uuid;

    raise exception 'credit ledger update unexpectedly succeeded';
  exception
    when raise_exception then null;
  end;

  begin
    delete from public.loyalty_transactions
    where id = '53535353-5353-5353-5353-5353535353f1'::uuid;

    raise exception 'loyalty ledger delete unexpectedly succeeded';
  exception
    when raise_exception then null;
  end;
end $$;

set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa161', true);

do $$
declare
  v_reservation_id uuid;
  v_allocation_id uuid;
  v_qc_id uuid;
  v_shipment_id uuid;
  v_tracking_id uuid;
  v_refund_id uuid;
  v_count integer;
begin
  perform public.api_post_inventory_movement(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    '88888888-8888-8888-8888-8888888888f1'::uuid,
    '22222222-2222-2222-2222-2222222222f1'::uuid,
    'OPENING_BALANCE',
    2,
    'VALIDATION',
    null,
    'A2 initial stock'
  );

  v_reservation_id := public.api_reserve_inventory(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    '88888888-8888-8888-8888-8888888888f1'::uuid,
    '22222222-2222-2222-2222-2222222222f1'::uuid,
    '33333333-3333-3333-3333-3333333333f1'::uuid,
    2,
    now() + interval '1 hour'
  );

  begin
    perform public.api_reserve_inventory(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
      '88888888-8888-8888-8888-8888888888f1'::uuid,
      '22222222-2222-2222-2222-2222222222f1'::uuid,
      '33333333-3333-3333-3333-3333333333f1'::uuid,
      1,
      now() + interval '1 hour'
    );

    raise exception 'oversell reservation unexpectedly succeeded';
  exception
    when others then
      if sqlerrm <> 'Insufficient available inventory' then
        raise;
      end if;
  end;

  v_allocation_id := public.api_convert_reservation_to_allocation(
    v_reservation_id,
    '99999999-9999-9999-9999-9999999999f1'::uuid,
    '6f6f6f6f-6f6f-6f6f-6f6f-6f6f6f6f6ff1'::uuid
  );

  if v_allocation_id is null then
    raise exception 'reservation allocation returned null';
  end if;

  select count(*) into v_count
  from public.inventory_balances
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid
    and warehouse_id = '88888888-8888-8888-8888-8888888888f1'::uuid
    and variant_id = '22222222-2222-2222-2222-2222222222f1'::uuid
    and on_hand = 2
    and reserved = 0
    and allocated = 2
    and available = 0;

  if v_count <> 1 then
    raise exception 'A2 inventory balance did not reflect reservation-to-allocation';
  end if;

  v_qc_id := public.api_complete_qc_session(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    '27272727-2727-2727-2727-2727272727f1'::uuid,
    'A2 all quantities matched'
  );

  if v_qc_id <> '27272727-2727-2727-2727-2727272727f1'::uuid then
    raise exception 'A2 QC completion returned unexpected id';
  end if;

  v_shipment_id := public.api_create_shipment_label(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    '19191919-1919-1919-1919-1919191919f1'::uuid,
    'labels/A2-SHIPMENT-A.pdf',
    'TRACK-A2-A',
    'carrier-a2-a',
    70
  );

  perform public.api_mark_shipment_ready_for_handoff(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    v_shipment_id,
    'A2 staged for carrier'
  );

  v_tracking_id := public.api_record_carrier_tracking_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    '19191919-1919-1919-1919-1919191919f1'::uuid,
    'DELIVERED',
    'Delivered for A2 validation',
    '2026-07-27 16:00:00+07'::timestamptz,
    'DELIVERED',
    'a2-carrier-event-delivered',
    '{"source":"commerce-a2"}'::jsonb
  );

  if v_tracking_id is null then
    raise exception 'A2 tracking event returned null';
  end if;

  v_refund_id := public.api_process_refund(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
    '99999999-9999-9999-9999-9999999999f1'::uuid,
    'A2-REFUND-A',
    90,
    'CASH',
    'A2 approved return refund',
    '15151515-1515-1515-1515-1515151515f1'::uuid,
    '21212121-2121-2121-2121-2121212121f1'::uuid,
    'manual',
    'a2-refund-1'
  );

  if v_refund_id is null then
    raise exception 'A2 refund returned null';
  end if;

  select count(*) into v_count
  from public.refunds r
  join public.refund_transactions rt
    on rt.organization_id = r.organization_id
   and rt.refund_id = r.id
  where r.id = v_refund_id
    and r.return_id = '15151515-1515-1515-1515-1515151515f1'::uuid
    and r.amount = 90
    and rt.amount = 90
    and rt.status = 'PENDING';

  if v_count <> 1 then
    raise exception 'A2 refund transaction did not link return/payment correctly';
  end if;

  select count(*) into v_count
  from public.returns r
  left join public.return_items ri
    on ri.organization_id = r.organization_id
   and ri.return_id = r.id
  left join public.return_inventory_dispositions rid
    on rid.organization_id = ri.organization_id
   and rid.return_item_id = ri.id
  where r.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid
    and (
      (r.return_type = 'CUSTOMER_RETURN' and r.status = 'APPROVED' and ri.refund_amount = 90)
      or (r.return_type = 'RTO' and r.status = 'RECEIVED' and rid.disposition = 'QUARANTINE')
    );

  if v_count <> 2 then
    raise exception 'A2 expected customer return and RTO coverage, got %', v_count;
  end if;

end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa162', true);

do $$
begin
  begin
    perform public.api_reserve_inventory(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
      '88888888-8888-8888-8888-8888888888f1'::uuid,
      '22222222-2222-2222-2222-2222222222f1'::uuid,
      '33333333-3333-3333-3333-3333333333f1'::uuid,
      1,
      now() + interval '1 hour'
    );

    raise exception 'limited user inventory reservation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_process_refund(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid,
      '99999999-9999-9999-9999-9999999999f1'::uuid,
      'A2-REFUND-LIMITED',
      1,
      'CASH',
      'Missing refund permission',
      null,
      '21212121-2121-2121-2121-2121212121f1'::uuid
    );

    raise exception 'limited user refund unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
declare
  v_count integer;
  v_snapshot jsonb;
begin
  select snapshot_json into v_snapshot
  from public.promotion_applied_benefits
  where id = 'abababab-abab-abab-abab-abababababf5'::uuid;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    after_json,
    reason
  ) values
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
      'cccccccc-cccc-cccc-cccc-ccccccccccf1',
      'USER',
      'CART',
      '33333333-3333-3333-3333-3333333333f1',
      'RESERVED',
      '{"source":"commerce-a2"}'::jsonb,
      'A2 cart reserved'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
      'cccccccc-cccc-cccc-cccc-ccccccccccf1',
      'USER',
      'ORDER',
      '99999999-9999-9999-9999-9999999999f1',
      'CONFIRMED',
      '{"source":"commerce-a2"}'::jsonb,
      'A2 order confirmed'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
      'cccccccc-cccc-cccc-cccc-ccccccccccf1',
      'USER',
      'PROMOTION_APPLIED_BENEFIT',
      'abababab-abab-abab-abab-abababababf5',
      'SNAPSHOT_CREATED',
      v_snapshot,
      'A2 promotion snapshot'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
      'cccccccc-cccc-cccc-cccc-ccccccccccf1',
      'USER',
      'PAYMENT',
      '14141414-1414-1414-1414-1414141414f1',
      'PAID',
      '{"amount_received":180}'::jsonb,
      'A2 payment recorded'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
      'cccccccc-cccc-cccc-cccc-ccccccccccf1',
      'USER',
      'SHIPMENT',
      '19191919-1919-1919-1919-1919191919f1',
      'DELIVERED',
      '{"tracking_event_id":"a2-carrier-event-delivered"}'::jsonb,
      'A2 shipment delivered'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1',
      'cccccccc-cccc-cccc-cccc-ccccccccccf1',
      'USER',
      'RETURN',
      '15151515-1515-1515-1515-1515151515f1',
      'REFUND_REQUESTED',
      '{"refund_amount":90}'::jsonb,
      'A2 return refund'
    );

  select count(distinct entity_type) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid
    and action in (
      'RESERVED',
      'CONFIRMED',
      'SNAPSHOT_CREATED',
      'PAID',
      'DELIVERED',
      'REFUND_REQUESTED'
    );

  if v_count <> 6 then
    raise exception 'A2 audit completeness expected six audited domains, got %', v_count;
  end if;

  begin
    update public.audit_logs
    set reason = 'mutated'
    where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf1'::uuid
      and entity_type = 'ORDER'
      and action = 'CONFIRMED';

    raise exception 'audit update unexpectedly succeeded';
  exception
    when raise_exception then null;
  end;
end $$;

select 'commerce_integration_a2' as check_name, 'pass' as result;

rollback;
