-- ACOS Phase 1E: guarded Receipt actions (Layer B only).
-- Staff/Portal reads, role mappings, runtime UI, and Production activation remain deferred.

do $$
declare
  v_missing_dependencies text[];
  v_missing_layer_a_objects text[];
  v_existing_targets text[];
  v_wide_table_grants integer;
  v_incompatible_permissions integer;
  v_operation_definition text;
  v_result_definition text;
begin
  select array_agg(dependency order by dependency)
  into v_missing_dependencies
  from unnest(array[
    'public.organizations',
    'public.profiles',
    'public.organization_memberships',
    'public.permissions',
    'public.role_permissions',
    'public.membership_roles',
    'public.roles',
    'public.customers',
    'public.orders',
    'public.order_items',
    'public.order_addresses',
    'public.payments',
    'public.payment_transactions',
    'public.payment_proofs',
    'public.refunds',
    'public.refund_transactions',
    'public.commerce_idempotency_keys',
    'public.audit_logs',
    'public.document_sequences',
    'public.finance_documents',
    'public.finance_document_lines'
  ]) as dependency
  where to_regclass(dependency) is null;

  if to_regprocedure('public.has_org_permission(uuid,text)') is null then
    v_missing_dependencies := array_append(
      coalesce(v_missing_dependencies, array[]::text[]),
      'public.has_org_permission(uuid,text)'
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
    raise exception 'Receipt action preflight failed: missing dependencies (%)',
      array_to_string(v_missing_dependencies, ', ');
  end if;

  select array_agg(required_object order by required_object)
  into v_missing_layer_a_objects
  from (
    select required_object
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
      'finance_document_lines_source_item_key',
      'finance_document_lines_values_check',
      'finance_document_lines_organization_id_fkey',
      'finance_document_lines_document_tenant_fk',
      'finance_document_lines_order_item_tenant_fk'
    ]) as required_object
    where not exists (
      select 1 from pg_constraint where conname = required_object
    )

    union all

    select required_object
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
    ]) as required_object
    where to_regclass('public.' || required_object) is null

    union all

    select required_object
    from unnest(array[
      'finance_documents_protect',
      'finance_document_lines_protect'
    ]) as required_object
    where not exists (
      select 1 from pg_trigger
      where tgname = required_object and not tgisinternal
    )
  ) missing;

  if cardinality(coalesce(v_missing_layer_a_objects, array[]::text[])) > 0
     or not exists (
       select 1 from pg_class
       where oid = 'public.finance_documents'::regclass and relrowsecurity
     )
     or not exists (
       select 1 from pg_class
       where oid = 'public.finance_document_lines'::regclass and relrowsecurity
     ) then
    raise exception 'Receipt action preflight failed: Layer A posture differs (missing=%)',
      coalesce(array_to_string(v_missing_layer_a_objects, ', '), 'none');
  end if;

  select count(*)
  into v_wide_table_grants
  from information_schema.role_table_grants grant_row
  where grant_row.table_schema = 'public'
    and grant_row.table_name in ('finance_documents', 'finance_document_lines')
    and grant_row.grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role');

  if v_wide_table_grants <> 0 then
    raise exception 'Receipt action preflight failed: direct finance table grants are wider than frozen posture (%)',
      v_wide_table_grants;
  end if;

  if has_function_privilege(
       'anon',
       'public.next_document_number(uuid,character varying,character varying,character varying)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.next_document_number(uuid,character varying,character varying,character varying)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.next_document_number(uuid,character varying,character varying,character varying)',
       'EXECUTE'
     ) then
    raise exception 'Receipt action preflight failed: protected sequence helper is executable by an API role';
  end if;

  select count(*)
  into v_incompatible_permissions
  from (values
    ('finance.document.view', 'View finance documents', 'Read tenant finance documents'),
    ('finance.document.create', 'Create finance documents', 'Create an eligible Receipt'),
    ('finance.document.void', 'Void finance documents', 'Void a document for a document error'),
    ('finance.document.reverse', 'Reverse finance documents', 'Reverse a document with approved evidence')
  ) expected(code, name, description)
  left join public.permissions permission on permission.code = expected.code
  where permission.id is null
     or permission.name is distinct from expected.name
     or permission.description is distinct from expected.description;

  if v_incompatible_permissions <> 0 then
    raise exception 'Receipt action preflight failed: finance permission metadata differs (%)',
      v_incompatible_permissions;
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
    $definition$CHECK (((operation)::text = ANY ((ARRAY['CART_CREATE'::character varying, 'CART_ITEM_SET'::character varying, 'CART_ITEM_REMOVE'::character varying, 'CHECKOUT_START'::character varying, 'CHECKOUT_SUBMIT'::character varying, 'PAYMENT_PROOF_SUBMIT'::character varying, 'PAYMENT_VERIFY'::character varying, 'PAYMENT_REJECT'::character varying, 'CHECKOUT_EXPIRE'::character varying, 'CHECKOUT_COMPENSATE'::character varying, 'RECEIPT_CREATE'::character varying, 'RECEIPT_VOID'::character varying, 'RECEIPT_REVERSE'::character varying])::text[])))$definition$
     or v_result_definition is distinct from
    $definition$CHECK (((result_entity_type IS NULL) OR ((result_entity_type)::text = ANY ((ARRAY['cart'::character varying, 'order'::character varying, 'payment'::character varying, 'payment_transaction'::character varying, 'finance_document'::character varying])::text[]))))$definition$ then
    raise exception 'Receipt action preflight failed: idempotency allowlists differ from Layer A';
  end if;

  select array_agg(target order by target)
  into v_existing_targets
  from unnest(array[
    'public.internal_claim_receipt_action(uuid,text,uuid,uuid,uuid,uuid,uuid,text)',
    'public.internal_complete_receipt_action(uuid,text,uuid,uuid)',
    'public.internal_fail_receipt_action(uuid,text,uuid,text)',
    'public.internal_receipt_action_response(uuid,uuid,boolean)',
    'public.api_create_receipt_document(uuid,uuid,uuid,uuid)',
    'public.api_void_receipt_document(uuid,uuid,text,uuid)',
    'public.api_reverse_receipt_document(uuid,uuid,text,uuid,uuid,uuid)'
  ]) as target
  where to_regprocedure(target) is not null;

  if cardinality(coalesce(v_existing_targets, array[]::text[])) > 0 then
    raise exception 'Receipt action preflight failed: reserved functions already exist (%)',
      array_to_string(v_existing_targets, ', ');
  end if;

  raise notice 'Receipt action preflight passed: dependencies=23, layer_a_catalog=39, wide_grants=0, permissions=4, reserved_functions=0';
