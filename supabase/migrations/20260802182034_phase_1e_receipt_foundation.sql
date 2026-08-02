-- ACOS Phase 1E: Receipt foundation (Layer A only)
-- Runtime actions and read boundaries remain deferred to separately approved layers.

do $$
declare
  v_missing_dependencies text[];
  v_existing_targets text[];
  v_existing_reserved_names text[];
  v_incompatible_permissions integer;
  v_receipt_sequences integer;
  v_operation_definition text;
  v_result_definition text;
  v_helper_owner text;
  v_helper_acl text;
  v_helper_config text[];
  v_helper_return_type text;
  v_helper_body_hash text;
  v_missing_source_keys text[];
  v_probe_organization_id uuid := gen_random_uuid();
  v_expected_reset_key text := to_char(now(), 'YYYY');
  v_first_number text;
  v_second_number text;
begin
  select array_agg(dependency order by dependency)
  into v_missing_dependencies
  from unnest(array[
    'public.organizations',
    'public.profiles',
    'public.customers',
    'public.orders',
    'public.order_items',
    'public.payments',
    'public.payment_transactions',
    'public.refunds',
    'public.permissions',
    'public.document_sequences',
    'public.commerce_idempotency_keys'
  ]) as dependency
  where to_regclass(dependency) is null;

  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    v_missing_dependencies := array_append(
      coalesce(v_missing_dependencies, array[]::text[]),
      'extension:pgcrypto'
    );
  end if;

  if to_regprocedure(
    'public.next_document_number(uuid,character varying,character varying,character varying)'
  ) is null then
    v_missing_dependencies := array_append(
      coalesce(v_missing_dependencies, array[]::text[]),
      'public.next_document_number(uuid,varchar,varchar,varchar)'
    );
  end if;

  if cardinality(coalesce(v_missing_dependencies, array[]::text[])) > 0 then
    raise exception 'Receipt foundation preflight failed: missing dependencies (%)',
      array_to_string(v_missing_dependencies, ', ');
  end if;

  select array_agg(target order by target)
  into v_existing_targets
  from unnest(array[
    'public.finance_documents',
    'public.finance_document_lines'
  ]) as target
  where to_regclass(target) is not null;

  select array_agg(reserved_name order by reserved_name)
  into v_existing_reserved_names
  from (
    select reserved_name
    from unnest(array[
      'finance_documents_tenant_id_key',
      'finance_documents_number_key',
      'finance_documents_sequence_key',
      'finance_documents_type_check',
      'finance_documents_number_format_check',
      'finance_documents_number_parts_check',
      'finance_documents_status_check',
      'finance_documents_amounts_check',
      'finance_documents_lifecycle_check',
      'finance_documents_not_self_replacement_check',
      'finance_documents_organization_id_fkey',
      'finance_documents_order_tenant_fk',
      'finance_documents_payment_tenant_fk',
      'finance_documents_transaction_tenant_fk',
      'finance_documents_customer_tenant_fk',
      'finance_documents_replacement_tenant_fk',
      'finance_documents_issued_by_fk',
      'finance_documents_voided_by_fk',
      'finance_documents_reversed_by_fk',
      'finance_documents_reversal_refund_tenant_fk',
      'finance_documents_reversal_transaction_tenant_fk',
      'finance_document_lines_tenant_id_key',
      'finance_document_lines_number_key',
      'finance_document_lines_organization_id_fkey',
      'finance_document_lines_source_item_key',
      'finance_document_lines_values_check',
      'finance_document_lines_document_tenant_fk',
      'finance_document_lines_order_item_tenant_fk'
    ]) as reserved_name
    where exists (
      select 1 from pg_constraint where conname = reserved_name
    )

    union all

    select reserved_name
    from unnest(array[
      'finance_documents_root_payment_uidx',
      'finance_documents_replacement_uidx',
      'finance_documents_staff_queue_idx',
      'finance_documents_customer_portal_idx',
      'finance_documents_order_idx',
      'finance_documents_payment_idx',
      'finance_documents_payment_transaction_idx',
      'finance_documents_reversal_refund_idx',
      'finance_documents_reversal_transaction_idx'
    ]) as reserved_name
    where to_regclass('public.' || reserved_name) is not null

    union all

    select reserved_name
    from unnest(array[
      'finance_documents_protect',
      'finance_document_lines_protect'
    ]) as reserved_name
    where exists (
      select 1 from pg_trigger where tgname = reserved_name and not tgisinternal
    )

    union all

    select reserved_name
    from unnest(array[
      'public.protect_finance_document_header()',
      'public.protect_finance_document_line()'
    ]) as reserved_name
    where to_regprocedure(reserved_name) is not null
  ) reserved;

  if cardinality(coalesce(v_existing_targets, array[]::text[])) > 0
     or cardinality(coalesce(v_existing_reserved_names, array[]::text[])) > 0 then
    raise exception 'Receipt foundation preflight failed: reserved objects already exist (targets=%, names=%)',
      coalesce(array_to_string(v_existing_targets, ', '), 'none'),
      coalesce(array_to_string(v_existing_reserved_names, ', '), 'none');
  end if;

  select pg_get_constraintdef(oid)
  into v_operation_definition
  from pg_constraint
  where conrelid = 'public.commerce_idempotency_keys'::regclass
    and conname = 'commerce_idempotency_keys_operation_check';

  select pg_get_constraintdef(oid)
  into v_result_definition
  from pg_constraint
  where conrelid = 'public.commerce_idempotency_keys'::regclass
    and conname = 'commerce_idempotency_keys_result_entity_type_check';

  if v_operation_definition is distinct from
    $definition$CHECK (((operation)::text = ANY ((ARRAY['CART_CREATE'::character varying, 'CART_ITEM_SET'::character varying, 'CART_ITEM_REMOVE'::character varying, 'CHECKOUT_START'::character varying, 'CHECKOUT_SUBMIT'::character varying, 'PAYMENT_PROOF_SUBMIT'::character varying, 'PAYMENT_VERIFY'::character varying, 'PAYMENT_REJECT'::character varying, 'CHECKOUT_EXPIRE'::character varying, 'CHECKOUT_COMPENSATE'::character varying])::text[])))$definition$
     or v_result_definition is distinct from
    $definition$CHECK (((result_entity_type IS NULL) OR ((result_entity_type)::text = ANY ((ARRAY['cart'::character varying, 'order'::character varying, 'payment'::character varying, 'payment_transaction'::character varying])::text[]))))$definition$ then
    raise exception 'Receipt foundation preflight failed: commerce idempotency allowlists differ from the Phase 1D baseline';
  end if;

  select count(*)
  into v_incompatible_permissions
  from public.permissions p
  join (values
    ('finance.document.view', 'View finance documents', 'Read tenant finance documents'),
    ('finance.document.create', 'Create finance documents', 'Create an eligible Receipt'),
    ('finance.document.void', 'Void finance documents', 'Void a document for a document error'),
    ('finance.document.reverse', 'Reverse finance documents', 'Reverse a document with approved evidence')
  ) expected(code, name, description) on expected.code = p.code
  where p.name is distinct from expected.name
     or p.description is distinct from expected.description;

  if v_incompatible_permissions > 0 then
    raise exception 'Receipt foundation preflight failed: incompatible finance permission metadata (%)',
      v_incompatible_permissions;
  end if;

  select count(*)
  into v_receipt_sequences
  from public.document_sequences
  where document_type = 'RECEIPT';

  if v_receipt_sequences > 0 then
    raise exception 'Receipt foundation preflight failed: existing RECEIPT sequence rows (%)',
      v_receipt_sequences;
  end if;

  select pg_get_userbyid(p.proowner), p.proacl::text, p.proconfig,
         p.prorettype::regtype::text, md5(p.prosrc)
  into v_helper_owner, v_helper_acl, v_helper_config,
       v_helper_return_type, v_helper_body_hash
  from pg_proc p
  where p.oid = 'public.next_document_number(uuid,character varying,character varying,character varying)'::regprocedure;

  if v_helper_owner is distinct from 'postgres'
     or v_helper_acl is distinct from '{postgres=X/postgres}'
     or v_helper_config is distinct from array['search_path=public']::text[]
     or v_helper_return_type is distinct from 'character varying'
     or v_helper_body_hash is distinct from '205e92637d0443315c78a3f3e4831fa7' then
    raise exception 'Receipt foundation preflight failed: next_document_number differs from the protected baseline';
  end if;

  v_first_number := public.next_document_number(
    v_probe_organization_id, 'RECEIPT_PREFLIGHT', 'PF-', 'YEARLY'
  );
  v_second_number := public.next_document_number(
    v_probe_organization_id, 'RECEIPT_PREFLIGHT', 'PF-', 'YEARLY'
  );

  delete from public.document_sequences
  where organization_id = v_probe_organization_id
    and document_type = 'RECEIPT_PREFLIGHT';

  if v_first_number is distinct from 'PF-' || v_expected_reset_key || '-000001'
     or v_second_number is distinct from 'PF-' || v_expected_reset_key || '-000002' then
    raise exception 'Receipt foundation preflight failed: next_document_number reset/output behavior differs';
  end if;

  select array_agg(required_key order by required_key)
  into v_missing_source_keys
  from unnest(array[
    'customers_organization_id_id_key',
    'orders_organization_id_id_key',
    'order_items_organization_id_id_key',
    'payments_organization_id_id_key',
    'payment_transactions_organization_id_id_key',
    'refunds_organization_id_id_key'
  ]) as required_key
  where not exists (
    select 1
    from pg_constraint
    where conname = required_key
      and contype = 'u'
  );

  if cardinality(coalesce(v_missing_source_keys, array[]::text[])) > 0 then
    raise exception 'Receipt foundation preflight failed: missing canonical same-tenant keys (%)',
      array_to_string(v_missing_source_keys, ', ');
  end if;

  raise notice 'Receipt foundation preflight passed: dependencies=12, reserved_conflicts=0, incompatible_permissions=0, receipt_sequences=0, source_keys=6';
