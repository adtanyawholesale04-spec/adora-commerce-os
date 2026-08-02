\set ON_ERROR_STOP on

begin;

do $$
declare
  v_header_columns integer;
  v_line_columns integer;
  v_expected_names text[];
  v_actual_names text[];
  v_helper oid := to_regprocedure(
    'public.next_document_number(uuid,character varying,character varying,character varying)'
  );
begin
  select count(*) into v_header_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'finance_documents';

  select count(*) into v_line_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'finance_document_lines';

  if v_header_columns <> 43 or v_line_columns <> 16 then
    raise exception 'Receipt column catalog count mismatch: header=%, lines=%',
      v_header_columns, v_line_columns;
  end if;

  if exists (
    with expected(column_name, formatted_type, is_not_null) as (values
      ('id','uuid',true),
      ('organization_id','uuid',true),
      ('document_type','character varying(30)',true),
      ('document_number','character varying(14)',true),
      ('document_year','integer',true),
      ('sequence_value','integer',true),
      ('status','character varying(20)',true),
      ('order_id','uuid',true),
      ('payment_id','uuid',true),
      ('payment_transaction_id','uuid',true),
      ('customer_id','uuid',true),
      ('replaces_document_id','uuid',false),
      ('order_number_snapshot','character varying(100)',true),
      ('currency_code','character varying(3)',true),
      ('issued_at','timestamp with time zone',true),
      ('settled_at','timestamp with time zone',true),
      ('payment_method_snapshot','character varying(40)',true),
      ('customer_display_name_snapshot','character varying(200)',true),
      ('bill_to_recipient_name_snapshot','character varying(200)',true),
      ('bill_to_address_line1_snapshot','text',true),
      ('bill_to_address_line2_snapshot','text',false),
      ('bill_to_subdistrict_snapshot','character varying(150)',false),
      ('bill_to_district_snapshot','character varying(150)',false),
      ('bill_to_province_snapshot','character varying(150)',false),
      ('bill_to_postal_code_snapshot','character varying(20)',false),
      ('bill_to_country_code_snapshot','character varying(2)',true),
      ('subtotal_snapshot','numeric(14,2)',true),
      ('item_discount_total_snapshot','numeric(14,2)',true),
      ('order_discount_total_snapshot','numeric(14,2)',true),
      ('shipping_charge_snapshot','numeric(14,2)',true),
      ('shipping_discount_total_snapshot','numeric(14,2)',true),
      ('grand_total_snapshot','numeric(14,2)',true),
      ('amount_settled_snapshot','numeric(14,2)',true),
      ('issued_by','uuid',true),
      ('voided_at','timestamp with time zone',false),
      ('voided_by','uuid',false),
      ('void_reason','text',false),
      ('reversed_at','timestamp with time zone',false),
      ('reversed_by','uuid',false),
      ('reversal_reason','text',false),
      ('reversal_refund_id','uuid',false),
      ('reversal_payment_transaction_id','uuid',false),
      ('created_at','timestamp with time zone',true)
    ), actual as (
      select a.attname column_name,
             format_type(a.atttypid, a.atttypmod) formatted_type,
             a.attnotnull is_not_null
      from pg_attribute a
      where a.attrelid = 'public.finance_documents'::regclass
        and a.attnum > 0 and not a.attisdropped
    )
    select 1
    from expected
    full join actual using (column_name, formatted_type, is_not_null)
    where expected.column_name is null or actual.column_name is null
  ) then
    raise exception 'Receipt header column type/nullability catalog differs';
  end if;

  if exists (
    with expected(column_name, formatted_type, is_not_null) as (values
      ('id','uuid',true),
      ('organization_id','uuid',true),
      ('document_id','uuid',true),
      ('line_number','integer',true),
      ('source_order_item_id','uuid',true),
      ('sku_snapshot','character varying(120)',false),
      ('sale_code_snapshot','character varying(80)',false),
      ('product_name_snapshot','character varying(255)',true),
      ('variant_name_snapshot','character varying(255)',false),
      ('quantity_snapshot','numeric(14,3)',true),
      ('original_unit_price_snapshot','numeric(14,2)',true),
      ('applied_unit_price_snapshot','numeric(14,2)',true),
      ('line_discount_total_snapshot','numeric(14,2)',true),
      ('line_total_snapshot','numeric(14,2)',true),
      ('is_reward_item_snapshot','boolean',true),
      ('created_at','timestamp with time zone',true)
    ), actual as (
      select a.attname column_name,
             format_type(a.atttypid, a.atttypmod) formatted_type,
             a.attnotnull is_not_null
      from pg_attribute a
      where a.attrelid = 'public.finance_document_lines'::regclass
        and a.attnum > 0 and not a.attisdropped
    )
    select 1
    from expected
    full join actual using (column_name, formatted_type, is_not_null)
    where expected.column_name is null or actual.column_name is null
  ) then
    raise exception 'Receipt line column type/nullability catalog differs';
  end if;

  v_expected_names := array[
    'finance_documents_amounts_check',
    'finance_documents_customer_tenant_fk',
    'finance_documents_issued_by_fk',
    'finance_documents_lifecycle_check',
    'finance_documents_not_self_replacement_check',
    'finance_documents_number_format_check',
    'finance_documents_number_key',
    'finance_documents_number_parts_check',
    'finance_documents_order_tenant_fk',
    'finance_documents_organization_id_fkey',
    'finance_documents_payment_tenant_fk',
    'finance_documents_pkey',
    'finance_documents_replacement_tenant_fk',
    'finance_documents_reversal_refund_tenant_fk',
    'finance_documents_reversal_transaction_tenant_fk',
    'finance_documents_reversed_by_fk',
    'finance_documents_sequence_key',
    'finance_documents_status_check',
    'finance_documents_tenant_id_key',
    'finance_documents_transaction_tenant_fk',
    'finance_documents_type_check',
    'finance_documents_voided_by_fk'
  ];
  select array_agg(conname order by conname) into v_actual_names
  from pg_constraint where conrelid = 'public.finance_documents'::regclass;
  if v_actual_names is distinct from v_expected_names then
    raise exception 'Receipt header constraint catalog differs';
  end if;

  v_expected_names := array[
    'finance_document_lines_document_tenant_fk',
    'finance_document_lines_number_key',
    'finance_document_lines_order_item_tenant_fk',
    'finance_document_lines_organization_id_fkey',
    'finance_document_lines_pkey',
    'finance_document_lines_source_item_key',
    'finance_document_lines_tenant_id_key',
    'finance_document_lines_values_check'
  ];
  select array_agg(conname order by conname) into v_actual_names
  from pg_constraint where conrelid = 'public.finance_document_lines'::regclass;
  if v_actual_names is distinct from v_expected_names then
    raise exception 'Receipt line constraint catalog differs';
  end if;

  v_expected_names := array[
    'finance_documents_customer_portal_idx',
    'finance_documents_order_idx',
    'finance_documents_payment_idx',
    'finance_documents_payment_transaction_idx',
    'finance_documents_pkey',
    'finance_documents_replacement_uidx',
    'finance_documents_reversal_refund_idx',
    'finance_documents_reversal_transaction_idx',
    'finance_documents_root_payment_uidx',
    'finance_documents_staff_queue_idx'
  ];
  select array_agg(indexname order by indexname) into v_actual_names
  from pg_indexes
  where schemaname = 'public' and tablename = 'finance_documents'
    and indexname not in (
      'finance_documents_tenant_id_key',
      'finance_documents_number_key',
      'finance_documents_sequence_key'
    );
  if v_actual_names is distinct from v_expected_names then
    raise exception 'Receipt header index catalog differs';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'finance_documents'
      and c.relrowsecurity
  ) or not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'finance_document_lines'
      and c.relrowsecurity
  ) then
    raise exception 'Receipt RLS is not enabled';
  end if;

  if exists (
    select 1 from pg_policy p
    where p.polrelid in (
      'public.finance_documents'::regclass,
      'public.finance_document_lines'::regclass
    )
  ) then
    raise exception 'Receipt foundation must not create direct table policies';
  end if;

  if exists (
    select 1 from information_schema.table_privileges
    where table_schema = 'public'
      and table_name in ('finance_documents', 'finance_document_lines')
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ) then
    raise exception 'Receipt tables are directly exposed to an API role';
  end if;

  if v_helper is null or not exists (
    select 1 from pg_proc p
    where p.oid = v_helper and p.prosecdef
      and 'search_path=""' = any(p.proconfig)
      and p.prorettype = 'character varying'::regtype
  ) then
    raise exception 'next_document_number hardening differs';
  end if;

  if has_function_privilege('anon', v_helper, 'EXECUTE')
     or has_function_privilege('authenticated', v_helper, 'EXECUTE')
     or has_function_privilege('service_role', v_helper, 'EXECUTE')
     or has_function_privilege('anon', 'public.protect_finance_document_header()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.protect_finance_document_header()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.protect_finance_document_header()', 'EXECUTE')
     or has_function_privilege('anon', 'public.protect_finance_document_line()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.protect_finance_document_line()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.protect_finance_document_line()', 'EXECUTE') then
    raise exception 'Receipt helper/trigger execution is exposed';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.finance_documents'::regclass
      and tgname = 'finance_documents_protect' and not tgisinternal
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.finance_document_lines'::regclass
      and tgname = 'finance_document_lines_protect' and not tgisinternal
  ) then
    raise exception 'Receipt immutability triggers are missing';
  end if;

  if (
    select count(*) from public.permissions
    where (code, name, description) in (
      ('finance.document.view', 'View finance documents', 'Read tenant finance documents'),
      ('finance.document.create', 'Create finance documents', 'Create an eligible Receipt'),
      ('finance.document.void', 'Void finance documents', 'Void a document for a document error'),
      ('finance.document.reverse', 'Reverse finance documents', 'Reverse a document with approved evidence')
    )
  ) <> 4 then
    raise exception 'Receipt permission metadata differs';
  end if;

  if exists (
    select 1 from public.role_permissions rp
    join public.permissions p on p.id = rp.permission_id
    where p.code like 'finance.document.%'
  ) then
    raise exception 'Receipt permissions were mapped to roles automatically';
  end if;

  if not (
    select pg_get_constraintdef(oid) like '%RECEIPT_CREATE%'
      and pg_get_constraintdef(oid) like '%RECEIPT_VOID%'
      and pg_get_constraintdef(oid) like '%RECEIPT_REVERSE%'
      and pg_get_constraintdef(oid) like '%CHECKOUT_COMPENSATE%'
    from pg_constraint
    where conrelid = 'public.commerce_idempotency_keys'::regclass
      and conname = 'commerce_idempotency_keys_operation_check'
  ) or not (
    select pg_get_constraintdef(oid) like '%finance_document%'
      and pg_get_constraintdef(oid) like '%payment_transaction%'
    from pg_constraint
    where conrelid = 'public.commerce_idempotency_keys'::regclass
      and conname = 'commerce_idempotency_keys_result_entity_type_check'
  ) then
    raise exception 'Receipt idempotency allowlists differ';
  end if;

  if exists (
    select 1 from public.document_sequences where document_type = 'RECEIPT'
  ) then
    raise exception 'Layer A must not seed a RECEIPT sequence row';
  end if;