end;
$$;

create function public.internal_claim_receipt_action(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_subject_id uuid,
  p_related_id uuid,
  p_secondary_related_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_request_hash bytea;
  v_existing public.commerce_idempotency_keys%rowtype;
  v_inserted bigint := 0;
begin
  if p_operation not in ('RECEIPT_CREATE', 'RECEIPT_VOID', 'RECEIPT_REVERSE')
     or p_organization_id is null
     or p_request_id is null
     or p_actor_profile_id is null
     or p_subject_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  v_request_hash := extensions.digest(
    pg_catalog.convert_to(
      pg_catalog.concat_ws(
        '|', 'v1', p_operation, p_organization_id, p_actor_profile_id,
        p_subject_id, p_related_id, p_secondary_related_id, p_reason
      ),
      'UTF8'
    ),
    'sha256'
  );

  insert into public.commerce_idempotency_keys (
    organization_id,
    operation,
    request_id,
    actor_profile_id,
    request_hash,
    state,
    started_at
  ) values (
    p_organization_id,
    p_operation,
    p_request_id,
    p_actor_profile_id,
    v_request_hash,
    'IN_PROGRESS',
    statement_timestamp()
  )
  on conflict (organization_id, operation, request_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return pg_catalog.jsonb_build_object('state', 'NEW');
  end if;

  select key_row.*
  into v_existing
  from public.commerce_idempotency_keys key_row
  where key_row.organization_id = p_organization_id
    and key_row.operation = p_operation
    and key_row.request_id = p_request_id
  for update;

  if v_existing.request_hash is distinct from v_request_hash
     or v_existing.actor_profile_id is distinct from p_actor_profile_id then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  if v_existing.state = 'SUCCEEDED'
     and v_existing.result_entity_type = 'finance_document'
     and v_existing.result_entity_id is not null then
    return pg_catalog.jsonb_build_object(
      'state', 'SUCCEEDED',
      'document_id', v_existing.result_entity_id
    );
  end if;

  if v_existing.state = 'FAILED' and v_existing.failure_code is not null then
    return pg_catalog.jsonb_build_object(
      'state', 'FAILED',
      'failure_code', v_existing.failure_code
    );
  end if;

  raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
end;
$$;

create function public.internal_complete_receipt_action(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_document_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.commerce_idempotency_keys key_row
  set state = 'SUCCEEDED',
      result_entity_type = 'finance_document',
      result_entity_id = p_document_id,
      completed_at = statement_timestamp()
  where key_row.organization_id = p_organization_id
    and key_row.operation = p_operation
    and key_row.request_id = p_request_id
    and key_row.state = 'IN_PROGRESS';

  if not found then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;
end;
$$;

create function public.internal_fail_receipt_action(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_failure_code text
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_failure_code not in (
    'DOCUMENT_UNAVAILABLE',
    'PAYMENT_NOT_ELIGIBLE',
    'ADDRESS_NOT_AVAILABLE',
    'INVALID_LIFECYCLE',
    'REVERSAL_EVIDENCE_REQUIRED',
    'SEQUENCE_UNAVAILABLE'
  ) then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  update public.commerce_idempotency_keys key_row
  set state = 'FAILED',
      failure_code = p_failure_code,
      completed_at = statement_timestamp()
  where key_row.organization_id = p_organization_id
    and key_row.operation = p_operation
    and key_row.request_id = p_request_id
    and key_row.state = 'IN_PROGRESS';

  if not found then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;
end;
$$;

create function public.internal_receipt_action_response(
  p_organization_id uuid,
  p_document_id uuid,
  p_idempotency_reused boolean
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'ok', true,
    'document_id', document.id,
    'document_number', document.document_number,
    'status', document.status,
    'issued_at', document.issued_at,
    'idempotency_reused', p_idempotency_reused
  )
  from public.finance_documents document
  where document.organization_id = p_organization_id
    and document.id = p_document_id;
$$;

create function public.api_create_receipt_document(
  p_organization_id uuid,
  p_payment_id uuid,
  p_request_id uuid,
  p_replaces_document_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_claim jsonb;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_transaction public.payment_transactions%rowtype;
  v_customer public.customers%rowtype;
  v_address public.order_addresses%rowtype;
  v_predecessor public.finance_documents%rowtype;
  v_organization public.organizations%rowtype;
  v_success_count bigint;
  v_success_amount numeric(14,2);
  v_line_count bigint;
  v_customer_display_name text;
  v_document_id uuid := gen_random_uuid();
  v_document_number text;
  v_document_year integer;
  v_sequence_value integer;
  v_issued_at timestamptz := statement_timestamp();
  v_previous_timezone text;
  v_failure_code text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_payment_id is null or p_request_id is null then
    raise exception 'PAYMENT_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  select profile.id
  into v_profile_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.status = 'ACTIVE';

  if v_profile_id is null then
    raise exception 'PROFILE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization
      on organization.id = membership.organization_id
     and organization.status = 'ACTIVE'
    where membership.organization_id = p_organization_id
      and membership.profile_id = v_profile_id
      and membership.status = 'ACTIVE'
  ) then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not coalesce(
    public.has_org_permission(p_organization_id, 'finance.document.create'),
    false
  ) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  v_claim := public.internal_claim_receipt_action(
    p_organization_id,
    'RECEIPT_CREATE',
    p_request_id,
    v_profile_id,
    p_payment_id,
    p_replaces_document_id,
    null,
    null
  );

  if v_claim ->> 'state' = 'SUCCEEDED' then
    return public.internal_receipt_action_response(
      p_organization_id,
      (v_claim ->> 'document_id')::uuid,
      true
    );
  end if;

  if v_claim ->> 'state' = 'FAILED' then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'error_code', v_claim ->> 'failure_code',
      'idempotency_reused', true
    );
  end if;

  begin
    select organization.*
    into v_organization
    from public.organizations organization
    where organization.id = p_organization_id
      and organization.status = 'ACTIVE';

    if v_organization.id is null or nullif(pg_catalog.btrim(v_organization.timezone), '') is null then
      raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
    end if;

    select payment.*
    into v_payment
    from public.payments payment
    where payment.organization_id = p_organization_id
      and payment.id = p_payment_id
    for update;

    if v_payment.id is null then
      raise exception 'PAYMENT_NOT_ELIGIBLE' using errcode = 'P0001';
    end if;

    select order_row.*
    into v_order
    from public.orders order_row
    where order_row.organization_id = p_organization_id
      and order_row.id = v_payment.order_id
    for update;

    if v_order.id is null then
      raise exception 'PAYMENT_NOT_ELIGIBLE' using errcode = 'P0001';
    end if;

    perform 1
    from public.payment_transactions transaction_row
    where transaction_row.organization_id = p_organization_id
      and transaction_row.payment_id = v_payment.id
      and transaction_row.status = 'SUCCEEDED'
    order by transaction_row.id
    for update;

    select
      count(*),
      coalesce(sum(transaction_row.amount), 0)
    into v_success_count, v_success_amount
    from public.payment_transactions transaction_row
    where transaction_row.organization_id = p_organization_id
      and transaction_row.payment_id = v_payment.id
      and transaction_row.status = 'SUCCEEDED';

    select transaction_row.*
    into v_transaction
    from public.payment_transactions transaction_row
    where transaction_row.organization_id = p_organization_id
      and transaction_row.payment_id = v_payment.id
      and transaction_row.status = 'SUCCEEDED'
    order by
      coalesce(transaction_row.paid_at, transaction_row.created_at) desc,
      transaction_row.id desc
    limit 1;

    if v_order.order_status <> 'CONFIRMED'
       or v_order.payment_status <> 'PAID'
       or v_order.cancelled_at is not null
       or v_payment.status <> 'PAID'
       or v_payment.amount_expected <= 0
       or v_payment.amount_received <> v_payment.amount_expected
       or v_order.grand_total <> v_payment.amount_expected
       or v_order.amount_paid <> v_payment.amount_received
       or v_order.amount_due <> 0
       or v_order.currency_code <> v_payment.currency_code
       or v_success_count < 1
       or v_success_amount <> v_payment.amount_expected
       or v_transaction.id is null
       or v_transaction.paid_at is null
       or exists (
         select 1
         from public.payment_transactions transaction_row
         where transaction_row.organization_id = p_organization_id
           and transaction_row.payment_id = v_payment.id
           and transaction_row.status = 'SUCCEEDED'
           and (
             transaction_row.currency_code <> v_payment.currency_code
             or transaction_row.paid_at is null
           )
       )
       or exists (
         select 1
         from public.payment_transactions transaction_row
         where transaction_row.organization_id = p_organization_id
           and transaction_row.payment_id = v_payment.id
           and transaction_row.status = 'SUCCEEDED'
           and transaction_row.payment_method = 'BANK_TRANSFER'
           and not exists (
             select 1
             from public.payment_proofs proof
             where proof.organization_id = transaction_row.organization_id
               and proof.payment_transaction_id = transaction_row.id
               and proof.verification_status = 'VERIFIED'
           )
       ) then
      raise exception 'PAYMENT_NOT_ELIGIBLE' using errcode = 'P0001';
    end if;

    if p_replaces_document_id is not null then
      select document.*
      into v_predecessor
      from public.finance_documents document
      where document.organization_id = p_organization_id
        and document.id = p_replaces_document_id
      for update;

      if v_predecessor.id is null
         or v_predecessor.status <> 'VOID'
         or v_predecessor.document_type <> 'RECEIPT'
         or v_predecessor.payment_id <> v_payment.id
         or v_predecessor.order_id <> v_order.id
         or v_predecessor.customer_id <> v_order.customer_id
         or v_predecessor.currency_code <> v_payment.currency_code
         or exists (
           select 1
           from public.finance_documents replacement
           where replacement.organization_id = p_organization_id
             and replacement.replaces_document_id = v_predecessor.id
         ) then
        raise exception 'INVALID_LIFECYCLE' using errcode = 'P0001';
      end if;
    elsif exists (
      select 1
      from public.finance_documents document
      where document.organization_id = p_organization_id
        and document.document_type = 'RECEIPT'
        and document.payment_id = v_payment.id
        and document.replaces_document_id is null
    ) then
      raise exception 'INVALID_LIFECYCLE' using errcode = 'P0001';
    end if;

    select customer.*
    into v_customer
    from public.customers customer
    where customer.organization_id = p_organization_id
      and customer.id = v_order.customer_id
    for share;

    v_customer_display_name := coalesce(
      nullif(pg_catalog.btrim(v_customer.display_name), ''),
      nullif(pg_catalog.btrim(pg_catalog.concat_ws(' ', v_customer.first_name, v_customer.last_name)), ''),
      nullif(pg_catalog.btrim(v_customer.customer_code), '')
    );

    if v_customer.id is null
       or v_customer_display_name is null
       or char_length(v_customer_display_name) > 200 then
      raise exception 'PAYMENT_NOT_ELIGIBLE' using errcode = 'P0001';
    end if;

    select address.*
    into v_address
    from public.order_addresses address
    where address.organization_id = p_organization_id
      and address.order_id = v_order.id
      and address.address_type in ('BILLING', 'SHIPPING')
    order by case address.address_type when 'BILLING' then 0 else 1 end, address.id
    limit 1
    for share;

    if v_address.id is null
       or nullif(pg_catalog.btrim(v_address.recipient_name), '') is null
       or nullif(pg_catalog.btrim(v_address.address_line1), '') is null
       or nullif(pg_catalog.btrim(v_address.country_code), '') is null then
      raise exception 'ADDRESS_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    perform 1
    from public.order_items item
    where item.organization_id = p_organization_id
      and item.order_id = v_order.id
    order by item.created_at, item.id
    for share;

    select count(*)
    into v_line_count
    from public.order_items item
    where item.organization_id = p_organization_id
      and item.order_id = v_order.id
      and item.quantity > 0
      and item.original_unit_price >= 0
      and item.applied_unit_price >= 0
      and item.line_discount_total >= 0
      and item.line_total >= 0
      and nullif(pg_catalog.btrim(item.product_name_snapshot), '') is not null;

    if v_line_count = 0
       or v_line_count <> (
         select count(*)
         from public.order_items item
         where item.organization_id = p_organization_id
           and item.order_id = v_order.id
       ) then
      raise exception 'PAYMENT_NOT_ELIGIBLE' using errcode = 'P0001';
    end if;

    begin
      v_previous_timezone := pg_catalog.current_setting('TimeZone');
      perform pg_catalog.set_config('TimeZone', v_organization.timezone, true);
      v_document_number := public.next_document_number(
        p_organization_id,
        'RECEIPT'::varchar,
        'RC-'::varchar,
        'YEARLY'::varchar
      );
      perform pg_catalog.set_config('TimeZone', v_previous_timezone, true);
    exception
      when others then
        if v_previous_timezone is not null then
          perform pg_catalog.set_config('TimeZone', v_previous_timezone, true);
        end if;
        raise exception 'SEQUENCE_UNAVAILABLE' using errcode = 'P0001';
    end;

    if v_document_number !~ '^RC-[0-9]{4}-[0-9]{6}$' then
      raise exception 'SEQUENCE_UNAVAILABLE' using errcode = 'P0001';
    end if;

    v_document_year := substring(v_document_number from 4 for 4)::integer;
    v_sequence_value := substring(v_document_number from 9 for 6)::integer;

    insert into public.finance_documents (
      id,
      organization_id,
      document_type,
      document_number,
      document_year,
      sequence_value,
      status,
      order_id,
      payment_id,
      payment_transaction_id,
      customer_id,
      replaces_document_id,
      order_number_snapshot,
      currency_code,
      issued_at,
      settled_at,
      payment_method_snapshot,
      customer_display_name_snapshot,
      bill_to_recipient_name_snapshot,
      bill_to_address_line1_snapshot,
      bill_to_address_line2_snapshot,
      bill_to_subdistrict_snapshot,
      bill_to_district_snapshot,
      bill_to_province_snapshot,
      bill_to_postal_code_snapshot,
      bill_to_country_code_snapshot,
      subtotal_snapshot,
      item_discount_total_snapshot,
      order_discount_total_snapshot,
      shipping_charge_snapshot,
      shipping_discount_total_snapshot,
      grand_total_snapshot,
      amount_settled_snapshot,
      issued_by,
      created_at
    ) values (
      v_document_id,
      p_organization_id,
      'RECEIPT',
      v_document_number,
      v_document_year,
      v_sequence_value,
      'ISSUED',
      v_order.id,
      v_payment.id,
      v_transaction.id,
      v_order.customer_id,
      p_replaces_document_id,
      v_order.order_number,
      v_payment.currency_code,
      v_issued_at,
      v_transaction.paid_at,
      v_transaction.payment_method,
      v_customer_display_name,
      pg_catalog.btrim(v_address.recipient_name),
      pg_catalog.btrim(v_address.address_line1),
      nullif(pg_catalog.btrim(v_address.address_line2), ''),
      nullif(pg_catalog.btrim(v_address.subdistrict), ''),
      nullif(pg_catalog.btrim(v_address.district), ''),
      nullif(pg_catalog.btrim(v_address.province), ''),
      nullif(pg_catalog.btrim(v_address.postal_code), ''),
      upper(pg_catalog.btrim(v_address.country_code)),
      v_order.subtotal,
      v_order.item_discount_total,
      v_order.order_discount_total,
      v_order.shipping_charge,
      v_order.shipping_discount_total,
      v_order.grand_total,
      v_payment.amount_received,
      v_profile_id,
      v_issued_at
    );

    insert into public.finance_document_lines (
      organization_id,
      document_id,
      line_number,
      source_order_item_id,
      sku_snapshot,
      sale_code_snapshot,
      product_name_snapshot,
      variant_name_snapshot,
      quantity_snapshot,
      original_unit_price_snapshot,
      applied_unit_price_snapshot,
      line_discount_total_snapshot,
      line_total_snapshot,
      is_reward_item_snapshot,
      created_at
    )
    select
      p_organization_id,
      v_document_id,
      row_number() over (order by item.created_at, item.id)::integer,
      item.id,
      item.sku_snapshot,
      item.sale_code_snapshot,
      pg_catalog.btrim(item.product_name_snapshot),
      nullif(pg_catalog.btrim(item.variant_name_snapshot), ''),
      item.quantity,
      item.original_unit_price,
      item.applied_unit_price,
      item.line_discount_total,
      item.line_total,
      item.is_reward_item,
      v_issued_at
    from public.order_items item
    where item.organization_id = p_organization_id
      and item.order_id = v_order.id
    order by item.created_at, item.id;

    insert into public.audit_logs (
      organization_id,
      actor_profile_id,
      actor_type,
      entity_type,
      entity_id,
      action,
      before_json,
      after_json,
      request_id
    ) values (
      p_organization_id,
      v_profile_id,
      'USER',
      'finance_document',
      v_document_id,
      case when p_replaces_document_id is null then 'RECEIPT_CREATED' else 'RECEIPT_REPLACED' end,
      case
        when p_replaces_document_id is null then null
        else pg_catalog.jsonb_build_object('predecessor_status', v_predecessor.status)
      end,
      pg_catalog.jsonb_build_object(
        'document_type', 'RECEIPT',
        'status', 'ISSUED',
        'replacement', p_replaces_document_id is not null
      ),
      p_request_id
    );

    perform public.internal_complete_receipt_action(
      p_organization_id,
      'RECEIPT_CREATE',
      p_request_id,
      v_document_id
    );
  exception
    when unique_violation then
      v_failure_code := 'INVALID_LIFECYCLE';
    when sqlstate 'P0001' then
      if sqlerrm in (
        'DOCUMENT_UNAVAILABLE',
        'PAYMENT_NOT_ELIGIBLE',
        'ADDRESS_NOT_AVAILABLE',
        'INVALID_LIFECYCLE',
        'SEQUENCE_UNAVAILABLE'
      ) then
        v_failure_code := sqlerrm;
      else
        raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
      end if;
  end;

  if v_failure_code is not null then
    perform public.internal_fail_receipt_action(
      p_organization_id,
      'RECEIPT_CREATE',
      p_request_id,
      v_failure_code
    );

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'error_code', v_failure_code,
      'idempotency_reused', false
    );
  end if;

  return public.internal_receipt_action_response(
    p_organization_id,
    v_document_id,
    false
  );
exception
  when sqlstate '42501' or sqlstate '22023' then
    raise;
  when others then
    raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

create function public.api_void_receipt_document(
  p_organization_id uuid,
  p_document_id uuid,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_reason text := pg_catalog.btrim(p_reason);
  v_claim jsonb;
  v_document public.finance_documents%rowtype;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_failure_code text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_document_id is null or p_request_id is null then
    raise exception 'DOCUMENT_UNAVAILABLE' using errcode = '22023';
  end if;

  if v_reason is null
     or char_length(v_reason) not between 1 and 500
     or v_reason ~ '[[:cntrl:]]'
     or v_reason ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|password|passcode|secret|token|api[_ -]?key|otp)' then
    raise exception 'INVALID_LIFECYCLE' using errcode = '22023';
  end if;

  select profile.id
  into v_profile_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.status = 'ACTIVE';

  if v_profile_id is null then
    raise exception 'PROFILE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization
      on organization.id = membership.organization_id
     and organization.status = 'ACTIVE'
    where membership.organization_id = p_organization_id
      and membership.profile_id = v_profile_id
      and membership.status = 'ACTIVE'
  ) then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not coalesce(
    public.has_org_permission(p_organization_id, 'finance.document.void'),
    false
  ) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  v_claim := public.internal_claim_receipt_action(
    p_organization_id,
    'RECEIPT_VOID',
    p_request_id,
    v_profile_id,
    p_document_id,
    null,
    null,
    v_reason
  );

  if v_claim ->> 'state' = 'SUCCEEDED' then
    return public.internal_receipt_action_response(
      p_organization_id,
      (v_claim ->> 'document_id')::uuid,
      true
    );
  end if;

  if v_claim ->> 'state' = 'FAILED' then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'error_code', v_claim ->> 'failure_code',
      'idempotency_reused', true
    );
  end if;

  begin
    select document.*
    into v_document
    from public.finance_documents document
    where document.organization_id = p_organization_id
      and document.id = p_document_id
    for update;

    if v_document.id is null then
      raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
    end if;

    select payment.*
    into v_payment
    from public.payments payment
    where payment.organization_id = p_organization_id
      and payment.id = v_document.payment_id
    for update;

    select order_row.*
    into v_order
    from public.orders order_row
    where order_row.organization_id = p_organization_id
      and order_row.id = v_document.order_id
    for update;

    if v_payment.id is null
       or v_order.id is null
       or v_payment.order_id <> v_order.id
       or v_order.customer_id <> v_document.customer_id then
      raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
    end if;

    if v_document.status <> 'ISSUED' then
      raise exception 'INVALID_LIFECYCLE' using errcode = 'P0001';
    end if;

    update public.finance_documents document
    set status = 'VOID',
        voided_at = statement_timestamp(),
        voided_by = v_profile_id,
        void_reason = v_reason
    where document.organization_id = p_organization_id
      and document.id = p_document_id
      and document.status = 'ISSUED';

    if not found then
      raise exception 'INVALID_LIFECYCLE' using errcode = 'P0001';
    end if;

    insert into public.audit_logs (
      organization_id,
      actor_profile_id,
      actor_type,
      entity_type,
      entity_id,
      action,
      before_json,
      after_json,
      reason,
      request_id
    ) values (
      p_organization_id,
      v_profile_id,
      'USER',
      'finance_document',
      p_document_id,
      'RECEIPT_VOIDED',
      pg_catalog.jsonb_build_object('status', 'ISSUED'),
      pg_catalog.jsonb_build_object('status', 'VOID'),
      v_reason,
      p_request_id
    );

    perform public.internal_complete_receipt_action(
      p_organization_id,
      'RECEIPT_VOID',
      p_request_id,
      p_document_id
    );
  exception
    when sqlstate 'P0001' then
      if sqlerrm in ('DOCUMENT_UNAVAILABLE', 'INVALID_LIFECYCLE') then
        v_failure_code := sqlerrm;
      else
        raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
      end if;
  end;

  if v_failure_code is not null then
    perform public.internal_fail_receipt_action(
      p_organization_id,
      'RECEIPT_VOID',
      p_request_id,
      v_failure_code
    );

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'error_code', v_failure_code,
      'idempotency_reused', false
    );
  end if;

  return public.internal_receipt_action_response(
    p_organization_id,
    p_document_id,
    false
  );