end;
$$;

create table public.finance_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_type varchar(30) not null,
  document_number varchar(14) not null,
  document_year integer not null,
  sequence_value integer not null,
  status varchar(20) not null default 'ISSUED',
  order_id uuid not null,
  payment_id uuid not null,
  payment_transaction_id uuid not null,
  customer_id uuid not null,
  replaces_document_id uuid,
  order_number_snapshot varchar(100) not null,
  currency_code varchar(3) not null,
  issued_at timestamptz not null,
  settled_at timestamptz not null,
  payment_method_snapshot varchar(40) not null,
  customer_display_name_snapshot varchar(200) not null,
  bill_to_recipient_name_snapshot varchar(200) not null,
  bill_to_address_line1_snapshot text not null,
  bill_to_address_line2_snapshot text,
  bill_to_subdistrict_snapshot varchar(150),
  bill_to_district_snapshot varchar(150),
  bill_to_province_snapshot varchar(150),
  bill_to_postal_code_snapshot varchar(20),
  bill_to_country_code_snapshot varchar(2) not null,
  subtotal_snapshot numeric(14,2) not null,
  item_discount_total_snapshot numeric(14,2) not null,
  order_discount_total_snapshot numeric(14,2) not null,
  shipping_charge_snapshot numeric(14,2) not null,
  shipping_discount_total_snapshot numeric(14,2) not null,
  grand_total_snapshot numeric(14,2) not null,
  amount_settled_snapshot numeric(14,2) not null,
  issued_by uuid not null,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  reversed_at timestamptz,
  reversed_by uuid,
  reversal_reason text,
  reversal_refund_id uuid,
  reversal_payment_transaction_id uuid,
  created_at timestamptz not null default statement_timestamp(),

  constraint finance_documents_tenant_id_key unique (organization_id, id),
  constraint finance_documents_number_key
    unique (organization_id, document_type, document_number),
  constraint finance_documents_sequence_key
    unique (organization_id, document_type, document_year, sequence_value),
  constraint finance_documents_type_check check (document_type = 'RECEIPT'),
  constraint finance_documents_number_format_check
    check (document_number ~ '^RC-[0-9]{4}-[0-9]{6}$'),
  constraint finance_documents_number_parts_check check (
    document_year between 1000 and 9999
    and sequence_value between 1 and 999999
    and substring(document_number from 4 for 4)::integer = document_year
    and substring(document_number from 9 for 6)::integer = sequence_value
  ),
  constraint finance_documents_status_check
    check (status in ('ISSUED', 'VOID', 'REVERSED')),
  constraint finance_documents_amounts_check check (
    subtotal_snapshot >= 0
    and item_discount_total_snapshot >= 0
    and order_discount_total_snapshot >= 0
    and shipping_charge_snapshot >= 0
    and shipping_discount_total_snapshot >= 0
    and grand_total_snapshot >= 0
    and amount_settled_snapshot >= 0
    and order_number_snapshot = trim(order_number_snapshot)
    and char_length(order_number_snapshot) between 1 and 100
    and currency_code = upper(trim(currency_code))
    and char_length(currency_code) = 3
    and payment_method_snapshot = trim(payment_method_snapshot)
    and char_length(payment_method_snapshot) between 1 and 40
    and customer_display_name_snapshot = trim(customer_display_name_snapshot)
    and char_length(customer_display_name_snapshot) between 1 and 200
    and bill_to_recipient_name_snapshot = trim(bill_to_recipient_name_snapshot)
    and char_length(bill_to_recipient_name_snapshot) between 1 and 200
    and char_length(trim(bill_to_address_line1_snapshot)) between 1 and 1000
    and (
      bill_to_address_line2_snapshot is null
      or char_length(trim(bill_to_address_line2_snapshot)) between 1 and 1000
    )
    and bill_to_country_code_snapshot = upper(trim(bill_to_country_code_snapshot))
    and char_length(bill_to_country_code_snapshot) = 2
  ),
  constraint finance_documents_lifecycle_check check (
    (
      status = 'ISSUED'
      and voided_at is null and voided_by is null and void_reason is null
      and reversed_at is null and reversed_by is null and reversal_reason is null
      and reversal_refund_id is null
      and reversal_payment_transaction_id is null
    )
    or (
      status = 'VOID'
      and voided_at is not null and voided_by is not null
      and char_length(trim(void_reason)) between 1 and 500
      and reversed_at is null and reversed_by is null and reversal_reason is null
      and reversal_refund_id is null
      and reversal_payment_transaction_id is null
    )
    or (
      status = 'REVERSED'
      and voided_at is null and voided_by is null and void_reason is null
      and reversed_at is not null and reversed_by is not null
      and char_length(trim(reversal_reason)) between 1 and 500
      and num_nonnulls(reversal_refund_id, reversal_payment_transaction_id) = 1
    )
  ),
  constraint finance_documents_not_self_replacement_check
    check (replaces_document_id is null or replaces_document_id <> id),
  constraint finance_documents_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id) on delete restrict,
  constraint finance_documents_order_tenant_fk
    foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  constraint finance_documents_payment_tenant_fk
    foreign key (organization_id, payment_id)
    references public.payments(organization_id, id) on delete restrict,
  constraint finance_documents_transaction_tenant_fk
    foreign key (organization_id, payment_transaction_id)
    references public.payment_transactions(organization_id, id) on delete restrict,
  constraint finance_documents_customer_tenant_fk
    foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  constraint finance_documents_replacement_tenant_fk
    foreign key (organization_id, replaces_document_id)
    references public.finance_documents(organization_id, id) on delete restrict,
  constraint finance_documents_issued_by_fk
    foreign key (issued_by) references public.profiles(id) on delete restrict,
  constraint finance_documents_voided_by_fk
    foreign key (voided_by) references public.profiles(id) on delete restrict,
  constraint finance_documents_reversed_by_fk
    foreign key (reversed_by) references public.profiles(id) on delete restrict,
  constraint finance_documents_reversal_refund_tenant_fk
    foreign key (organization_id, reversal_refund_id)
    references public.refunds(organization_id, id) on delete restrict,
  constraint finance_documents_reversal_transaction_tenant_fk
    foreign key (organization_id, reversal_payment_transaction_id)
    references public.payment_transactions(organization_id, id) on delete restrict
);

