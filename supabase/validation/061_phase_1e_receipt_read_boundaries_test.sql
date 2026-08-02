\set ON_ERROR_STOP on

begin;

do $$
declare
  v_function oid;
begin
  foreach v_function in array array[
    to_regprocedure('public.api_list_receipt_documents(uuid,text,timestamp with time zone,uuid,integer)'),
    to_regprocedure('public.api_get_receipt_document(uuid,uuid)'),
    to_regprocedure('public.api_list_customer_portal_receipts(uuid,timestamp with time zone,uuid,integer)'),
    to_regprocedure('public.api_get_customer_portal_receipt(uuid,uuid)')
  ] loop
    if v_function is null
       or not exists (
         select 1
         from pg_proc procedure
         where procedure.oid = v_function
           and procedure.prosecdef
           and procedure.provolatile = 'v'
           and procedure.proowner = (select oid from pg_roles where rolname = 'postgres')
           and 'search_path=""' = any(procedure.proconfig)
       )
       or not has_function_privilege('authenticated', v_function, 'EXECUTE')
       or has_function_privilege('anon', v_function, 'EXECUTE')
       or has_function_privilege('service_role', v_function, 'EXECUTE') then
      raise exception 'Receipt Layer C function hardening or grants differ';
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.role_table_grants grant_row
    where grant_row.table_schema = 'public'
      and grant_row.table_name in ('finance_documents', 'finance_document_lines')
      and grant_row.grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ) then
    raise exception 'Receipt tables gained direct API access';
  end if;

  if exists (
    select 1
    from public.role_permissions role_permission
    join public.permissions permission on permission.id = role_permission.permission_id
    where permission.code like 'finance.document.%'
  ) then
    raise exception 'Receipt Layer C unexpectedly mapped finance permissions';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('c0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'layer-c-staff@example.test', now(), '{}', '{}', now(), now()),
  ('c0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'layer-c-no-permission@example.test', now(), '{}', '{}', now(), now()),
  ('c0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'layer-c-portal@example.test', now(), '{}', '{}', now(), now()),
  ('c0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'layer-c-unlinked@example.test', now(), '{}', '{}', now(), now()),
  ('c0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'layer-c-inactive@example.test', now(), '{}', '{}', now(), now());

insert into public.organizations (
  id, name, slug, status, timezone, currency_code
) values
  ('c1000000-0000-4000-8000-000000000001', 'Receipt Reads A', 'receipt-reads-a', 'ACTIVE', 'Asia/Bangkok', 'THB'),
  ('c1000000-0000-4000-8000-000000000002', 'Receipt Reads B', 'receipt-reads-b', 'ACTIVE', 'Asia/Bangkok', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('c2000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Layer C Staff', 'ACTIVE'),
  ('c2000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Layer C No Permission', 'ACTIVE'),
  ('c2000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Layer C Portal', 'ACTIVE'),
  ('c2000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'Layer C Unlinked', 'ACTIVE'),
  ('c2000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'Layer C Inactive', 'INACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('c3000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'ACTIVE', true, now()),
  ('c3000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002', 'ACTIVE', true, now()),
  ('c3000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000003', 'ACTIVE', true, now()),
  ('c3000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000004', 'ACTIVE', true, now()),
  ('c3000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000005', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status)
values (
  'c4000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'LAYER_C_VIEWER',
  'Layer C Viewer',
  'ACTIVE'
);

insert into public.role_permissions (role_id, permission_id)
select 'c4000000-0000-4000-8000-000000000001', permission.id
from public.permissions permission
where permission.code = 'finance.document.view';

insert into public.membership_roles (membership_id, role_id)
values (
  'c3000000-0000-4000-8000-000000000001',
  'c4000000-0000-4000-8000-000000000001'
);

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  ('c5000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'LAYER-C-A1', 'Portal Customer A1', 'ACTIVE'),
  ('c5000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'LAYER-C-A2', 'Other Customer A2', 'ACTIVE'),
  ('c5000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 'LAYER-C-B1', 'Other Tenant Customer', 'ACTIVE');

insert into public.customer_profile_links (
  id, organization_id, customer_id, profile_id, link_status, link_source,
  verification_method, verified_at, created_by
) values (
  'c6000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'c5000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000003',
  'ACTIVE', 'OWNER', 'OWNER_APPROVED', now(),
  'c2000000-0000-4000-8000-000000000001'
);

insert into public.orders (
  id, organization_id, customer_id, order_number, source, currency_code,
  order_status, payment_status, fulfillment_status, subtotal,
  item_discount_total, order_discount_total, shipping_charge,
  shipping_discount_total, grand_total, amount_paid, amount_due, confirmed_at
) values
  ('c7100000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'LAYER-C-ORDER-1', 'ADMIN', 'THB', 'CONFIRMED', 'PAID', 'UNFULFILLED', 100, 0, 0, 0, 0, 100, 100, 0, now()),
  ('c7100000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'LAYER-C-ORDER-2', 'ADMIN', 'THB', 'CONFIRMED', 'PAID', 'UNFULFILLED', 200, 0, 0, 0, 0, 200, 200, 0, now()),
  ('c7100000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'LAYER-C-ORDER-3', 'ADMIN', 'THB', 'CONFIRMED', 'PAID', 'UNFULFILLED', 300, 0, 0, 0, 0, 300, 300, 0, now()),
  ('c7100000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000002', 'LAYER-C-ORDER-4', 'ADMIN', 'THB', 'CONFIRMED', 'PAID', 'UNFULFILLED', 400, 0, 0, 0, 0, 400, 400, 0, now()),
  ('c7100000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002', 'c5000000-0000-4000-8000-000000000003', 'LAYER-C-ORDER-5', 'ADMIN', 'THB', 'CONFIRMED', 'PAID', 'UNFULFILLED', 500, 0, 0, 0, 0, 500, 500, 0, now());

insert into public.order_items (
  id, organization_id, order_id, sku_snapshot, sale_code_snapshot,
  product_name_snapshot, variant_name_snapshot, quantity,
  original_unit_price, applied_unit_price, line_discount_total,
  line_total, is_reward_item
)
select
  ('c7200000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 5 then 'c1000000-0000-4000-8000-000000000002'::uuid else 'c1000000-0000-4000-8000-000000000001'::uuid end,
  ('c7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'SAFE-SKU-' || series,
  'SAFE-SALE-' || series,
  'Safe Receipt Item ' || series,
  'Default',
  1,
  series * 100,
  series * 100,
  0,
  series * 100,
  false
from generate_series(1, 5) series;

insert into public.payments (
  id, organization_id, order_id, status, amount_expected,
  amount_received, currency_code
)
select
  ('c7400000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 5 then 'c1000000-0000-4000-8000-000000000002'::uuid else 'c1000000-0000-4000-8000-000000000001'::uuid end,
  ('c7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'PAID', series * 100, series * 100, 'THB'
from generate_series(1, 5) series;

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, provider, external_reference, status, paid_at,
  created_by
)
select
  ('c7500000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 5 then 'c1000000-0000-4000-8000-000000000002'::uuid else 'c1000000-0000-4000-8000-000000000001'::uuid end,
  ('c7400000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'PAYMENT', 'BANK_TRANSFER', series * 100, 'THB',
  'PRIVATE_PROVIDER', 'PRIVATE-REFERENCE-' || series, 'SUCCEEDED', now(),
  'c2000000-0000-4000-8000-000000000001'
from generate_series(1, 5) series;

insert into public.finance_documents (
  id, organization_id, document_type, document_number, document_year,
  sequence_value, status, order_id, payment_id, payment_transaction_id,
  customer_id, order_number_snapshot, currency_code, issued_at, settled_at,
  payment_method_snapshot, customer_display_name_snapshot,
  bill_to_recipient_name_snapshot, bill_to_address_line1_snapshot,
  bill_to_country_code_snapshot, subtotal_snapshot,
  item_discount_total_snapshot, order_discount_total_snapshot,
  shipping_charge_snapshot, shipping_discount_total_snapshot,
  grand_total_snapshot, amount_settled_snapshot, issued_by,
  voided_at, voided_by, void_reason
)
select
  ('c8000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 5 then 'c1000000-0000-4000-8000-000000000002'::uuid else 'c1000000-0000-4000-8000-000000000001'::uuid end,
  'RECEIPT',
  'RC-2026-' || lpad((case when series = 5 then 1 else series end)::text, 6, '0'),
  2026,
  case when series = 5 then 1 else series end,
  case when series = 4 then 'VOID' else 'ISSUED' end,
  ('c7100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  ('c7400000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  ('c7500000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case
    when series <= 3 then 'c5000000-0000-4000-8000-000000000001'::uuid
    when series = 4 then 'c5000000-0000-4000-8000-000000000002'::uuid
    else 'c5000000-0000-4000-8000-000000000003'::uuid
  end,
  'LAYER-C-ORDER-' || series,
  'THB',
  ('2026-08-03 0' || series || ':00:00+00')::timestamptz,
  ('2026-08-03 0' || series || ':00:00+00')::timestamptz,
  'BANK_TRANSFER',
  case when series <= 3 then 'Portal Customer A1' when series = 4 then 'Other Customer A2' else 'Other Tenant Customer' end,
  'Safe Recipient ' || series,
  series || ' Safe Road',
  'TH',
  series * 100, 0, 0, 0, 0, series * 100, series * 100,
  'c2000000-0000-4000-8000-000000000001',
  case when series = 4 then '2026-08-03 06:00:00+00'::timestamptz else null end,
  case when series = 4 then 'c2000000-0000-4000-8000-000000000001'::uuid else null end,
  case when series = 4 then 'Document issued with incorrect recipient' else null end
from generate_series(1, 5) series;

insert into public.finance_document_lines (
  id, organization_id, document_id, line_number, source_order_item_id,
  sku_snapshot, sale_code_snapshot, product_name_snapshot,
  variant_name_snapshot, quantity_snapshot, original_unit_price_snapshot,
  applied_unit_price_snapshot, line_discount_total_snapshot,
  line_total_snapshot, is_reward_item_snapshot
)
select
  ('c8100000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 5 then 'c1000000-0000-4000-8000-000000000002'::uuid else 'c1000000-0000-4000-8000-000000000001'::uuid end,
  ('c8000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  1,
  ('c7200000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  'SAFE-SKU-' || series,
  'SAFE-SALE-' || series,
  'Safe Receipt Item ' || series,
  'Default', 1, series * 100, series * 100, 0, series * 100, false
from generate_series(1, 5) series;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_page_1 jsonb;
  v_page_2 jsonb;
  v_filtered jsonb;
  v_detail jsonb;
begin
  v_page_1 := public.api_list_receipt_documents(
    'c1000000-0000-4000-8000-000000000001', null, null, null, 2
  );

  if v_page_1 ->> 'available' <> 'true'
     or jsonb_array_length(v_page_1 -> 'items') <> 2
     or v_page_1 -> 'next_cursor' is null then
    raise exception 'Staff Receipt first page or cursor differs';
  end if;

  v_page_2 := public.api_list_receipt_documents(
    'c1000000-0000-4000-8000-000000000001',
    null,
    (v_page_1 #>> '{next_cursor,before_issued_at}')::timestamptz,
    (v_page_1 #>> '{next_cursor,before_id}')::uuid,
    2
  );

  if jsonb_array_length(v_page_2 -> 'items') <> 2
     or v_page_2 -> 'next_cursor' <> 'null'::jsonb
     or (v_page_1 #>> '{items,0,document_id}') = (v_page_2 #>> '{items,0,document_id}') then
    raise exception 'Staff Receipt keyset pagination differs';
  end if;

  v_filtered := public.api_list_receipt_documents(
    'c1000000-0000-4000-8000-000000000001', 'VOID', null, null, 25
  );

  if jsonb_array_length(v_filtered -> 'items') <> 1
     or v_filtered #>> '{items,0,status}' <> 'VOID' then
    raise exception 'Staff Receipt status filter differs';
  end if;

  begin
    perform public.api_list_receipt_documents(
      'c1000000-0000-4000-8000-000000000001', null, null, null, 101
    );
    raise exception 'Receipt list accepted an out-of-range limit';
  exception when sqlstate '22023' then
    null;
  end;

  v_detail := public.api_get_receipt_document(
    'c1000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001'
  );

  if v_detail ->> 'available' <> 'true'
     or v_detail #>> '{receipt,receipt_number}' <> 'RC-2026-000001'
     or jsonb_array_length(v_detail #> '{receipt,items}') <> 1
     or v_detail::text ~ '(payment_transaction_id|issued_by|voided_by|PRIVATE_PROVIDER|PRIVATE-REFERENCE)' then
    raise exception 'Staff Receipt detail allowlist or private-field exclusion differs';
  end if;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.audit_logs where action = 'RECEIPT_VIEWED') <> 1
     or exists (
       select 1
       from public.audit_logs
       where action = 'RECEIPT_VIEWED'
         and (
           after_json - 'viewer_scope' <> '{}'::jsonb
           or after_json::text ~ '(PRIVATE_PROVIDER|PRIVATE-REFERENCE|recipient|address|payment)'
         )
     ) then
    raise exception 'Staff Receipt detail audit differs or contains private payload';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000002', true);

do $$
declare
  v_unavailable jsonb;
begin
  begin
    perform public.api_list_receipt_documents(
      'c1000000-0000-4000-8000-000000000001', null, null, null, 25
    );
    raise exception 'Staff without finance.document.view listed Receipts';
  exception when sqlstate '42501' then
    null;
  end;

  v_unavailable := public.api_get_receipt_document(
    'c1000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001'
  );

  if v_unavailable <> '{"available": false, "error_code": "DOCUMENT_UNAVAILABLE"}'::jsonb then
    raise exception 'Unauthorized Staff detail did not return the unavailable shape';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000003', true);

do $$
declare
  v_page_1 jsonb;
  v_page_2 jsonb;
  v_own_detail jsonb;
  v_other_detail jsonb;
  v_cross_tenant jsonb;
begin
  v_page_1 := public.api_list_customer_portal_receipts(
    'c1000000-0000-4000-8000-000000000001', null, null, 2
  );

  if v_page_1 ->> 'available' <> 'true'
     or jsonb_array_length(v_page_1 -> 'items') <> 2
     or v_page_1 -> 'next_cursor' is null
     or v_page_1::text like '%RC-2026-000004%' then
    raise exception 'Portal Receipt ownership or first page differs';
  end if;

  v_page_2 := public.api_list_customer_portal_receipts(
    'c1000000-0000-4000-8000-000000000001',
    (v_page_1 #>> '{next_cursor,before_issued_at}')::timestamptz,
    (v_page_1 #>> '{next_cursor,before_id}')::uuid,
    2
  );

  if jsonb_array_length(v_page_2 -> 'items') <> 1
     or v_page_2 -> 'next_cursor' <> 'null'::jsonb then
    raise exception 'Portal Receipt keyset pagination differs';
  end if;

  v_own_detail := public.api_get_customer_portal_receipt(
    'c1000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001'
  );
  v_other_detail := public.api_get_customer_portal_receipt(
    'c1000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000004'
  );
  v_cross_tenant := public.api_get_customer_portal_receipt(
    'c1000000-0000-4000-8000-000000000002',
    'c8000000-0000-4000-8000-000000000005'
  );

  if v_own_detail ->> 'available' <> 'true'
     or v_own_detail::text ~ '(payment_transaction_id|issued_by|voided_by|PRIVATE_PROVIDER|PRIVATE-REFERENCE)'
     or v_other_detail <> '{"available": false, "error_code": "DOCUMENT_UNAVAILABLE"}'::jsonb
     or v_cross_tenant <> v_other_detail then
    raise exception 'Portal Receipt detail ownership, privacy, or unavailable shape differs';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000004', true);

do $$
declare
  v_list jsonb;
  v_detail jsonb;
begin
  v_list := public.api_list_customer_portal_receipts(
    'c1000000-0000-4000-8000-000000000001', null, null, 20
  );
  v_detail := public.api_get_customer_portal_receipt(
    'c1000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001'
  );

  if v_list ->> 'available' <> 'false'
     or jsonb_array_length(v_list -> 'items') <> 0
     or v_detail <> '{"available": false, "error_code": "DOCUMENT_UNAVAILABLE"}'::jsonb then
    raise exception 'Unlinked Portal profile unexpectedly read a Receipt';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000005', true);

do $$
declare
  v_detail jsonb;
begin
  v_detail := public.api_get_customer_portal_receipt(
    'c1000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001'
  );
  if v_detail <> '{"available": false, "error_code": "DOCUMENT_UNAVAILABLE"}'::jsonb then
    raise exception 'Inactive Portal profile unexpectedly read a Receipt';
  end if;
end;
$$;

do $$
begin
  begin
    perform 1 from public.finance_documents limit 1;
    raise exception 'Authenticated role unexpectedly selected finance_documents';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

do $$
declare
  v_audit_count bigint;
begin
  select count(*) into v_audit_count
  from public.audit_logs
  where action = 'RECEIPT_VIEWED';

  if v_audit_count <> 2
     or (select count(*) from public.audit_logs where action = 'RECEIPT_VIEWED' and after_json ->> 'viewer_scope' = 'STAFF') <> 1
     or (select count(*) from public.audit_logs where action = 'RECEIPT_VIEWED' and after_json ->> 'viewer_scope' = 'CUSTOMER_PORTAL') <> 1
     or (select count(*) from public.finance_documents) <> 5
     or (select count(*) from public.finance_document_lines) <> 5
     or (select count(*) from public.payments where status = 'PAID') <> 5
     or exists (
       select 1
       from public.audit_logs
       where action = 'RECEIPT_VIEWED'
         and (before_json is not null or request_id is not null)
     ) then
    raise exception 'Receipt reads changed business state or audit cardinality differs';
  end if;
end;
$$;

select 'phase_1e_receipt_read_boundaries' as validation, 'pass' as result;

rollback;