exception
  when sqlstate '42501' or sqlstate '22023' then
    raise;
  when others then
    raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

create function public.api_reverse_receipt_document(
  p_organization_id uuid,
  p_document_id uuid,
  p_reason text,
  p_request_id uuid,
  p_refund_id uuid default null,
  p_reversal_payment_transaction_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_reason text := pg_catalog.btrim(p_reason);
  v_claim jsonb;
  v_document public.finance_documents%rowtype;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_refund public.refunds%rowtype;
  v_reversal_transaction public.payment_transactions%rowtype;
  v_refund_success_count bigint;
  v_refund_success_amount numeric(14,2);
  v_failure_code text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_document_id is null or p_request_id is null then
    raise exception 'DOCUMENT_UNAVAILABLE' using errcode = '22023';
  end if;

  if v_reason is null
     or char_length(v_reason) not between 1 and 500
     or v_reason ~ '[[:cntrl:]]'
     or v_reason ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|password|passcode|secret|token|api[_ -]?key|otp)'
     or pg_catalog.num_nonnulls(p_refund_id, p_reversal_payment_transaction_id) <> 1 then
    raise exception 'REVERSAL_EVIDENCE_REQUIRED' using errcode = '22023';
  end if;

  select profile.id
  into v_profile_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.status = 'ACTIVE';

  if v_profile_id is null then
    raise exception 'PROFILE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization
      on organization.id = membership.organization_id
     and organization.status = 'ACTIVE'
    where membership.organization_id = p_organization_id
      and membership.profile_id = v_profile_id
      and membership.status = 'ACTIVE'
  ) then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not coalesce(
    public.has_org_permission(p_organization_id, 'finance.document.reverse'),
    false
  ) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  v_claim := public.internal_claim_receipt_action(
    p_organization_id,
    'RECEIPT_REVERSE',
    p_request_id,
    v_profile_id,
    p_document_id,
    p_refund_id,
    p_reversal_payment_transaction_id,
    v_reason
  );

  if v_claim ->> 'state' = 'SUCCEEDED' then
    return public.internal_receipt_action_response(
      p_organization_id,
      (v_claim ->> 'document_id')::uuid,
      true
    );
  end if;

  if v_claim ->> 'state' = 'FAILED' then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'error_code', v_claim ->> 'failure_code',
      'idempotency_reused', true
    );
  end if;

  begin
    select document.*
    into v_document
    from public.finance_documents document
    where document.organization_id = p_organization_id
      and document.id = p_document_id
    for update;

    if v_document.id is null then
      raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
    end if;

    select payment.*
    into v_payment
    from public.payments payment
    where payment.organization_id = p_organization_id
      and payment.id = v_document.payment_id
    for update;

    select order_row.*
    into v_order
    from public.orders order_row
    where order_row.organization_id = p_organization_id
      and order_row.id = v_document.order_id
    for update;

    if v_payment.id is null
       or v_order.id is null
       or v_payment.order_id <> v_order.id
       or v_order.customer_id <> v_document.customer_id then
      raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
    end if;

    if v_document.status <> 'ISSUED' then
      raise exception 'INVALID_LIFECYCLE' using errcode = 'P0001';
    end if;

    if p_refund_id is not null then
      select refund.*
      into v_refund
      from public.refunds refund
      where refund.organization_id = p_organization_id
        and refund.id = p_refund_id
      for update;

      perform 1
      from public.refund_transactions refund_transaction
      where refund_transaction.organization_id = p_organization_id
        and refund_transaction.refund_id = p_refund_id
      order by refund_transaction.id
      for update;

      select
        count(*) filter (where refund_transaction.status = 'SUCCEEDED'),
        coalesce(sum(refund_transaction.amount) filter (
          where refund_transaction.status = 'SUCCEEDED'
        ), 0)
      into v_refund_success_count, v_refund_success_amount
      from public.refund_transactions refund_transaction
      where refund_transaction.organization_id = p_organization_id
        and refund_transaction.refund_id = p_refund_id;

      if v_refund.id is null
         or v_refund.status <> 'COMPLETED'
         or v_refund.order_id <> v_document.order_id
         or v_refund.payment_transaction_id is distinct from v_document.payment_transaction_id
         or v_refund.amount <> v_document.amount_settled_snapshot
         or v_refund_success_count < 1
         or v_refund_success_amount <> v_refund.amount then
        raise exception 'REVERSAL_EVIDENCE_REQUIRED' using errcode = 'P0001';
      end if;
    else
      select transaction_row.*
      into v_reversal_transaction
      from public.payment_transactions transaction_row
      where transaction_row.organization_id = p_organization_id
        and transaction_row.id = p_reversal_payment_transaction_id
      for update;

      if v_reversal_transaction.id is null
         or v_reversal_transaction.payment_id <> v_document.payment_id
         or v_reversal_transaction.status <> 'REVERSED'
         or v_reversal_transaction.amount <> v_document.amount_settled_snapshot
         or v_reversal_transaction.currency_code <> v_document.currency_code then
        raise exception 'REVERSAL_EVIDENCE_REQUIRED' using errcode = 'P0001';
      end if;
    end if;

    update public.finance_documents document
    set status = 'REVERSED',
        reversed_at = statement_timestamp(),
        reversed_by = v_profile_id,
        reversal_reason = v_reason,
        reversal_refund_id = p_refund_id,
        reversal_payment_transaction_id = p_reversal_payment_transaction_id
    where document.organization_id = p_organization_id
      and document.id = p_document_id
      and document.status = 'ISSUED';

    if not found then
      raise exception 'INVALID_LIFECYCLE' using errcode = 'P0001';
    end if;

    insert into public.audit_logs (
      organization_id,
      actor_profile_id,
      actor_type,
      entity_type,
      entity_id,
      action,
      before_json,
      after_json,
      reason,
      request_id
    ) values (
      p_organization_id,
      v_profile_id,
      'USER',
      'finance_document',
      p_document_id,
      'RECEIPT_REVERSED',
      pg_catalog.jsonb_build_object('status', 'ISSUED'),
      pg_catalog.jsonb_build_object(
        'status', 'REVERSED',
        'evidence_type', case when p_refund_id is null then 'PAYMENT_TRANSACTION' else 'REFUND' end
      ),
      v_reason,
      p_request_id
    );

    perform public.internal_complete_receipt_action(
      p_organization_id,
      'RECEIPT_REVERSE',
      p_request_id,
      p_document_id
    );
  exception
    when sqlstate 'P0001' then
      if sqlerrm in (
        'DOCUMENT_UNAVAILABLE',
        'INVALID_LIFECYCLE',
        'REVERSAL_EVIDENCE_REQUIRED'
      ) then
        v_failure_code := sqlerrm;
      else
        raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
      end if;
  end;

  if v_failure_code is not null then
    perform public.internal_fail_receipt_action(
      p_organization_id,
      'RECEIPT_REVERSE',
      p_request_id,
      v_failure_code
    );

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'error_code', v_failure_code,
      'idempotency_reused', false
    );
  end if;

  return public.internal_receipt_action_response(
    p_organization_id,
    p_document_id,
    false
  );