create unique index finance_documents_root_payment_uidx
  on public.finance_documents (organization_id, document_type, payment_id)
  where replaces_document_id is null;

create unique index finance_documents_replacement_uidx
  on public.finance_documents (organization_id, replaces_document_id)
  where replaces_document_id is not null;

create index finance_documents_staff_queue_idx
  on public.finance_documents (organization_id, status, issued_at desc, id desc);

create index finance_documents_customer_portal_idx
  on public.finance_documents (organization_id, customer_id, issued_at desc, id desc);

create index finance_documents_order_idx
  on public.finance_documents (organization_id, order_id);

create index finance_documents_payment_idx
  on public.finance_documents (organization_id, payment_id);

create index finance_documents_payment_transaction_idx
  on public.finance_documents (organization_id, payment_transaction_id);

create index finance_documents_reversal_refund_idx
  on public.finance_documents (organization_id, reversal_refund_id)
  where reversal_refund_id is not null;

create index finance_documents_reversal_transaction_idx
  on public.finance_documents (organization_id, reversal_payment_transaction_id)
  where reversal_payment_transaction_id is not null;

create table public.finance_document_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  line_number integer not null,
  source_order_item_id uuid not null,
  sku_snapshot varchar(120),
  sale_code_snapshot varchar(80),
  product_name_snapshot varchar(255) not null,
  variant_name_snapshot varchar(255),
  quantity_snapshot numeric(14,3) not null,
  original_unit_price_snapshot numeric(14,2) not null,
  applied_unit_price_snapshot numeric(14,2) not null,
  line_discount_total_snapshot numeric(14,2) not null,
  line_total_snapshot numeric(14,2) not null,
  is_reward_item_snapshot boolean not null,
  created_at timestamptz not null default statement_timestamp(),

  constraint finance_document_lines_tenant_id_key unique (organization_id, id),
  constraint finance_document_lines_number_key
    unique (organization_id, document_id, line_number),
  constraint finance_document_lines_source_item_key
    unique (organization_id, document_id, source_order_item_id),
  constraint finance_document_lines_values_check check (
    line_number > 0
    and quantity_snapshot > 0
    and original_unit_price_snapshot >= 0
    and applied_unit_price_snapshot >= 0
    and line_discount_total_snapshot >= 0
    and line_total_snapshot >= 0
    and product_name_snapshot = trim(product_name_snapshot)
    and char_length(product_name_snapshot) between 1 and 255
  ),
  constraint finance_document_lines_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id) on delete restrict,
  constraint finance_document_lines_document_tenant_fk
    foreign key (organization_id, document_id)
    references public.finance_documents(organization_id, id) on delete restrict,
  constraint finance_document_lines_order_item_tenant_fk
    foreign key (organization_id, source_order_item_id)
    references public.order_items(organization_id, id) on delete restrict
);

