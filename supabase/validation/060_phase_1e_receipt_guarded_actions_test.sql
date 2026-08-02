\set ON_ERROR_STOP on

begin;

do $$
declare
  v_create oid := to_regprocedure(
    'public.api_create_receipt_document(uuid,uuid,uuid,uuid)'
  );
  v_void oid := to_regprocedure(
    'public.api_void_receipt_document(uuid,uuid,text,uuid)'
  );
  v_reverse oid := to_regprocedure(
    'public.api_reverse_receipt_document(uuid,uuid,text,uuid,uuid,uuid)'
  );
  v_helper oid;
begin
  if v_create is null or v_void is null or v_reverse is null then
    raise exception 'Receipt action function catalog is incomplete';
  end if;

  if not exists (
    select 1 from pg_proc procedure
    where procedure.oid = v_create
      and procedure.prosecdef
      and procedure.provolatile = 'v'
      and procedure.proowner = (select oid from pg_roles where rolname = 'postgres')
      and 'search_path=""' = any(procedure.proconfig)
  ) or not exists (
    select 1 from pg_proc procedure
    where procedure.oid = v_void
      and procedure.prosecdef
      and procedure.provolatile = 'v'
      and procedure.proowner = (select oid from pg_roles where rolname = 'postgres')
      and 'search_path=""' = any(procedure.proconfig)
  ) or not exists (
    select 1 from pg_proc procedure
    where procedure.oid = v_reverse
      and procedure.prosecdef
      and procedure.provolatile = 'v'
      and procedure.proowner = (select oid from pg_roles where rolname = 'postgres')
      and 'search_path=""' = any(procedure.proconfig)
  ) then
    raise exception 'Receipt action function hardening differs';
  end if;

  if not has_function_privilege('authenticated', v_create, 'EXECUTE')
     or not has_function_privilege('authenticated', v_void, 'EXECUTE')
     or not has_function_privilege('authenticated', v_reverse, 'EXECUTE')
     or has_function_privilege('anon', v_create, 'EXECUTE')
     or has_function_privilege('anon', v_void, 'EXECUTE')
     or has_function_privilege('anon', v_reverse, 'EXECUTE')
     or has_function_privilege('service_role', v_create, 'EXECUTE')
     or has_function_privilege('service_role', v_void, 'EXECUTE')
     or has_function_privilege('service_role', v_reverse, 'EXECUTE') then
    raise exception 'Receipt action grants differ';
  end if;

  foreach v_helper in array array[
    to_regprocedure('public.internal_claim_receipt_action(uuid,text,uuid,uuid,uuid,uuid,uuid,text)'),
    to_regprocedure('public.internal_complete_receipt_action(uuid,text,uuid,uuid)'),
    to_regprocedure('public.internal_fail_receipt_action(uuid,text,uuid,text)'),
    to_regprocedure('public.internal_receipt_action_response(uuid,uuid,boolean)')
  ] loop
    if v_helper is null
       or exists (
         select 1 from pg_proc procedure
         where procedure.oid = v_helper
           and (procedure.prosecdef or 'search_path=""' <> all(procedure.proconfig))
       )
       or has_function_privilege('anon', v_helper, 'EXECUTE')
       or has_function_privilege('authenticated', v_helper, 'EXECUTE')
       or has_function_privilege('service_role', v_helper, 'EXECUTE') then
      raise exception 'Internal Receipt helper exposure differs';
    end if;
  end loop;

  if exists (
    select 1 from information_schema.role_table_grants grant_row
    where grant_row.table_schema = 'public'
      and grant_row.table_name in ('finance_documents', 'finance_document_lines')
      and grant_row.grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ) then
    raise exception 'Receipt tables gained direct API access';
  end if;

  if to_regprocedure('public.api_list_receipt_documents(uuid,text,timestamp with time zone,uuid,integer)') is not null
     or to_regprocedure('public.api_get_receipt_document(uuid,uuid)') is not null
     or to_regprocedure('public.api_list_customer_portal_receipts(uuid,timestamp with time zone,uuid,integer)') is not null
     or to_regprocedure('public.api_get_customer_portal_receipt(uuid,uuid)') is not null then
    raise exception 'Layer B unexpectedly created Layer C read functions';
  end if;

  if exists (
    select 1
    from public.role_permissions role_permission
    join public.permissions permission on permission.id = role_permission.permission_id
    where permission.code like 'finance.document.%'
  ) then
    raise exception 'Layer B unexpectedly mapped a finance permission to a role';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('b0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'receipt-owner@example.test', now(), '{}', '{}', now(), now()),
  ('b0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'receipt-viewer@example.test', now(), '{}', '{}', now(), now()),
  ('b0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'receipt-inactive@example.test', now(), '{}', '{}', now(), now());

insert into public.organizations (
  id, name, slug, status, timezone, currency_code
) values
  ('b1000000-0000-4000-8000-000000000001', 'Receipt Actions A', 'receipt-actions-a', 'ACTIVE', 'Asia/Bangkok', 'THB'),
  ('b1000000-0000-4000-8000-000000000002', 'Receipt Actions B', 'receipt-actions-b', 'ACTIVE', 'Asia/Bangkok', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Receipt Owner', 'ACTIVE'),
  ('b2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Receipt Viewer', 'ACTIVE'),
  ('b2000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Receipt Inactive', 'INACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('b3000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'ACTIVE', true, now()),
  ('b3000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status)
values
  ('b4000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'RECEIPT_OPERATOR', 'Receipt Operator', 'ACTIVE'),
  ('b4000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'RECEIPT_VIEWER', 'Receipt Viewer', 'ACTIVE');

insert into public.role_permissions (role_id, permission_id)
select 'b4000000-0000-4000-8000-000000000001', permission.id
from public.permissions permission
where permission.code in (
  'finance.document.view',
  'finance.document.create',
  'finance.document.void',
  'finance.document.reverse'
);

insert into public.role_permissions (role_id, permission_id)
select 'b4000000-0000-4000-8000-000000000002', permission.id
from public.permissions permission
where permission.code = 'finance.document.view';

insert into public.membership_roles (membership_id, role_id)
values
  ('b3000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001'),
  ('b3000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000002');

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  ('b5000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'RECEIPT-A', 'Receipt Customer A', 'ACTIVE'),
  ('b5000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'RECEIPT-B', 'Receipt Customer B', 'ACTIVE');

insert into public.orders (
  id, organization_id, customer_id, order_number, source, currency_code,
  order_status, payment_status, fulfillment_status, subtotal,
  item_discount_total, order_discount_total, shipping_charge,
  shipping_discount_total, grand_total, amount_paid, amount_due,
  confirmed_at
)
select
  ('b7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'b1000000-0000-4000-8000-000000000001',
  'b5000000-0000-4000-8000-000000000001',
  'RECEIPT-ORDER-' || lpad(series::text, 2, '0'),
  'ADMIN',
  'THB',
  'CONFIRMED',
  'PAID',
  'UNFULFILLED',
  series * 100,
  0,
  0,
  0,
  0,
  series * 100,
  series * 100,
  0,
  now()
from generate_series(1, 12) series;

insert into public.order_items (
  id, organization_id, order_id, sku_snapshot, sale_code_snapshot,
  product_name_snapshot, variant_name_snapshot, quantity,
  original_unit_price, applied_unit_price, line_discount_total,
  line_total, is_reward_item
)
select
  ('b7200000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'b1000000-0000-4000-8000-000000000001',
  ('b7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'RECEIPT-SKU-' || series,
  'SALE-' || series,
  'Receipt Product ' || series,
  'Default',
  1,
  series * 100,
  series * 100,
  0,
  series * 100,
  false
from generate_series(1, 12) series;

insert into public.order_addresses (
  id, organization_id, order_id, address_type, recipient_name, phone,
  address_line1, district, province, postal_code, country_code
)
select
  ('b7300000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'b1000000-0000-4000-8000-000000000001',
  ('b7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 2 then 'SHIPPING' else 'BILLING' end,
  'Receipt Recipient ' || series,
  '0800000000',
  series || ' Receipt Road',
  'District',
  'Bangkok',
  '10000',
  'TH'
from generate_series(1, 12) series
where series <> 9;

insert into public.payments (
  id, organization_id, order_id, status, amount_expected,
  amount_received, currency_code
)
select
  ('b7400000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'b1000000-0000-4000-8000-000000000001',
  ('b7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'PAID',
  series * 100,
  series * 100,
  'THB'
from generate_series(1, 12) series;

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, status, paid_at, created_by
)
select
  ('b7500000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'b1000000-0000-4000-8000-000000000001',
  ('b7400000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'PAYMENT',
  'CASH',
  series * 100,
  'THB',
  'SUCCEEDED',
  now(),
  'b2000000-0000-4000-8000-000000000002'
from generate_series(1, 12) series;

update public.payments
set amount_received = 399
where id = 'b7400000-0000-4000-8000-000000000004';

update public.orders
set order_status = 'CANCELLED', payment_status = 'UNPAID', cancelled_at = now()
where id = 'b7100000-0000-4000-8000-000000000010';

update public.payment_transactions
set status = 'PENDING', paid_at = null
where id = 'b7500000-0000-4000-8000-000000000011';

update public.payment_transactions
set currency_code = 'USD'
where id = 'b7500000-0000-4000-8000-000000000012';

insert into public.refunds (
  id, organization_id, order_id, payment_transaction_id, refund_number,
  amount, refund_method, status, reason
) values
  ('b7600000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'b7100000-0000-4000-8000-000000000002', 'b7500000-0000-4000-8000-000000000002', 'REFUND-RECEIPT-02', 200, 'CASH', 'COMPLETED', 'Completed refund'),
  ('b7600000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000001', 'b7100000-0000-4000-8000-000000000007', 'b7500000-0000-4000-8000-000000000007', 'REFUND-RECEIPT-07', 700, 'CASH', 'COMPLETED', 'Completed refund');

insert into public.refund_transactions (
  id, organization_id, refund_id, amount, status, processed_at
) values
  ('b7700000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'b7600000-0000-4000-8000-000000000002', 200, 'SUCCEEDED', now()),
  ('b7700000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000001', 'b7600000-0000-4000-8000-000000000007', 700, 'SUCCEEDED', now());

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  begin
    perform public.api_create_receipt_document(
      'b1000000-0000-4000-8000-000000000001',
      'b7400000-0000-4000-8000-000000000001',
      'b9000000-0000-4000-8000-000000000090',
      null
    );
    raise exception 'Anonymous actor unexpectedly created a Receipt';
  exception when insufficient_privilege then
    -- anon is intentionally denied at the EXECUTE grant before function code runs.
    null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);

do $$
begin
  begin
    perform public.api_create_receipt_document(
      'b1000000-0000-4000-8000-000000000001',
      'b7400000-0000-4000-8000-000000000001',
      'b9000000-0000-4000-8000-000000000091',
      null
    );
    raise exception 'View-only actor unexpectedly created a Receipt';
  exception when insufficient_privilege then
    if sqlerrm <> 'PERMISSION_DENIED' then raise; end if;
  end;

  begin
    insert into public.finance_documents (
      organization_id, document_type, document_number, document_year,
      sequence_value, status, order_id, payment_id, payment_transaction_id,
      customer_id, order_number_snapshot, currency_code, issued_at,
      settled_at, payment_method_snapshot, customer_display_name_snapshot,
      bill_to_recipient_name_snapshot, bill_to_address_line1_snapshot,
      bill_to_country_code_snapshot, subtotal_snapshot,
      item_discount_total_snapshot, order_discount_total_snapshot,
      shipping_charge_snapshot, shipping_discount_total_snapshot,
      grand_total_snapshot, amount_settled_snapshot, issued_by
    ) values (
      'b1000000-0000-4000-8000-000000000001', 'RECEIPT',
      'RC-2026-999999', 2026, 999999, 'ISSUED',
      'b7100000-0000-4000-8000-000000000001',
      'b7400000-0000-4000-8000-000000000001',
      'b7500000-0000-4000-8000-000000000001',
      'b5000000-0000-4000-8000-000000000001',
      'DIRECT-WRITE', 'THB', now(), now(), 'CASH', 'Direct', 'Direct',
      'Direct', 'TH', 100, 0, 0, 0, 0, 100, 100,
      'b2000000-0000-4000-8000-000000000002'
    );
    raise exception 'Direct Receipt insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000003', true);

do $$
begin
  begin
    perform public.api_create_receipt_document(
      'b1000000-0000-4000-8000-000000000001',
      'b7400000-0000-4000-8000-000000000001',
      'b9000000-0000-4000-8000-000000000092',
      null
    );
    raise exception 'Inactive profile unexpectedly created a Receipt';
  exception when insufficient_privilege then
    if sqlerrm <> 'PROFILE_REQUIRED' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
  v_document_1 uuid;
  v_document_2 uuid;
  v_document_3 uuid;
  v_document_5 uuid;
  v_replacement_5 uuid;
begin
  begin
    perform public.api_create_receipt_document(
      'b1000000-0000-4000-8000-000000000002',
      'b7400000-0000-4000-8000-000000000001',
      'b9000000-0000-4000-8000-000000000093',
      null
    );
    raise exception 'Cross-tenant actor unexpectedly reached a Receipt';
  exception when insufficient_privilege then
    if sqlerrm <> 'MEMBERSHIP_REQUIRED' then raise; end if;
  end;

  v_result := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000001',
    'b9000000-0000-4000-8000-000000000001',
    null
  );
  v_document_1 := (v_result ->> 'document_id')::uuid;

  if v_result ->> 'ok' <> 'true'
     or v_result ->> 'status' <> 'ISSUED'
     or v_result ->> 'idempotency_reused' <> 'false'
     or v_result::text like '%b7400000%'
     or v_result::text like '%Receipt Customer%'
     or v_result::text like '%0800000000%' then
    raise exception 'Receipt create response is unsafe or incomplete: %', v_result;
  end if;

  v_replay := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000001',
    'b9000000-0000-4000-8000-000000000001',
    null
  );

  if v_replay ->> 'document_id' <> v_document_1::text
     or v_replay ->> 'idempotency_reused' <> 'true' then
    raise exception 'Receipt create replay is not stable: %', v_replay;
  end if;

  begin
    perform public.api_create_receipt_document(
      'b1000000-0000-4000-8000-000000000001',
      'b7400000-0000-4000-8000-000000000001',
      'b9000000-0000-4000-8000-000000000001',
      gen_random_uuid()
    );
    raise exception 'Changed Receipt create intent unexpectedly reused request';
  exception when invalid_parameter_value then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;

  v_result := public.api_void_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    v_document_1,
    'Document recipient formatting error',
    'b9000000-0000-4000-8000-000000000002'
  );
  v_replay := public.api_void_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    v_document_1,
    'Document recipient formatting error',
    'b9000000-0000-4000-8000-000000000002'
  );

  if v_result ->> 'status' <> 'VOID'
     or v_replay ->> 'status' <> 'VOID'
     or v_replay ->> 'idempotency_reused' <> 'true' then
    raise exception 'Receipt void or replay failed: %, %', v_result, v_replay;
  end if;

  v_result := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000002',
    'b9000000-0000-4000-8000-000000000003',
    null
  );
  v_document_2 := (v_result ->> 'document_id')::uuid;

  v_result := public.api_reverse_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    v_document_2,
    'Completed full refund evidence',
    'b9000000-0000-4000-8000-000000000004',
    'b7600000-0000-4000-8000-000000000002',
    null
  );

  if v_result ->> 'status' <> 'REVERSED' then
    raise exception 'Refund-backed Receipt reversal failed: %', v_result;
  end if;

  v_result := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000003',
    'b9000000-0000-4000-8000-000000000005',
    null
  );
  v_document_3 := (v_result ->> 'document_id')::uuid;

  v_result := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000005',
    'b9000000-0000-4000-8000-000000000006',
    null
  );
  v_document_5 := (v_result ->> 'document_id')::uuid;

  perform public.api_void_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    v_document_5,
    'Incorrect document construction',
    'b9000000-0000-4000-8000-000000000007'
  );

  v_result := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000005',
    'b9000000-0000-4000-8000-000000000008',
    v_document_5
  );
  v_replacement_5 := (v_result ->> 'document_id')::uuid;

  if v_replacement_5 is null or v_replacement_5 = v_document_5 then
    raise exception 'Receipt replacement did not create a distinct document';
  end if;

  foreach v_document_1 in array array[
    'b7400000-0000-4000-8000-000000000004'::uuid,
    'b7400000-0000-4000-8000-000000000010'::uuid,
    'b7400000-0000-4000-8000-000000000011'::uuid,
    'b7400000-0000-4000-8000-000000000012'::uuid
  ] loop
    v_result := public.api_create_receipt_document(
      'b1000000-0000-4000-8000-000000000001',
      v_document_1,
      gen_random_uuid(),
      null
    );
    if v_result ->> 'ok' <> 'false'
       or v_result ->> 'error_code' <> 'PAYMENT_NOT_ELIGIBLE' then
      raise exception 'Ineligible payment was not rejected: %', v_result;
    end if;
  end loop;

  v_result := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000009',
    'b9000000-0000-4000-8000-000000000009',
    null
  );

  if v_result ->> 'ok' <> 'false'
     or v_result ->> 'error_code' <> 'ADDRESS_NOT_AVAILABLE' then
    raise exception 'Missing address was not rejected: %', v_result;
  end if;

  v_replay := public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000009',
    'b9000000-0000-4000-8000-000000000009',
    null
  );

  if v_replay ->> 'error_code' <> 'ADDRESS_NOT_AVAILABLE'
     or v_replay ->> 'idempotency_reused' <> 'true' then
    raise exception 'Failed Receipt request replay is not stable: %', v_replay;
  end if;

  perform public.api_create_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    'b7400000-0000-4000-8000-000000000007',
    'b9000000-0000-4000-8000-000000000010',
    null
  );
end;
$$;

reset role;

update public.payment_transactions
set status = 'REVERSED'
where id = 'b7500000-0000-4000-8000-000000000003';

select set_config(
  'acos.validation.document_3_id',
  (
    select document.id::text
    from public.finance_documents document
    where document.payment_id = 'b7400000-0000-4000-8000-000000000003'
  ),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_document_id uuid;
  v_result jsonb;
begin
  v_document_id := current_setting('acos.validation.document_3_id')::uuid;

  v_result := public.api_reverse_receipt_document(
    'b1000000-0000-4000-8000-000000000001',
    v_document_id,
    'Canonical payment transaction reversed',
    'b9000000-0000-4000-8000-000000000011',
    null,
    'b7500000-0000-4000-8000-000000000003'
  );

  if v_result ->> 'status' <> 'REVERSED' then
    raise exception 'Transaction-backed Receipt reversal failed: %', v_result;
  end if;
end;
$$;

reset role;

do $$
declare
  v_document_count bigint;
  v_line_count bigint;
  v_sequence_value bigint;
  v_success_keys bigint;
  v_failed_keys bigint;
begin
  select count(*) into v_document_count
  from public.finance_documents
  where organization_id = 'b1000000-0000-4000-8000-000000000001';

  select count(*) into v_line_count
  from public.finance_document_lines
  where organization_id = 'b1000000-0000-4000-8000-000000000001';

  select current_value into v_sequence_value
  from public.document_sequences
  where organization_id = 'b1000000-0000-4000-8000-000000000001'
    and document_type = 'RECEIPT';

  select count(*) filter (where state = 'SUCCEEDED'),
         count(*) filter (where state = 'FAILED')
  into v_success_keys, v_failed_keys
  from public.commerce_idempotency_keys
  where organization_id = 'b1000000-0000-4000-8000-000000000001'
    and operation like 'RECEIPT_%';

  if v_document_count <> 6
     or v_line_count <> 6
     or v_sequence_value <> 6
     or v_success_keys <> 10
     or v_failed_keys <> 5 then
    raise exception 'Receipt action evidence counts differ: documents=%, lines=%, sequence=%, success=%, failed=%',
      v_document_count, v_line_count, v_sequence_value, v_success_keys, v_failed_keys;
  end if;

  if not exists (
    select 1
    from public.finance_documents document
    where document.payment_id = 'b7400000-0000-4000-8000-000000000002'
      and document.status = 'REVERSED'
      and document.bill_to_recipient_name_snapshot = 'Receipt Recipient 2'
      and document.reversal_refund_id = 'b7600000-0000-4000-8000-000000000002'
      and document.reversal_payment_transaction_id is null
  ) or not exists (
    select 1
    from public.finance_documents document
    where document.payment_id = 'b7400000-0000-4000-8000-000000000003'
      and document.status = 'REVERSED'
      and document.reversal_refund_id is null
      and document.reversal_payment_transaction_id = 'b7500000-0000-4000-8000-000000000003'
  ) or not exists (
    select 1
    from public.finance_documents replacement
    join public.finance_documents predecessor
      on predecessor.organization_id = replacement.organization_id
     and predecessor.id = replacement.replaces_document_id
    where replacement.payment_id = 'b7400000-0000-4000-8000-000000000005'
      and replacement.status = 'ISSUED'
      and predecessor.status = 'VOID'
      and replacement.sequence_value > predecessor.sequence_value
  ) then
    raise exception 'Receipt lifecycle, fallback address, or replacement evidence differs';
  end if;

  if exists (
    select 1
    from public.audit_logs audit
    where audit.entity_type = 'finance_document'
      and (
        audit.before_json::text like '%b74%'
        or audit.after_json::text like '%b74%'
        or audit.before_json::text like '%Receipt Customer%'
        or audit.after_json::text like '%Receipt Customer%'
        or audit.before_json::text like '%0800000000%'
        or audit.after_json::text like '%0800000000%'
      )
  ) then
    raise exception 'Receipt audit payload leaked a private/source field';
  end if;

  if (select count(*) from public.audit_logs
      where entity_type = 'finance_document' and action = 'RECEIPT_CREATED') <> 5
     or (select count(*) from public.audit_logs
         where entity_type = 'finance_document' and action = 'RECEIPT_REPLACED') <> 1
     or (select count(*) from public.audit_logs
         where entity_type = 'finance_document' and action = 'RECEIPT_VOIDED') <> 2
     or (select count(*) from public.audit_logs
         where entity_type = 'finance_document' and action = 'RECEIPT_REVERSED') <> 2 then
    raise exception 'Receipt audit action counts differ';
  end if;

  if not exists (
    select 1 from public.orders
    where id = 'b7100000-0000-4000-8000-000000000002'
      and order_status = 'CONFIRMED'
      and payment_status = 'PAID'
      and amount_paid = 200
      and amount_due = 0
  ) or not exists (
    select 1 from public.payments
    where id = 'b7400000-0000-4000-8000-000000000002'
      and status = 'PAID'
      and amount_received = 200
  ) or not exists (
    select 1 from public.refunds
    where id = 'b7600000-0000-4000-8000-000000000002'
      and status = 'COMPLETED'
      and amount = 200
  ) then
    raise exception 'Receipt boundary changed a canonical money source';
  end if;
end;
$$;

commit;

select 'phase_1e_receipt_guarded_actions|pass';