exception
  when sqlstate '42501' or sqlstate '22023' then
    raise;
  when others then
    raise exception 'DOCUMENT_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

revoke execute on function public.internal_claim_receipt_action(
  uuid, text, uuid, uuid, uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;
revoke execute on function public.internal_complete_receipt_action(
  uuid, text, uuid, uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.internal_fail_receipt_action(
  uuid, text, uuid, text
) from public, anon, authenticated, service_role;
revoke execute on function public.internal_receipt_action_response(
  uuid, uuid, boolean
) from public, anon, authenticated, service_role;

revoke execute on function public.api_create_receipt_document(
  uuid, uuid, uuid, uuid
) from public, anon, service_role;
grant execute on function public.api_create_receipt_document(
  uuid, uuid, uuid, uuid
) to authenticated;

revoke execute on function public.api_void_receipt_document(
  uuid, uuid, text, uuid
) from public, anon, service_role;
grant execute on function public.api_void_receipt_document(
  uuid, uuid, text, uuid
) to authenticated;

revoke execute on function public.api_reverse_receipt_document(
  uuid, uuid, text, uuid, uuid, uuid
) from public, anon, service_role;
grant execute on function public.api_reverse_receipt_document(
  uuid, uuid, text, uuid, uuid, uuid
) to authenticated;

comment on function public.api_create_receipt_document(
  uuid, uuid, uuid, uuid
) is 'Guarded idempotent Receipt creation/replacement boundary derived from locked canonical payment and order sources.';

comment on function public.api_void_receipt_document(
  uuid, uuid, text, uuid
) is 'Guarded idempotent ISSUED-to-VOID Receipt lifecycle boundary for document errors.';

comment on function public.api_reverse_receipt_document(
  uuid, uuid, text, uuid, uuid, uuid
) is 'Guarded idempotent ISSUED-to-REVERSED Receipt lifecycle boundary requiring canonical completed evidence.';