alter table public.finance_documents enable row level security;
alter table public.finance_document_lines enable row level security;

revoke all on table public.finance_documents
  from public, anon, authenticated, service_role;
revoke all on table public.finance_document_lines
  from public, anon, authenticated, service_role;

create or replace function public.protect_finance_document_header()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_timezone text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Finance documents are protected financial history and cannot be deleted';
  end if;

  if tg_op = 'INSERT' then
    select o.timezone
    into v_document_timezone
    from public.organizations o
    where o.id = new.organization_id;

    if v_document_timezone is null then
      raise exception 'Organization document timezone is unavailable';
    end if;

    if extract(year from pg_catalog.timezone(v_document_timezone, new.issued_at))::integer
       is distinct from new.document_year then
      raise exception 'Document year must match issued_at in the organization timezone';
    end if;

    return new;
  end if;

  if old.status <> 'ISSUED' then
    raise exception 'Terminal finance documents cannot be changed';
  end if;

  if new.status not in ('VOID', 'REVERSED') then
    raise exception 'Only ISSUED to VOID or ISSUED to REVERSED is allowed';
  end if;

  if row(
    new.id, new.organization_id, new.document_type, new.document_number,
    new.document_year, new.sequence_value, new.order_id, new.payment_id,
    new.payment_transaction_id, new.customer_id, new.replaces_document_id,
    new.order_number_snapshot, new.currency_code, new.issued_at, new.settled_at,
    new.payment_method_snapshot, new.customer_display_name_snapshot,
    new.bill_to_recipient_name_snapshot, new.bill_to_address_line1_snapshot,
    new.bill_to_address_line2_snapshot, new.bill_to_subdistrict_snapshot,
    new.bill_to_district_snapshot, new.bill_to_province_snapshot,
    new.bill_to_postal_code_snapshot, new.bill_to_country_code_snapshot,
    new.subtotal_snapshot, new.item_discount_total_snapshot,
    new.order_discount_total_snapshot, new.shipping_charge_snapshot,
    new.shipping_discount_total_snapshot, new.grand_total_snapshot,
    new.amount_settled_snapshot, new.issued_by, new.created_at
  ) is distinct from row(
    old.id, old.organization_id, old.document_type, old.document_number,
    old.document_year, old.sequence_value, old.order_id, old.payment_id,
    old.payment_transaction_id, old.customer_id, old.replaces_document_id,
    old.order_number_snapshot, old.currency_code, old.issued_at, old.settled_at,
    old.payment_method_snapshot, old.customer_display_name_snapshot,
    old.bill_to_recipient_name_snapshot, old.bill_to_address_line1_snapshot,
    old.bill_to_address_line2_snapshot, old.bill_to_subdistrict_snapshot,
    old.bill_to_district_snapshot, old.bill_to_province_snapshot,
    old.bill_to_postal_code_snapshot, old.bill_to_country_code_snapshot,
    old.subtotal_snapshot, old.item_discount_total_snapshot,
    old.order_discount_total_snapshot, old.shipping_charge_snapshot,
    old.shipping_discount_total_snapshot, old.grand_total_snapshot,
    old.amount_settled_snapshot, old.issued_by, old.created_at
  ) then
    raise exception 'Finance document identity, source, snapshot, and created fields are immutable';
  end if;

  if new.status = 'VOID' and (
    new.reversed_at is not null or new.reversed_by is not null
    or new.reversal_reason is not null or new.reversal_refund_id is not null
    or new.reversal_payment_transaction_id is not null
  ) then
    raise exception 'VOID cannot include reversal evidence';
  end if;

  if new.status = 'REVERSED' and (
    new.voided_at is not null or new.voided_by is not null or new.void_reason is not null
  ) then
    raise exception 'REVERSED cannot include void evidence';
  end if;

  return new;
