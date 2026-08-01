\set ON_ERROR_STOP on

begin;

do $$
declare
  v_verify oid := to_regprocedure(
    'public.api_verify_storefront_payment(uuid,uuid,text,text,uuid)'
  );
  v_reject oid := to_regprocedure(
    'public.api_reject_storefront_payment(uuid,uuid,text,text,uuid)'
  );
  v_failed_event oid := to_regprocedure(
    'public.api_record_storefront_payment_failed_event(uuid,uuid,uuid)'
  );
  v_helper oid;
begin
  if v_verify is null or v_reject is null or v_failed_event is null then
    raise exception 'Staff Review action functions are missing';
  end if;

  if not exists (
    select 1 from pg_proc p
    where p.oid = v_verify and p.prosecdef and p.provolatile = 'v'
      and 'search_path=""' = any(p.proconfig)
  ) or not exists (
    select 1 from pg_proc p
    where p.oid = v_reject and p.prosecdef and p.provolatile = 'v'
      and 'search_path=""' = any(p.proconfig)
  ) or not exists (
    select 1 from pg_proc p
    where p.oid = v_failed_event and p.prosecdef and p.provolatile = 'v'
      and 'search_path=""' = any(p.proconfig)
  ) then
    raise exception 'Staff Review action functions are not hardened';
  end if;

  if not has_function_privilege('authenticated', v_verify, 'EXECUTE')
     or not has_function_privilege('authenticated', v_reject, 'EXECUTE')
     or has_function_privilege('anon', v_verify, 'EXECUTE')
     or has_function_privilege('service_role', v_verify, 'EXECUTE')
     or has_function_privilege('anon', v_reject, 'EXECUTE')
     or has_function_privilege('service_role', v_reject, 'EXECUTE')
     or not has_function_privilege('service_role', v_failed_event, 'EXECUTE')
     or has_function_privilege('anon', v_failed_event, 'EXECUTE')
     or has_function_privilege('authenticated', v_failed_event, 'EXECUTE') then
    raise exception 'Staff Review action grants are incorrect';
  end if;

  foreach v_helper in array array[
    to_regprocedure('public.internal_claim_storefront_payment_review(uuid,text,uuid,uuid,uuid,text,text)'),
    to_regprocedure('public.internal_complete_storefront_payment_review(uuid,text,uuid,uuid)'),
    to_regprocedure('public.internal_storefront_payment_review_response(uuid,uuid,text,boolean)'),
    to_regprocedure('public.internal_settle_storefront_payment(uuid,uuid,uuid,text,uuid)')
  ] loop
    if v_helper is null
       or has_function_privilege('anon', v_helper, 'EXECUTE')
       or has_function_privilege('authenticated', v_helper, 'EXECUTE')
       or has_function_privilege('service_role', v_helper, 'EXECUTE') then
      raise exception 'Internal Staff Review helper exposure is incorrect';
    end if;
  end loop;

  if exists (
    select 1
    from pg_policy policy
    join pg_class target on target.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = target.relnamespace
    where namespace.nspname = 'public'
      and (target.relname, policy.polname) in (
        ('payments', 'payments_permission_update'),
        ('payment_transactions', 'payment_transactions_permission_insert'),
        ('payment_transactions', 'payment_transactions_permission_update'),
        ('payment_proofs', 'payment_proofs_permission_insert'),
        ('payment_proofs', 'payment_proofs_permission_update')
      )
  )
     or has_table_privilege('authenticated', 'public.payments', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.payment_transactions', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.payment_proofs', 'INSERT,UPDATE,DELETE')
     or not has_table_privilege('authenticated', 'public.payments', 'SELECT')
     or not has_table_privilege('authenticated', 'public.payment_transactions', 'SELECT')
     or not has_table_privilege('authenticated', 'public.payment_proofs', 'SELECT') then
    raise exception 'Direct Payment write closure or read preservation failed';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'action-reviewer@example.test', now(), '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'action-viewer@example.test', now(), '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'action-customer@example.test', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, slug, status, currency_code)