end;
$$;

set local role authenticated;

do $$
begin
  begin
    insert into public.finance_documents (
      organization_id, document_type, document_number, document_year,
      sequence_value, order_id, payment_id, payment_transaction_id,
      customer_id, order_number_snapshot, currency_code, issued_at,
      settled_at, payment_method_snapshot, customer_display_name_snapshot,
      bill_to_recipient_name_snapshot, bill_to_address_line1_snapshot,
      bill_to_country_code_snapshot, subtotal_snapshot,
      item_discount_total_snapshot, order_discount_total_snapshot,
      shipping_charge_snapshot, shipping_discount_total_snapshot,
      grand_total_snapshot, amount_settled_snapshot, issued_by
    ) values (
      gen_random_uuid(), 'RECEIPT', 'RC-2026-000001', 2026,
      1, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
      gen_random_uuid(), 'DENIED', 'THB', now(), now(), 'BANK_TRANSFER',
      'Denied', 'Denied', 'Denied', 'TH', 0, 0, 0, 0, 0, 0, 0,
      gen_random_uuid()
    );
    raise exception 'Authenticated direct Receipt insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values (
  'f0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'receipt-foundation@example.test', now(), '{}', '{}', now(), now()
);

insert into public.organizations (id, name, slug, status, timezone, currency_code)
values
  ('f1000000-0000-4000-8000-000000000001', 'Receipt Foundation', 'receipt-foundation', 'ACTIVE', 'Asia/Bangkok', 'THB'),
  ('f1000000-0000-4000-8000-000000000002', 'Receipt Other Tenant', 'receipt-other-tenant', 'ACTIVE', 'Asia/Bangkok', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values (
  'f2000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000001',
  'Receipt Issuer', 'ACTIVE'
);

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('f3000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'RECEIPT-CUSTOMER', 'Receipt Customer', 'ACTIVE'),
  ('f3000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'OTHER-CUSTOMER', 'Other Customer', 'ACTIVE');

insert into public.orders (
  id, organization_id, customer_id, order_number, source, currency_code,
  order_status, payment_status, fulfillment_status, subtotal, grand_total,
  amount_paid, amount_due
) values (
  'f4000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'RECEIPT-ORDER', 'ADMIN', 'THB', 'CONFIRMED', 'PAID', 'UNFULFILLED',
  100, 100, 100, 0
);

insert into public.order_items (
  id, organization_id, order_id, sku_snapshot, sale_code_snapshot,
  product_name_snapshot, variant_name_snapshot, quantity,
  original_unit_price, applied_unit_price, line_discount_total,
  line_total, is_reward_item
) values (
  'f4100000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000001',
  'RECEIPT-SKU', 'RECEIPT-SALE', 'Receipt Product', 'Standard',
  1, 100, 100, 0, 100, false
);

insert into public.payments (
  id, organization_id, order_id, status, amount_expected,
  amount_received, currency_code
) values (
  'f5000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000001',
  'PAID', 100, 100, 'THB'
);

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, status, paid_at
) values (
  'f5100000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'PAYMENT', 'BANK_TRANSFER', 100, 'THB', 'SUCCEEDED',
  '2026-01-01 00:00:00+07'
);

insert into public.finance_documents (
  id, organization_id, document_type, document_number, document_year,
  sequence_value, status, order_id, payment_id, payment_transaction_id,
  customer_id, order_number_snapshot, currency_code, issued_at, settled_at,
  payment_method_snapshot, customer_display_name_snapshot,
  bill_to_recipient_name_snapshot, bill_to_address_line1_snapshot,
  bill_to_country_code_snapshot, subtotal_snapshot,
  item_discount_total_snapshot, order_discount_total_snapshot,
  shipping_charge_snapshot, shipping_discount_total_snapshot,
  grand_total_snapshot, amount_settled_snapshot, issued_by
) values (
  'f6000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'RECEIPT', 'RC-2026-000001', 2026, 1, 'ISSUED',
  'f4000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'f5100000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'RECEIPT-ORDER', 'THB', '2026-01-01 00:10:00+07',
  '2026-01-01 00:00:00+07', 'BANK_TRANSFER', 'Receipt Customer',
  'Receipt Customer', '1 Receipt Road', 'TH', 100, 0, 0, 0, 0, 100, 100,
  'f2000000-0000-4000-8000-000000000001'
);

insert into public.finance_document_lines (
  id, organization_id, document_id, line_number, source_order_item_id,
  sku_snapshot, sale_code_snapshot, product_name_snapshot,
  variant_name_snapshot, quantity_snapshot, original_unit_price_snapshot,
  applied_unit_price_snapshot, line_discount_total_snapshot,
  line_total_snapshot, is_reward_item_snapshot
) values (
  'f6100000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f6000000-0000-4000-8000-000000000001', 1,
  'f4100000-0000-4000-8000-000000000001',
  'RECEIPT-SKU', 'RECEIPT-SALE', 'Receipt Product', 'Standard',
  1, 100, 100, 0, 100, false
);

do $$
begin
  begin
    update public.finance_documents
    set order_number_snapshot = 'MUTATED'
    where id = 'f6000000-0000-4000-8000-000000000001';
    raise exception 'Receipt snapshot update unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm = 'Receipt snapshot update unexpectedly succeeded' then raise; end if;
  end;

  begin
    update public.finance_documents
    set status = 'ISSUED'
    where id = 'f6000000-0000-4000-8000-000000000001';
    raise exception 'Receipt same-state update unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm = 'Receipt same-state update unexpectedly succeeded' then raise; end if;
  end;

  begin
    update public.finance_document_lines
    set line_total_snapshot = 99
    where id = 'f6100000-0000-4000-8000-000000000001';
    raise exception 'Receipt line update unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm = 'Receipt line update unexpectedly succeeded' then raise; end if;
  end;

  begin
    delete from public.finance_document_lines
    where id = 'f6100000-0000-4000-8000-000000000001';
    raise exception 'Receipt line delete unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm = 'Receipt line delete unexpectedly succeeded' then raise; end if;
  end;

  begin
    insert into public.finance_documents (
      organization_id, document_type, document_number, document_year,
      sequence_value, order_id, payment_id, payment_transaction_id,
      customer_id, order_number_snapshot, currency_code, issued_at,
      settled_at, payment_method_snapshot, customer_display_name_snapshot,
      bill_to_recipient_name_snapshot, bill_to_address_line1_snapshot,
      bill_to_country_code_snapshot, subtotal_snapshot,
      item_discount_total_snapshot, order_discount_total_snapshot,
      shipping_charge_snapshot, shipping_discount_total_snapshot,
      grand_total_snapshot, amount_settled_snapshot, issued_by
    ) values (
      'f1000000-0000-4000-8000-000000000001', 'RECEIPT',
      'RC-2026-000002', 2025, 2,
      'f4000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001',
      'f5100000-0000-4000-8000-000000000001',
      'f3000000-0000-4000-8000-000000000001',
      'RECEIPT-ORDER', 'THB', '2026-01-01 00:10:00+07',
      '2026-01-01 00:00:00+07', 'BANK_TRANSFER', 'Receipt Customer',
      'Receipt Customer', '1 Receipt Road', 'TH', 100, 0, 0, 0, 0, 100, 100,
      'f2000000-0000-4000-8000-000000000001'
    );
    raise exception 'Receipt number-parts mismatch unexpectedly succeeded';
  exception when check_violation or raise_exception then
    if sqlerrm = 'Receipt number-parts mismatch unexpectedly succeeded' then raise; end if;
    null;
  end;

  begin
    insert into public.finance_documents (
      organization_id, document_type, document_number, document_year,
      sequence_value, order_id, payment_id, payment_transaction_id,
      customer_id, order_number_snapshot, currency_code, issued_at,
      settled_at, payment_method_snapshot, customer_display_name_snapshot,
      bill_to_recipient_name_snapshot, bill_to_address_line1_snapshot,
      bill_to_country_code_snapshot, subtotal_snapshot,
      item_discount_total_snapshot, order_discount_total_snapshot,
      shipping_charge_snapshot, shipping_discount_total_snapshot,
      grand_total_snapshot, amount_settled_snapshot, issued_by
    ) values (
      'f1000000-0000-4000-8000-000000000002', 'RECEIPT',
      'RC-2026-000002', 2026, 2,
      'f4000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001',
      'f5100000-0000-4000-8000-000000000001',
      'f3000000-0000-4000-8000-000000000002',
      'RECEIPT-ORDER', 'THB', '2026-01-01 00:10:00+07',
      '2026-01-01 00:00:00+07', 'BANK_TRANSFER', 'Other Customer',
      'Other Customer', '2 Other Road', 'TH', 100, 0, 0, 0, 0, 100, 100,
      'f2000000-0000-4000-8000-000000000001'
    );
    raise exception 'Cross-tenant Receipt source unexpectedly succeeded';
  exception when foreign_key_violation then
    null;
  end;
end;
$$;

update public.finance_documents
set status = 'VOID', voided_at = statement_timestamp(),
    voided_by = 'f2000000-0000-4000-8000-000000000001',
    void_reason = 'Document entry error'
where id = 'f6000000-0000-4000-8000-000000000001';

do $$
begin
  begin
    update public.finance_documents
    set void_reason = 'Second edit'
    where id = 'f6000000-0000-4000-8000-000000000001';
    raise exception 'Terminal Receipt update unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm = 'Terminal Receipt update unexpectedly succeeded' then raise; end if;
  end;

  begin
    delete from public.finance_documents
    where id = 'f6000000-0000-4000-8000-000000000001';
    raise exception 'Receipt header delete unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm = 'Receipt header delete unexpectedly succeeded' then raise; end if;
  end;
end;
$$;

do $$
declare
  v_organization_id uuid := gen_random_uuid();
  v_reset_key text := to_char(now(), 'YYYY');
  v_first text;
  v_second text;
begin
  v_first := public.next_document_number(v_organization_id, 'FOUNDATION_TEST', 'FT-', 'YEARLY');
  v_second := public.next_document_number(v_organization_id, 'FOUNDATION_TEST', 'FT-', 'YEARLY');

  if v_first is distinct from 'FT-' || v_reset_key || '-000001'
     or v_second is distinct from 'FT-' || v_reset_key || '-000002' then
    raise exception 'Hardened sequence helper output changed: %, %', v_first, v_second;
  end if;

  delete from public.document_sequences
  where organization_id = v_organization_id and document_type = 'FOUNDATION_TEST';
end;
$$;

select 'phase_1e_receipt_foundation|pass' as result;

rollback;