end;
$$;

create or replace function public.protect_finance_document_line()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Finance document lines are immutable financial history';
end;
$$;

create trigger finance_documents_protect
before insert or update or delete on public.finance_documents
for each row execute function public.protect_finance_document_header();

create trigger finance_document_lines_protect
before update or delete on public.finance_document_lines
for each row execute function public.protect_finance_document_line();

revoke all on function public.protect_finance_document_header()
  from public, anon, authenticated, service_role;
revoke all on function public.protect_finance_document_line()
  from public, anon, authenticated, service_role;

alter table public.commerce_idempotency_keys
  drop constraint commerce_idempotency_keys_operation_check,
  add constraint commerce_idempotency_keys_operation_check check (operation in (
    'CART_CREATE',
    'CART_ITEM_SET',
    'CART_ITEM_REMOVE',
    'CHECKOUT_START',
    'CHECKOUT_SUBMIT',
    'PAYMENT_PROOF_SUBMIT',
    'PAYMENT_VERIFY',
    'PAYMENT_REJECT',
    'CHECKOUT_EXPIRE',
    'CHECKOUT_COMPENSATE',
    'RECEIPT_CREATE',
    'RECEIPT_VOID',
    'RECEIPT_REVERSE'
  ));

alter table public.commerce_idempotency_keys
  drop constraint commerce_idempotency_keys_result_entity_type_check,
  add constraint commerce_idempotency_keys_result_entity_type_check check (
    result_entity_type is null
    or result_entity_type in (
      'cart',
      'order',
      'payment',
      'payment_transaction',
      'finance_document'
    )
  );