values ('a1000000-0000-4000-8000-000000000001', 'Review Actions', 'review-actions', 'ACTIVE', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Action Reviewer', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Action Viewer', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'Action Customer', 'ACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'ACTIVE', true, now()),
  ('a3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'ACTIVE', true, now()),
  ('a3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000003', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status)
values
  ('a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'PAYMENT_REVIEWER', 'Payment Reviewer', 'ACTIVE'),
  ('a4000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'PAYMENT_VIEWER', 'Payment Viewer', 'ACTIVE');

insert into public.role_permissions (role_id, permission_id)
select 'a4000000-0000-4000-8000-000000000001', id
from public.permissions where code in ('payment.view', 'payment.verify');

insert into public.role_permissions (role_id, permission_id)
select 'a4000000-0000-4000-8000-000000000002', id
from public.permissions where code = 'payment.view';

insert into public.membership_roles (membership_id, role_id)
values
  ('a3000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001'),
  ('a3000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000002');

insert into public.organization_checkout_settings (
  organization_id, status, currency_code, reservation_minutes, payment_due_minutes
) values ('a1000000-0000-4000-8000-000000000001', 'ACTIVE', 'THB', 15, 15);

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, valid_from
)
select 'a1000000-0000-4000-8000-000000000001', feature.id,
       'MANUAL_OVERRIDE', true, now() - interval '1 day'
from public.features feature
where feature.code = 'storefront.checkout';

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values ('a5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'ACTION-CUSTOMER', 'Action Customer', 'ACTIVE');

insert into public.products (
  id, organization_id, product_code, name, status
) values ('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'ACTION-PRODUCT', 'Action Product', 'ACTIVE');

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name, base_price, status
) values ('a6100000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'ACTION-SKU', 'Action Variant', 100, 'ACTIVE');

insert into public.warehouses (id, organization_id, code, name, status)
values ('a6200000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'ACTION-WH', 'Action Warehouse', 'ACTIVE');

insert into public.inventory_balances (
  id, organization_id, warehouse_id, variant_id, on_hand, reserved, allocated, available
) values ('a6300000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a6200000-0000-4000-8000-000000000001', 'a6100000-0000-4000-8000-000000000001', 10, 4, 0, 6);

insert into public.carts (
  id, organization_id, customer_id, source, status, currency_code,
  payment_due_at, reserved_until, subtotal, grand_total, created_by
) values
  ('a7000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'STOREFRONT', 'CONVERTED', 'THB', now() + interval '15 minutes', now() + interval '15 minutes', 100, 100, 'a2000000-0000-4000-8000-000000000003'),
  ('a7000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'STOREFRONT', 'CONVERTED', 'THB', now() + interval '15 minutes', now() + interval '15 minutes', 200, 200, 'a2000000-0000-4000-8000-000000000003'),
  ('a7000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'STOREFRONT', 'CONVERTED', 'THB', now() + interval '15 minutes', now() + interval '15 minutes', 300, 300, 'a2000000-0000-4000-8000-000000000003'),
  ('a7000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'STOREFRONT', 'CONVERTED', 'THB', now() + interval '15 minutes', now() + interval '15 minutes', 400, 400, 'a2000000-0000-4000-8000-000000000003');

insert into public.orders (
  id, organization_id, customer_id, order_number, source, source_cart_id,
  currency_code, order_status, payment_status, fulfillment_status, subtotal,
  grand_total, amount_paid, amount_due, payment_due_at
) values
  ('a7100000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'ACTION-VERIFY', 'STOREFRONT', 'a7000000-0000-4000-8000-000000000001', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('a7100000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'ACTION-REJECT', 'STOREFRONT', 'a7000000-0000-4000-8000-000000000002', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 200, 200, 0, 200, now() + interval '15 minutes'),
  ('a7100000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'ACTION-SELF', 'STOREFRONT', 'a7000000-0000-4000-8000-000000000003', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 300, 300, 0, 300, now() + interval '15 minutes'),
  ('a7100000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'ACTION-ROLLBACK', 'STOREFRONT', 'a7000000-0000-4000-8000-000000000004', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 400, 400, 0, 400, now() + interval '15 minutes');

insert into public.order_items (
  id, organization_id, order_id, variant_id, sku_snapshot,
  product_name_snapshot, variant_name_snapshot, quantity,
  original_unit_price, applied_unit_price, line_total
) values
  ('a7200000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 'a6100000-0000-4000-8000-000000000001', 'ACTION-SKU', 'Action Product', 'Action Variant', 1, 100, 100, 100),
  ('a7200000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000002', 'a6100000-0000-4000-8000-000000000001', 'ACTION-SKU', 'Action Product', 'Action Variant', 1, 200, 200, 200),
  ('a7200000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000003', 'a6100000-0000-4000-8000-000000000001', 'ACTION-SKU', 'Action Product', 'Action Variant', 1, 300, 300, 300),
  ('a7200000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000004', 'a6100000-0000-4000-8000-000000000001', 'ACTION-SKU', 'Action Product', 'Action Variant', 1, 400, 400, 400);

insert into public.inventory_reservations (
  id, organization_id, warehouse_id, variant_id, cart_id, order_id,
  order_item_id, quantity, status, expires_at
) values
  ('a7300000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a6200000-0000-4000-8000-000000000001', 'a6100000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 'a7200000-0000-4000-8000-000000000001', 1, 'ACTIVE', now() + interval '15 minutes'),
  ('a7300000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a6200000-0000-4000-8000-000000000001', 'a6100000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000002', 'a7100000-0000-4000-8000-000000000002', 'a7200000-0000-4000-8000-000000000002', 1, 'ACTIVE', now() + interval '15 minutes'),
  ('a7300000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a6200000-0000-4000-8000-000000000001', 'a6100000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000003', 'a7100000-0000-4000-8000-000000000003', 'a7200000-0000-4000-8000-000000000003', 1, 'ACTIVE', now() + interval '15 minutes'),
  ('a7300000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a6200000-0000-4000-8000-000000000001', 'a6100000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000004', 'a7100000-0000-4000-8000-000000000004', 'a7200000-0000-4000-8000-000000000004', 1, 'ACTIVE', now() + interval '15 minutes');

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received, currency_code
) values
  ('a7400000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 'UNPAID', 100, 0, 'THB'),
  ('a7400000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000002', 'UNPAID', 200, 0, 'THB'),
  ('a7400000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000003', 'UNPAID', 300, 0, 'THB'),
  ('a7400000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000004', 'UNPAID', 400, 0, 'THB');

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, external_reference, status, created_by
) values
  ('a7500000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a7400000-0000-4000-8000-000000000001', 'PAYMENT', 'BANK_TRANSFER', 100, 'THB', 'REF-VERIFY-01', 'PENDING', 'a2000000-0000-4000-8000-000000000003'),
  ('a7500000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a7400000-0000-4000-8000-000000000002', 'PAYMENT', 'BANK_TRANSFER', 200, 'THB', 'REF-REJECT-02', 'PENDING', 'a2000000-0000-4000-8000-000000000003'),
  ('a7500000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a7400000-0000-4000-8000-000000000003', 'PAYMENT', 'BANK_TRANSFER', 300, 'THB', 'REF-SELF-03', 'PENDING', 'a2000000-0000-4000-8000-000000000001'),
  ('a7500000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a7400000-0000-4000-8000-000000000004', 'PAYMENT', 'BANK_TRANSFER', 400, 'THB', 'REF-ROLLBACK-04', 'PENDING', 'a2000000-0000-4000-8000-000000000003');

insert into public.payment_proofs (
  id, organization_id, payment_transaction_id, storage_path, mime_type,
  submitted_by_type, verification_status, metadata_json
) values
  ('a7600000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a7500000-0000-4000-8000-000000000001', null, null, 'CUSTOMER', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'),
  ('a7600000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a7500000-0000-4000-8000-000000000002', null, null, 'CUSTOMER', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'),
  ('a7600000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a7500000-0000-4000-8000-000000000003', null, null, 'CUSTOMER', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'),
  ('a7600000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a7500000-0000-4000-8000-000000000004', null, null, 'CUSTOMER', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}');

insert into public.coupons (
  id, organization_id, code, status, customer_id
) values ('a7700000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'ACTION-COUPON', 'ACTIVE', 'a5000000-0000-4000-8000-000000000001');

insert into public.coupon_redemptions (
  id, organization_id, coupon_id, customer_id, cart_id, order_id,
  status, reserved_at
) values ('a7800000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a7700000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 'RESERVED', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);

do $$
begin
  begin
    perform public.api_verify_storefront_payment(
      'a1000000-0000-4000-8000-000000000001',
      'a7500000-0000-4000-8000-000000000001',
      'PENDING', 'Matched settlement record',
      'a9000000-0000-4000-8000-000000000001'
    );
    raise exception 'View-only actor unexpectedly verified payment';
  exception when insufficient_privilege then
    if sqlerrm <> 'PAYMENT_VERIFY_PERMISSION_REQUIRED' then raise; end if;
  end;

  begin
    update public.payments set status = 'PAID'
    where id = 'a7400000-0000-4000-8000-000000000001';
    raise exception 'Direct Payment update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
begin
  v_result := public.api_verify_storefront_payment(
    'a1000000-0000-4000-8000-000000000001',
    'a7500000-0000-4000-8000-000000000001',
    'PENDING', 'Matched settlement record',
    'a9000000-0000-4000-8000-000000000001'
  );

  if v_result ->> 'transaction_status' <> 'SUCCEEDED'
     or v_result ->> 'proof_status' <> 'VERIFIED'
     or v_result ->> 'payment_status' <> 'PAID'
     or v_result ->> 'order_status' <> 'CONFIRMED'
     or v_result ->> 'allocation_count' <> '1'
     or v_result ->> 'coupon_consumed' <> 'true'
     or v_result ->> 'idempotency_reused' <> 'false'
     or v_result::text like '%REF-VERIFY-01%'
     or v_result::text like '%Matched settlement record%' then
    raise exception 'Approval response failed: %', v_result;
  end if;

  v_replay := public.api_verify_storefront_payment(
    'a1000000-0000-4000-8000-000000000001',
    'a7500000-0000-4000-8000-000000000001',
    'PENDING', 'Matched settlement record',
    'a9000000-0000-4000-8000-000000000001'
  );

  if v_replay ->> 'idempotency_reused' <> 'true' then
    raise exception 'Approval replay was not idempotent: %', v_replay;
  end if;

  begin
    perform public.api_verify_storefront_payment(
      'a1000000-0000-4000-8000-000000000001',
      'a7500000-0000-4000-8000-000000000001',
      'PENDING', 'Different settlement reason',
      'a9000000-0000-4000-8000-000000000001'
    );
    raise exception 'Changed intent unexpectedly reused request';
  exception when invalid_parameter_value then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.orders
    where id = 'a7100000-0000-4000-8000-000000000001'
      and order_status = 'CONFIRMED' and payment_status = 'PAID'
      and amount_paid = 100 and amount_due = 0
  ) or not exists (
    select 1 from public.payments
    where id = 'a7400000-0000-4000-8000-000000000001'
      and status = 'PAID' and amount_received = 100
  ) or not exists (
    select 1 from public.inventory_reservations
    where id = 'a7300000-0000-4000-8000-000000000001'
      and status = 'CONVERTED' and released_at is not null
  ) or not exists (
    select 1 from public.inventory_allocations
    where source_reservation_id = 'a7300000-0000-4000-8000-000000000001'
      and status = 'ACTIVE' and quantity = 1
  ) or not exists (
    select 1 from public.inventory_balances
    where id = 'a6300000-0000-4000-8000-000000000001'
      and on_hand = 10 and reserved = 3 and allocated = 1 and available = 6
  ) or (select count(*) from public.order_status_history
        where order_id = 'a7100000-0000-4000-8000-000000000001'
          and status_domain in ('PAYMENT', 'ORDER')) <> 2
     or (select count(*) from public.audit_logs
         where entity_id = 'a7500000-0000-4000-8000-000000000001'
           and action = 'PAYMENT_VERIFIED') <> 1
     or exists (
       select 1 from public.audit_logs
       where entity_id = 'a7500000-0000-4000-8000-000000000001'
         and (before_json::text like '%REF-VERIFY-01%'
              or after_json::text like '%REF-VERIFY-01%')
     ) then
    raise exception 'Approval atomic evidence failed';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_result jsonb;
begin
  v_result := public.api_reject_storefront_payment(
    'a1000000-0000-4000-8000-000000000001',
    'a7500000-0000-4000-8000-000000000002',
    'PENDING', 'Deposit could not be matched',
    'a9000000-0000-4000-8000-000000000002'
  );

  if v_result ->> 'transaction_status' <> 'FAILED'
     or v_result ->> 'proof_status' <> 'REJECTED'
     or v_result ->> 'payment_status' <> 'UNPAID'
     or v_result ->> 'order_status' <> 'PENDING_CONFIRMATION'
     or v_result ->> 'allocation_count' <> '0'
     or v_result ->> 'coupon_consumed' <> 'false' then
    raise exception 'Rejection response failed: %', v_result;
  end if;

  begin
    perform public.api_reject_storefront_payment(
      'a1000000-0000-4000-8000-000000000001',
      'a7500000-0000-4000-8000-000000000003',
      'PENDING', 'Customer evidence is unclear',
      'a9000000-0000-4000-8000-000000000003'
    );
    raise exception 'Self rejection unexpectedly succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'PAYMENT_REVIEW_SELF_ACTION_DENIED' then raise; end if;
  end;

  begin
    perform public.api_reject_storefront_payment(
      'a1000000-0000-4000-8000-000000000001',
      'a7500000-0000-4000-8000-000000000004',
      'PENDING', 'Contact me at 0812345678',
      'a9000000-0000-4000-8000-000000000004'
    );
    raise exception 'Private reason unexpectedly accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'PAYMENT_REASON_INVALID' then raise; end if;
  end;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.inventory_reservations
    where id = 'a7300000-0000-4000-8000-000000000002'
      and status = 'ACTIVE'
  ) or not exists (
    select 1 from public.orders
    where id = 'a7100000-0000-4000-8000-000000000002'
      and order_status = 'PENDING_CONFIRMATION'
      and payment_status = 'UNPAID' and amount_paid = 0 and amount_due = 200
  ) or (select count(*) from public.audit_logs
        where entity_id = 'a7500000-0000-4000-8000-000000000002'
          and action = 'PAYMENT_REJECTED') <> 1 then
    raise exception 'Rejection non-effects failed';
  end if;
end;
$$;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  v_first jsonb;
  v_second jsonb;
begin
  v_first := public.api_record_storefront_payment_failed_event(
    'a1000000-0000-4000-8000-000000000001',
    'a7500000-0000-4000-8000-000000000002',
    'a9000000-0000-4000-8000-000000000002'
  );
  v_second := public.api_record_storefront_payment_failed_event(
    'a1000000-0000-4000-8000-000000000001',
    'a7500000-0000-4000-8000-000000000002',
    'a9000000-0000-4000-8000-000000000002'
  );

  if v_first ->> 'idempotency_reused' <> 'false'
     or v_second ->> 'idempotency_reused' <> 'true'
     or v_first ->> 'event_id' <> v_second ->> 'event_id' then
    raise exception 'payment_failed event retry contract failed';
  end if;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.cart_events
      where event_type = 'payment_failed'
        and payload_json ->> 'review_request_id' =
          'a9000000-0000-4000-8000-000000000002') <> 1
     or exists (
       select 1 from public.cart_events
       where event_type = 'payment_failed'
         and payload_json::text like '%REF-REJECT-02%'
     ) then
    raise exception 'payment_failed event evidence failed';
  end if;
end;
$$;

create function pg_temp.fail_payment_verified_audit()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'PAYMENT_VERIFIED' then
    raise exception 'injected audit failure';
  end if;
  return new;
end;
$$;

create trigger test_fail_payment_verified_audit
before insert on public.audit_logs
for each row execute function pg_temp.fail_payment_verified_audit();

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);

do $$
begin
  begin
    perform public.api_verify_storefront_payment(
      'a1000000-0000-4000-8000-000000000001',
      'a7500000-0000-4000-8000-000000000004',
      'PENDING', 'Matched rollback settlement',
      'a9000000-0000-4000-8000-000000000005'
    );
    raise exception 'Injected settlement failure unexpectedly committed';
  exception when raise_exception then
    if sqlerrm <> 'PAYMENT_SETTLEMENT_FAILED' then raise; end if;
  end;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.payment_transactions
    where id = 'a7500000-0000-4000-8000-000000000004'
      and status = 'PENDING' and paid_at is null
  ) or not exists (
    select 1 from public.payment_proofs
    where id = 'a7600000-0000-4000-8000-000000000004'
      and verification_status = 'PENDING'
      and verified_by is null and verified_at is null
  ) or not exists (
    select 1 from public.orders
    where id = 'a7100000-0000-4000-8000-000000000004'
      and order_status = 'PENDING_CONFIRMATION' and payment_status = 'UNPAID'
  ) or not exists (
    select 1 from public.inventory_reservations
    where id = 'a7300000-0000-4000-8000-000000000004'
      and status = 'ACTIVE'
  ) or exists (
    select 1 from public.inventory_allocations
    where source_reservation_id = 'a7300000-0000-4000-8000-000000000004'
  ) or exists (
    select 1 from public.commerce_idempotency_keys
    where request_id = 'a9000000-0000-4000-8000-000000000005'
  ) then
    raise exception 'Injected settlement failure did not roll back atomically';
  end if;
end;
$$;

drop trigger test_fail_payment_verified_audit on public.audit_logs;

select 'phase_1d_manual_payment_staff_review_actions|pass';

commit;
