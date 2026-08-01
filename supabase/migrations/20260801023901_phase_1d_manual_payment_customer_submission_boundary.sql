-- Phase 1D Manual Payment Part 3A customer submission boundary.
-- Reference-only BANK_TRANSFER claims; no provider, Storage, verification,
-- settlement, UI activation or Production apply.

set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
declare
  v_missing text;
begin
  select string_agg(required_object, ', ' order by required_object)
  into v_missing
  from unnest(array[
    'public.organizations',
    'public.profiles',
    'public.organization_memberships',
    'public.customer_profile_links',
    'public.customers',
    'public.organization_storefronts',
    'public.organization_checkout_settings',
    'public.features',
    'public.organization_entitlements',
    'public.orders',
    'public.payments',
    'public.payment_transactions',
    'public.payment_proofs',
    'public.commerce_idempotency_keys',
    'public.audit_logs'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Manual payment submission missing dependencies: %', v_missing;
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'Manual payment submission missing extensions.digest(bytea,text)';
  end if;

  if to_regprocedure(
    'public.internal_storefront_payment_proof_response(uuid,uuid,boolean)'
  ) is not null
     or to_regprocedure(
       'public.api_submit_storefront_payment_proof(uuid,uuid,text,uuid)'
     ) is not null then
    raise exception 'Manual payment submission target already exists';
  end if;
end;
$$;

create function public.internal_storefront_payment_proof_response(
  p_organization_id uuid,
  p_payment_transaction_id uuid,
  p_idempotency_reused boolean
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_payment_id uuid;
  v_proof_id uuid;
  v_payment_due_at timestamptz;
begin
  select o.id, p.id, pp.id, o.payment_due_at
  into v_order_id, v_payment_id, v_proof_id, v_payment_due_at
  from public.payment_transactions pt
  join public.payments p
    on p.organization_id = pt.organization_id
   and p.id = pt.payment_id
  join public.orders o
    on o.organization_id = p.organization_id
   and o.id = p.order_id
  join public.payment_proofs pp
    on pp.organization_id = pt.organization_id
   and pp.payment_transaction_id = pt.id
  where pt.organization_id = p_organization_id
    and pt.id = p_payment_transaction_id
    and pt.transaction_type = 'PAYMENT'
    and pt.payment_method = 'BANK_TRANSFER'
    and pp.storage_path is null
    and pp.metadata_json = jsonb_build_object(
      'schema_version', 1,
      'evidence_type', 'REFERENCE_ONLY'
    );

  if v_proof_id is null then
    raise exception 'PAYMENT_SUBMISSION_FAILED' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'operation', 'PAYMENT_PROOF_SUBMIT',
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'payment_transaction_id', p_payment_transaction_id,
    'payment_proof_id', v_proof_id,
    'transaction_status', 'PENDING',
    'proof_status', 'PENDING',
    'evidence_type', 'REFERENCE_ONLY',
    'payment_due_at', v_payment_due_at,
    'idempotency_reused', p_idempotency_reused
  );
end;
$$;

create function public.api_submit_storefront_payment_proof(
  p_organization_id uuid,
  p_order_id uuid,
  p_payment_reference text,
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
  v_membership_id uuid;
  v_customer_id uuid;
  v_normalized_reference text;
  v_request_hash bytea;
  v_idempotency public.commerce_idempotency_keys%rowtype;
  v_inserted_count bigint := 0;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_existing_transaction public.payment_transactions%rowtype;
  v_transaction_id uuid;
  v_proof_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_order_id is null or p_request_id is null then
    raise exception 'PAYMENT_SUBMISSION_FAILED' using errcode = '22023';
  end if;

  v_normalized_reference := upper(btrim(p_payment_reference));
  if v_normalized_reference is null
     or char_length(v_normalized_reference) not between 6 and 100
     or v_normalized_reference !~ '^[A-Z0-9._/-]+$' then
    raise exception 'PAYMENT_REFERENCE_INVALID' using errcode = '22023';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'ACTIVE'
  for share;

  if v_profile_id is null then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  select om.id
  into v_membership_id
  from public.organization_memberships om
  where om.organization_id = p_organization_id
    and om.profile_id = v_profile_id
    and om.status = 'ACTIVE'
  for share;

  if v_membership_id is null then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  select cpl.customer_id
  into v_customer_id
  from public.customer_profile_links cpl
  join public.customers c
    on c.organization_id = cpl.organization_id
   and c.id = cpl.customer_id
   and c.status = 'ACTIVE'
  where cpl.organization_id = p_organization_id
    and cpl.profile_id = v_profile_id
    and cpl.link_status = 'ACTIVE'
  for share of cpl, c;

  if v_customer_id is null then
    raise exception 'CUSTOMER_LINK_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations o
    join public.organization_storefronts storefront
      on storefront.organization_id = o.id
     and storefront.publication_status = 'PUBLISHED'
    join public.organization_checkout_settings settings
      on settings.organization_id = o.id
     and settings.status = 'ACTIVE'
     and settings.currency_code = 'THB'
    where o.id = p_organization_id
      and o.status = 'ACTIVE'
      and o.currency_code = 'THB'
      and exists (
        select 1
        from public.organization_entitlements oe
        join public.features f on f.id = oe.feature_id
        where oe.organization_id = o.id
          and f.code = 'storefront.checkout'
          and f.feature_type = 'BOOLEAN'
          and f.status = 'ACTIVE'
          and oe.enabled
          and (oe.valid_from is null or oe.valid_from <= statement_timestamp())
          and (oe.valid_until is null or oe.valid_until > statement_timestamp())
      )
  ) then
    raise exception 'CHECKOUT_NOT_ENABLED' using errcode = '42501';
  end if;

  v_request_hash := extensions.digest(
    convert_to(
      concat_ws(
        '|',
        'v1',
        'PAYMENT_PROOF_SUBMIT',
        p_organization_id::text,
        v_customer_id::text,
        p_order_id::text,
        'BANK_TRANSFER',
        v_normalized_reference
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
    customer_id,
    request_hash,
    expires_at
  ) values (
    p_organization_id,
    'PAYMENT_PROOF_SUBMIT',
    p_request_id,
    v_profile_id,
    v_customer_id,
    v_request_hash,
    statement_timestamp() + interval '30 days'
  )
  on conflict (organization_id, operation, request_id) do nothing;
  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    select k.*
    into v_idempotency
    from public.commerce_idempotency_keys k
    where k.organization_id = p_organization_id
      and k.operation = 'PAYMENT_PROOF_SUBMIT'
      and k.request_id = p_request_id
    for update;

    if v_idempotency.request_hash is distinct from v_request_hash
       or v_idempotency.actor_profile_id is distinct from v_profile_id
       or v_idempotency.customer_id is distinct from v_customer_id
       or v_idempotency.state <> 'SUCCEEDED'
       or v_idempotency.result_entity_type <> 'payment_transaction'
       or v_idempotency.result_entity_id is null then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;

    return public.internal_storefront_payment_proof_response(
      p_organization_id,
      v_idempotency.result_entity_id,
      true
    );
  end if;

  select o.*
  into v_order
  from public.orders o
  where o.organization_id = p_organization_id
    and o.id = p_order_id
    and o.customer_id = v_customer_id
    and o.source = 'STOREFRONT'
  for update;

  if v_order.id is null
     or v_order.order_status <> 'PENDING_CONFIRMATION'
     or v_order.payment_status <> 'UNPAID'
     or v_order.fulfillment_status <> 'UNFULFILLED'
     or v_order.payment_due_at is null then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = 'P0001';
  end if;

  if statement_timestamp() >= v_order.payment_due_at then
    raise exception 'PAYMENT_EXPIRED' using errcode = 'P0001';
  end if;

  select p.*
  into v_payment
  from public.payments p
  where p.organization_id = p_organization_id
    and p.order_id = p_order_id
  for update;

  if v_payment.id is null
     or v_payment.status <> 'UNPAID'
     or v_payment.currency_code <> 'THB'
     or v_order.currency_code <> 'THB'
     or v_payment.amount_expected <= 0
     or v_payment.amount_expected <> v_order.grand_total
     or v_payment.amount_expected <> v_order.amount_due
     or v_payment.amount_received <> 0
     or v_order.amount_paid <> 0 then
    raise exception 'PAYMENT_STATE_INCONSISTENT' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_organization_id::text || ':PAYMENT_REFERENCE:' || v_normalized_reference,
      0
    )
  );

  select pt.*
  into v_existing_transaction
  from public.payment_transactions pt
  where pt.organization_id = p_organization_id
    and pt.payment_method = 'BANK_TRANSFER'
    and upper(btrim(pt.external_reference)) = v_normalized_reference
    and pt.status in ('PENDING', 'SUCCEEDED')
  for update;

  if v_existing_transaction.id is not null then
    if v_existing_transaction.payment_id <> v_payment.id then
      raise exception 'PAYMENT_REFERENCE_CONFLICT' using errcode = 'P0001';
    end if;

    update public.commerce_idempotency_keys k
    set state = 'SUCCEEDED',
        result_entity_type = 'payment_transaction',
        result_entity_id = v_existing_transaction.id,
        completed_at = statement_timestamp()
    where k.organization_id = p_organization_id
      and k.operation = 'PAYMENT_PROOF_SUBMIT'
      and k.request_id = p_request_id
      and k.state = 'IN_PROGRESS';

    if not found then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;

    return public.internal_storefront_payment_proof_response(
      p_organization_id,
      v_existing_transaction.id,
      true
    );
  end if;

  if exists (
    select 1
    from public.payment_transactions pt
    where pt.organization_id = p_organization_id
      and pt.payment_id = v_payment.id
      and pt.transaction_type = 'PAYMENT'
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status = 'PENDING'
  ) then
    raise exception 'PAYMENT_ATTEMPT_PENDING' using errcode = 'P0001';
  end if;

  insert into public.payment_transactions (
    organization_id,
    payment_id,
    transaction_type,
    payment_method,
    amount,
    currency_code,
    external_reference,
    status,
    created_by
  ) values (
    p_organization_id,
    v_payment.id,
    'PAYMENT',
    'BANK_TRANSFER',
    v_payment.amount_expected,
    'THB',
    v_normalized_reference,
    'PENDING',
    v_profile_id
  )
  returning id into v_transaction_id;

  insert into public.payment_proofs (
    organization_id,
    payment_transaction_id,
    storage_path,
    mime_type,
    submitted_by_type,
    verification_status,
    metadata_json
  ) values (
    p_organization_id,
    v_transaction_id,
    null,
    null,
    'CUSTOMER',
    'PENDING',
    jsonb_build_object(
      'schema_version', 1,
      'evidence_type', 'REFERENCE_ONLY'
    )
  )
  returning id into v_proof_id;

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
    'payment_transaction',
    v_transaction_id,
    'PAYMENT_PROOF_SUBMITTED',
    null,
    jsonb_build_object(
      'payment_transaction_id', v_transaction_id,
      'payment_proof_id', v_proof_id,
      'transaction_status', 'PENDING',
      'proof_status', 'PENDING',
      'evidence_type', 'REFERENCE_ONLY'
    ),
    p_request_id
  );

  update public.commerce_idempotency_keys k
  set state = 'SUCCEEDED',
      result_entity_type = 'payment_transaction',
      result_entity_id = v_transaction_id,
      completed_at = statement_timestamp()
  where k.organization_id = p_organization_id
    and k.operation = 'PAYMENT_PROOF_SUBMIT'
    and k.request_id = p_request_id
    and k.state = 'IN_PROGRESS';

  if not found then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;

  return public.internal_storefront_payment_proof_response(
    p_organization_id,
    v_transaction_id,
    false
  );
exception
  when others then
    if sqlerrm in (
      'AUTH_REQUIRED',
      'MEMBERSHIP_REQUIRED',
      'CUSTOMER_LINK_REQUIRED',
      'CHECKOUT_NOT_ENABLED',
      'ORDER_NOT_PAYABLE',
      'PAYMENT_EXPIRED',
      'PAYMENT_REFERENCE_INVALID',
      'PAYMENT_REFERENCE_CONFLICT',
      'PAYMENT_ATTEMPT_PENDING',
      'PAYMENT_STATE_INCONSISTENT',
      'IDEMPOTENCY_CONFLICT',
      'PAYMENT_SUBMISSION_FAILED'
    ) then
      raise;
    end if;
    raise exception 'PAYMENT_SUBMISSION_FAILED' using errcode = 'P0001';
end;
$$;

revoke all on function public.internal_storefront_payment_proof_response(
  uuid,
  uuid,
  boolean
) from public, anon, authenticated, service_role;

revoke all on function public.api_submit_storefront_payment_proof(
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.api_submit_storefront_payment_proof(
  uuid,
  uuid,
  text,
  uuid
) to authenticated;

comment on function public.api_submit_storefront_payment_proof(
  uuid,
  uuid,
  text,
  uuid
) is
  'PS01-PS24 authenticated reference-only BANK_TRANSFER proof submission boundary.';