insert into public.permissions (code, name, description)
values
  ('finance.document.view', 'View finance documents', 'Read tenant finance documents'),
  ('finance.document.create', 'Create finance documents', 'Create an eligible Receipt'),
  ('finance.document.void', 'Void finance documents', 'Void a document for a document error'),
  ('finance.document.reverse', 'Reverse finance documents', 'Reverse a document with approved evidence')
on conflict (code) do nothing;

create or replace function public.next_document_number(
  p_organization_id uuid,
  p_document_type varchar,
  p_prefix varchar default '',
  p_reset_policy varchar default 'NEVER'
)
returns varchar
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_reset_key varchar;
  v_value bigint;
  v_prefix varchar;
begin
  if p_reset_policy not in ('NEVER','YEARLY','MONTHLY','DAILY') then
    raise exception 'Unsupported reset policy: %', p_reset_policy;
  end if;

  v_reset_key := case p_reset_policy
    when 'YEARLY' then pg_catalog.to_char(v_now, 'YYYY')
    when 'MONTHLY' then pg_catalog.to_char(v_now, 'YYYYMM')
    when 'DAILY' then pg_catalog.to_char(v_now, 'YYYYMMDD')
    else null
  end;

  insert into public.document_sequences (
    organization_id, document_type, prefix, current_value, reset_policy, last_reset_key
  )
  values (
    p_organization_id, p_document_type, coalesce(p_prefix,''), 0, p_reset_policy, v_reset_key
  )
  on conflict (organization_id, document_type) do nothing;

  update public.document_sequences
  set prefix = coalesce(p_prefix, prefix),
      reset_policy = p_reset_policy,
      current_value = case
        when p_reset_policy <> 'NEVER'
         and last_reset_key is distinct from v_reset_key
        then 1 else current_value + 1 end,
      last_reset_key = v_reset_key,
      updated_at = pg_catalog.now()
  where organization_id = p_organization_id
    and document_type = p_document_type
  returning prefix, current_value into v_prefix, v_value;

  return pg_catalog.concat(
    v_prefix,
    case when p_reset_policy = 'NEVER' then '' else v_reset_key || '-' end,
    pg_catalog.lpad(v_value::text, 6, '0')
  );
end;
$$;

revoke all on function public.next_document_number(uuid,varchar,varchar,varchar)
  from public, anon, authenticated, service_role;

comment on table public.finance_documents is
  'Protected immutable Receipt header and lifecycle history. Runtime actions are deferred to Layer B.';
comment on table public.finance_document_lines is
  'Protected immutable Receipt line snapshots. Runtime actions are deferred to Layer B.';
comment on function public.protect_finance_document_header() is
  'Internal trigger boundary for Receipt issue-year and lifecycle immutability.';
comment on function public.protect_finance_document_line() is
  'Internal trigger boundary preventing Receipt line updates and deletes.';
