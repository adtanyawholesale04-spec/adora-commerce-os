-- ADORA Commerce OS (ACOS)
-- Phase 1D Manual Payment Part 4E: guarded staff review and atomic settlement.

do $$
declare
  v_missing text;
  v_blockers bigint;
begin
  select string_agg(required_object, ', ' order by required_object)
  into v_missing
  from unnest(array[
    'public.organizations',
    'public.profiles',
    'public.organization_memberships',
    'public.roles',
    'public.membership_roles',
    'public.permissions',
    'public.role_permissions',
    'public.organization_entitlements',
    'public.features',
    'public.organization_checkout_settings',
    'public.orders',
    'public.order_items',
    'public.order_status_history',
    'public.payments',
    'public.payment_transactions',
    'public.payment_proofs',
    'public.inventory_reservations',
    'public.inventory_allocations',
    'public.inventory_balances',
    'public.inventory_movements',
    'public.coupon_redemptions',
    'public.commerce_idempotency_keys',
    'public.audit_logs',
    'public.carts',
    'public.cart_events',
    'public.attribution_events'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Staff Review action preflight failed: missing %', v_missing;
  end if;

  if to_regprocedure('public.has_org_permission(uuid,text)') is null
     or to_regprocedure(
       'public.api_record_attribution_event(uuid,text,uuid,uuid,text,uuid,uuid,uuid,uuid,uuid,numeric,text,timestamptz,jsonb)'
     ) is null then
    raise exception 'Staff Review action preflight failed: guarded dependency missing';
  end if;

  if to_regprocedure(
       'public.api_verify_storefront_payment(uuid,uuid,text,text,uuid)'
     ) is not null
     or to_regprocedure(
       'public.api_reject_storefront_payment(uuid,uuid,text,text,uuid)'
     ) is not null
     or to_regprocedure(
       'public.api_record_storefront_payment_failed_event(uuid,uuid,uuid)'
     ) is not null then
    raise exception 'Staff Review action preflight failed: target boundary exists';
  end if;

  select count(*)
  into v_blockers
  from public.organization_checkout_settings settings
  where settings.status = 'ACTIVE'
    and settings.payment_due_minutes > settings.reservation_minutes;

  if v_blockers <> 0 then
    raise exception 'Staff Review action preflight failed: invalid settings count %', v_blockers;
  end if;

  select count(*)
  into v_blockers
  from public.payment_transactions transaction_row
  join public.payments payment
    on payment.organization_id = transaction_row.organization_id
   and payment.id = transaction_row.payment_id
  join public.orders order_row
    on order_row.organization_id = payment.organization_id
   and order_row.id = payment.order_id
  where transaction_row.status = 'PENDING'
    and transaction_row.transaction_type = 'PAYMENT'
    and transaction_row.payment_method = 'BANK_TRANSFER'
    and order_row.source = 'STOREFRONT'
    and (
      payment.status <> 'UNPAID'
      or order_row.order_status <> 'PENDING_CONFIRMATION'
      or order_row.payment_status <> 'UNPAID'
      or order_row.fulfillment_status <> 'UNFULFILLED'
      or order_row.payment_due_at is null
      or not exists (
        select 1
        from public.payment_proofs proof
        where proof.organization_id = transaction_row.organization_id
          and proof.payment_transaction_id = transaction_row.id
          and proof.verification_status = 'PENDING'
      )
      or not exists (
        select 1
        from public.inventory_reservations reservation
        where reservation.organization_id = order_row.organization_id
          and reservation.order_id = order_row.id
          and reservation.status = 'ACTIVE'
          and reservation.expires_at >= order_row.payment_due_at
      )
    );

  if v_blockers <> 0 then
    raise exception 'Staff Review action preflight failed: inconsistent candidate count %', v_blockers;
  end if;

  select count(*)
  into v_blockers
  from public.orders order_row
  join public.payments payment
    on payment.organization_id = order_row.organization_id
   and payment.order_id = order_row.id
  where order_row.source = 'STOREFRONT'
    and order_row.payment_status = 'UNPAID'
    and exists (
      select 1
      from public.payment_transactions transaction_row
      where transaction_row.organization_id = payment.organization_id
        and transaction_row.payment_id = payment.id
        and transaction_row.status = 'SUCCEEDED'
    );

  if v_blockers <> 0 then
    raise exception 'Staff Review action preflight failed: unpaid success count %', v_blockers;
  end if;

  if not exists (
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
    group by namespace.nspname
    having count(*) = 5
  )
     or not has_table_privilege('authenticated', 'public.payments', 'UPDATE')
     or not has_table_privilege('authenticated', 'public.payment_transactions', 'INSERT,UPDATE')
     or not has_table_privilege('authenticated', 'public.payment_proofs', 'INSERT,UPDATE') then
    raise exception 'Staff Review action preflight failed: legacy write posture differs';
  end if;
end;
$$;

create function public.internal_claim_storefront_payment_review(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_reviewer_profile_id uuid,
  p_payment_transaction_id uuid,
  p_expected_status text,
  p_reason text
)
returns boolean
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
  if p_operation not in ('PAYMENT_VERIFY', 'PAYMENT_REJECT')
     or p_request_id is null
     or p_reviewer_profile_id is null
     or p_payment_transaction_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  v_request_hash := extensions.digest(
    convert_to(
      concat_ws(
        '|', 'v1', p_operation, p_organization_id, p_reviewer_profile_id,
        p_payment_transaction_id, p_expected_status, p_reason
      ),
      'UTF8'
    ),
    'sha256'
  );

  insert into public.commerce_idempotency_keys (
    organization_id, operation, request_id, actor_profile_id, request_hash,
    state, started_at
  ) values (
    p_organization_id, p_operation, p_request_id, p_reviewer_profile_id,
    v_request_hash, 'IN_PROGRESS', statement_timestamp()
  )
  on conflict (organization_id, operation, request_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return false;
  end if;

  select key_row.*
  into v_existing
  from public.commerce_idempotency_keys key_row
  where key_row.organization_id = p_organization_id
    and key_row.operation = p_operation
    and key_row.request_id = p_request_id
  for update;

  if v_existing.request_hash is distinct from v_request_hash
     or v_existing.actor_profile_id is distinct from p_reviewer_profile_id then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  if v_existing.state = 'SUCCEEDED'
     and v_existing.result_entity_type = 'payment_transaction'
     and v_existing.result_entity_id = p_payment_transaction_id then
    return true;
  end if;

  raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
end;
$$;

create function public.internal_complete_storefront_payment_review(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_payment_transaction_id uuid
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
      result_entity_type = 'payment_transaction',
      result_entity_id = p_payment_transaction_id,
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

create function public.internal_storefront_payment_review_response(
  p_organization_id uuid,
  p_payment_transaction_id uuid,
  p_operation text,
  p_idempotency_reused boolean
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'operation', p_operation,
    'order_id', order_row.id,
    'payment_id', payment.id,
    'payment_transaction_id', transaction_row.id,
    'payment_proof_id', proof.id,
    'transaction_status', transaction_row.status,
    'proof_status', proof.verification_status,
    'order_status', order_row.order_status,
    'order_payment_status', order_row.payment_status,
    'payment_status', payment.status,
    'reviewed_at', proof.verified_at,
    'allocation_count', (
      select count(*)
      from public.inventory_allocations allocation
      where allocation.organization_id = order_row.organization_id
        and allocation.order_id = order_row.id
        and allocation.source_reservation_id is not null
    ),
    'coupon_consumed', exists (
      select 1
      from public.coupon_redemptions redemption
      where redemption.organization_id = order_row.organization_id
        and redemption.order_id = order_row.id
        and redemption.status = 'CONSUMED'
    ),
    'idempotency_reused', p_idempotency_reused
  )
  from public.payment_transactions transaction_row
  join public.payments payment
    on payment.organization_id = transaction_row.organization_id
   and payment.id = transaction_row.payment_id
  join public.orders order_row
    on order_row.organization_id = payment.organization_id
   and order_row.id = payment.order_id
  join public.payment_proofs proof
    on proof.organization_id = transaction_row.organization_id
   and proof.payment_transaction_id = transaction_row.id
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = p_payment_transaction_id
  order by proof.submitted_at desc, proof.id desc
  limit 1;
$$;

create function public.internal_settle_storefront_payment(
  p_organization_id uuid,
  p_payment_transaction_id uuid,
  p_reviewer_profile_id uuid,
  p_reason text,
  p_request_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_payment_id uuid;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_transaction public.payment_transactions%rowtype;
  v_proof public.payment_proofs%rowtype;
  v_now timestamptz;
  v_received numeric(14,2);
  v_reservation_count bigint;
  v_coupon_count bigint;
begin
  select transaction_row.payment_id
  into v_payment_id
  from public.payment_transactions transaction_row
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = p_payment_transaction_id;

  select payment.order_id
  into v_order_id
  from public.payments payment
  where payment.organization_id = p_organization_id
    and payment.id = v_payment_id;

  select order_row.*
  into v_order
  from public.orders order_row
  where order_row.organization_id = p_organization_id
    and order_row.id = v_order_id
  for update;

  if v_order.id is null then
    raise exception 'PAYMENT_REVIEW_NOT_FOUND' using errcode = 'P0001';
  end if;

  select payment.*
  into v_payment
  from public.payments payment
  where payment.organization_id = p_organization_id
    and payment.id = v_payment_id
    and payment.order_id = v_order.id
  for update;

  select transaction_row.*
  into v_transaction
  from public.payment_transactions transaction_row
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = p_payment_transaction_id
    and transaction_row.payment_id = v_payment.id
  for update;

  select proof.*
  into v_proof
  from public.payment_proofs proof
  where proof.organization_id = p_organization_id
    and proof.payment_transaction_id = v_transaction.id
  order by proof.submitted_at desc, proof.id desc
  limit 1
  for update;

  perform redemption.id
  from public.coupon_redemptions redemption
  where redemption.organization_id = p_organization_id
    and redemption.order_id = v_order.id
  order by redemption.id
  for update;

  perform reservation.id
  from public.inventory_reservations reservation
  where reservation.organization_id = p_organization_id
    and reservation.order_id = v_order.id
    and reservation.status = 'ACTIVE'
  order by reservation.id
  for update;

  perform balance.id
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and exists (
      select 1
      from public.inventory_reservations reservation
      where reservation.organization_id = balance.organization_id
        and reservation.order_id = v_order.id
        and reservation.status = 'ACTIVE'
        and reservation.warehouse_id = balance.warehouse_id
        and reservation.variant_id = balance.variant_id
    )
  order by balance.variant_id, balance.warehouse_id, balance.id
  for update;

  perform allocation.id
  from public.inventory_allocations allocation
  where allocation.organization_id = p_organization_id
    and allocation.source_reservation_id in (
      select reservation.id
      from public.inventory_reservations reservation
      where reservation.organization_id = p_organization_id
        and reservation.order_id = v_order.id
        and reservation.status = 'ACTIVE'
    )
  order by allocation.source_reservation_id, allocation.id
  for update;

  v_now := statement_timestamp();

  if v_transaction.id is null or v_proof.id is null then
    raise exception 'PAYMENT_REVIEW_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_transaction.created_by = p_reviewer_profile_id then
    raise exception 'PAYMENT_REVIEW_SELF_ACTION_DENIED' using errcode = '42501';
  end if;

  if v_transaction.status <> 'PENDING'
     or v_proof.verification_status <> 'PENDING' then
    raise exception 'PAYMENT_ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  if v_order.order_status <> 'PENDING_CONFIRMATION'
     or v_order.payment_status <> 'UNPAID'
     or v_order.fulfillment_status <> 'UNFULFILLED'
     or v_payment.status <> 'UNPAID' then
    raise exception 'PAYMENT_STATE_CONFLICT' using errcode = 'P0001';
  end if;

  if v_order.payment_due_at is null or v_now >= v_order.payment_due_at then
    raise exception 'PAYMENT_EXPIRED' using errcode = 'P0001';
  end if;

  if v_transaction.transaction_type <> 'PAYMENT'
     or v_transaction.payment_method <> 'BANK_TRANSFER'
     or v_transaction.amount <= 0
     or v_transaction.currency_code <> 'THB'
     or v_payment.currency_code <> 'THB'
     or v_order.currency_code <> 'THB'
     or v_transaction.amount <> v_payment.amount_expected
     or v_transaction.amount <> v_order.grand_total
     or v_transaction.amount <> v_order.amount_due
     or v_payment.amount_received <> 0
     or v_order.amount_paid <> 0 then
    raise exception 'PAYMENT_AMOUNT_INCONSISTENT' using errcode = 'P0001';
  end if;

  if nullif(btrim(v_transaction.external_reference), '') is not null
     and position(
       lower(btrim(v_transaction.external_reference)) in lower(p_reason)
     ) > 0 then
    raise exception 'PAYMENT_REASON_INVALID' using errcode = '22023';
  end if;

  select count(*)
  into v_reservation_count
  from public.inventory_reservations reservation
  where reservation.organization_id = p_organization_id
    and reservation.order_id = v_order.id
    and reservation.status = 'ACTIVE';

  if v_reservation_count = 0
     or (select count(distinct reservation.expires_at)
         from public.inventory_reservations reservation
         where reservation.organization_id = p_organization_id
           and reservation.order_id = v_order.id
           and reservation.status = 'ACTIVE') <> 1
     or exists (
       select 1
       from public.inventory_reservations reservation
       where reservation.organization_id = p_organization_id
         and reservation.order_id = v_order.id
         and reservation.status = 'ACTIVE'
         and (reservation.expires_at is null
              or reservation.expires_at < v_order.payment_due_at)
     ) then
    raise exception 'PAYMENT_HOLD_INCONSISTENT' using errcode = 'P0001';
  end if;

  if exists (
       select 1
       from public.inventory_reservations reservation
       where reservation.organization_id = p_organization_id
         and reservation.order_id = v_order.id
         and reservation.status = 'ACTIVE'
         and (
           reservation.quantity <= 0
           or reservation.order_item_id is null
           or not exists (
             select 1
             from public.order_items item
             where item.organization_id = reservation.organization_id
               and item.order_id = reservation.order_id
               and item.id = reservation.order_item_id
               and item.variant_id = reservation.variant_id
           )
         )
     )
     or exists (
       select 1
       from public.order_items item
       where item.organization_id = p_organization_id
         and item.order_id = v_order.id
         and item.variant_id is not null
         and item.quantity <> coalesce((
           select sum(reservation.quantity)
           from public.inventory_reservations reservation
           where reservation.organization_id = item.organization_id
             and reservation.order_id = item.order_id
             and reservation.order_item_id = item.id
             and reservation.variant_id = item.variant_id
             and reservation.status = 'ACTIVE'
         ), 0)
     )
     or exists (
       select 1
       from (
         select reservation.organization_id, reservation.warehouse_id,
                reservation.variant_id, sum(reservation.quantity) as required_quantity
         from public.inventory_reservations reservation
         where reservation.organization_id = p_organization_id
           and reservation.order_id = v_order.id
           and reservation.status = 'ACTIVE'
         group by reservation.organization_id, reservation.warehouse_id,
                  reservation.variant_id
       ) required
       left join public.inventory_balances balance
         on balance.organization_id = required.organization_id
        and balance.warehouse_id = required.warehouse_id
        and balance.variant_id = required.variant_id
       where balance.id is null or balance.reserved < required.required_quantity
     )
     or exists (
       select 1
       from public.inventory_allocations allocation
       join public.inventory_reservations reservation
         on reservation.organization_id = allocation.organization_id
        and reservation.id = allocation.source_reservation_id
       where reservation.organization_id = p_organization_id
         and reservation.order_id = v_order.id
         and reservation.status = 'ACTIVE'
     ) then
    raise exception 'PAYMENT_ALLOCATION_INCONSISTENT' using errcode = 'P0001';
  end if;

  select count(*)
  into v_coupon_count
  from public.coupon_redemptions redemption
  where redemption.organization_id = p_organization_id
    and redemption.order_id = v_order.id;

  if v_coupon_count > 1
     or (v_coupon_count = 1 and not exists (
       select 1
       from public.coupon_redemptions redemption
       where redemption.organization_id = p_organization_id
         and redemption.order_id = v_order.id
         and redemption.status = 'RESERVED'
     )) then
    raise exception 'PAYMENT_COUPON_INCONSISTENT' using errcode = 'P0001';
  end if;

  update public.payment_transactions transaction_row
  set status = 'SUCCEEDED', paid_at = v_now
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = v_transaction.id
    and transaction_row.status = 'PENDING';

  update public.payment_proofs proof
  set verification_status = 'VERIFIED',
      verified_by = p_reviewer_profile_id,
      verified_at = v_now
  where proof.organization_id = p_organization_id
    and proof.id = v_proof.id
    and proof.verification_status = 'PENDING';

  select coalesce(sum(transaction_row.amount), 0)
  into v_received
  from public.payment_transactions transaction_row
  where transaction_row.organization_id = p_organization_id
    and transaction_row.payment_id = v_payment.id
    and transaction_row.status = 'SUCCEEDED';

  if v_received <> v_payment.amount_expected then
    raise exception 'PAYMENT_AMOUNT_INCONSISTENT' using errcode = 'P0001';
  end if;

  insert into public.inventory_allocations (
    organization_id, warehouse_id, variant_id, order_id, order_item_id,
    quantity, status, allocated_at, source_reservation_id
  )
  select reservation.organization_id, reservation.warehouse_id,
         reservation.variant_id, reservation.order_id,
         reservation.order_item_id, reservation.quantity, 'ACTIVE', v_now,
         reservation.id
  from public.inventory_reservations reservation
  where reservation.organization_id = p_organization_id
    and reservation.order_id = v_order.id
    and reservation.status = 'ACTIVE'
  order by reservation.id;

  with converted as (
    select reservation.organization_id, reservation.warehouse_id,
           reservation.variant_id, sum(reservation.quantity) as quantity
    from public.inventory_reservations reservation
    where reservation.organization_id = p_organization_id
      and reservation.order_id = v_order.id
      and reservation.status = 'ACTIVE'
    group by reservation.organization_id, reservation.warehouse_id,
             reservation.variant_id
  )
  update public.inventory_balances balance
  set reserved = balance.reserved - converted.quantity,
      allocated = balance.allocated + converted.quantity,
      updated_at = v_now
  from converted
  where balance.organization_id = converted.organization_id
    and balance.warehouse_id = converted.warehouse_id
    and balance.variant_id = converted.variant_id;

  update public.inventory_reservations reservation
  set status = 'CONVERTED', released_at = v_now
  where reservation.organization_id = p_organization_id
    and reservation.order_id = v_order.id
    and reservation.status = 'ACTIVE';

  update public.coupon_redemptions redemption
  set status = 'CONSUMED', consumed_at = v_now
  where redemption.organization_id = p_organization_id
    and redemption.order_id = v_order.id
    and redemption.status = 'RESERVED';

  update public.payments payment
  set status = 'PAID', amount_received = v_received, updated_at = v_now
  where payment.organization_id = p_organization_id
    and payment.id = v_payment.id
    and payment.status = 'UNPAID';

  update public.orders order_row
  set order_status = 'CONFIRMED',
      payment_status = 'PAID',
      amount_paid = order_row.grand_total,
      amount_due = 0,
      confirmed_at = v_now,
      updated_at = v_now
  where order_row.organization_id = p_organization_id
    and order_row.id = v_order.id
    and order_row.order_status = 'PENDING_CONFIRMATION'
    and order_row.payment_status = 'UNPAID';

  insert into public.order_status_history (
    organization_id, order_id, status_domain, from_status, to_status,
    changed_by, reason
  ) values
    (p_organization_id, v_order.id, 'PAYMENT', 'UNPAID', 'PAID',
     p_reviewer_profile_id, p_reason),
    (p_organization_id, v_order.id, 'ORDER', 'PENDING_CONFIRMATION',
     'CONFIRMED', p_reviewer_profile_id, p_reason);

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, p_reviewer_profile_id, 'USER',
    'payment_transaction', v_transaction.id, 'PAYMENT_VERIFIED',
    jsonb_build_object(
      'transaction_status', 'PENDING',
      'proof_status', 'PENDING',
      'payment_status', 'UNPAID',
      'order_status', 'PENDING_CONFIRMATION'
    ),
    jsonb_build_object(
      'transaction_status', 'SUCCEEDED',
      'proof_status', 'VERIFIED',
      'payment_status', 'PAID',
      'order_status', 'CONFIRMED',
      'allocation_count', v_reservation_count,
      'coupon_consumed', v_coupon_count = 1
    ),
    p_reason, p_request_id
  );
end;
$$;

create function public.api_verify_storefront_payment(
  p_organization_id uuid,
  p_payment_transaction_id uuid,
  p_expected_status text,
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
  v_reason text := btrim(p_reason);
  v_reused boolean;
  v_entitled boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_payment_transaction_id is null
     or p_request_id is null or p_expected_status <> 'PENDING' then
    raise exception 'PAYMENT_STATE_CONFLICT' using errcode = '22023';
  end if;

  if v_reason is null or char_length(v_reason) not between 8 and 500
     or v_reason ~ '[[:cntrl:]]'
     or v_reason ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|[0-9]{8,}|password|passcode|secret|token|api[_ -]?key|otp)' then
    raise exception 'PAYMENT_REASON_INVALID' using errcode = '22023';
  end if;

  select profile.id
  into v_profile_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.status = 'ACTIVE';

  if v_profile_id is null or not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.profile_id = v_profile_id
      and membership.status = 'ACTIVE'
  ) then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'payment.verify') then
    raise exception 'PAYMENT_VERIFY_PERMISSION_REQUIRED' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.organizations organization
    join public.organization_entitlements entitlement
      on entitlement.organization_id = organization.id
     and entitlement.enabled
     and (entitlement.valid_from is null or entitlement.valid_from <= statement_timestamp())
     and (entitlement.valid_until is null or entitlement.valid_until > statement_timestamp())
    join public.features feature
      on feature.id = entitlement.feature_id
     and feature.code = 'storefront.checkout'
     and feature.feature_type = 'BOOLEAN'
     and feature.status = 'ACTIVE'
    where organization.id = p_organization_id
      and organization.status = 'ACTIVE'
      and organization.currency_code = 'THB'
  ) into v_entitled;

  if not v_entitled then
    raise exception 'CHECKOUT_NOT_ENABLED' using errcode = '42501';
  end if;

  v_reused := public.internal_claim_storefront_payment_review(
    p_organization_id, 'PAYMENT_VERIFY', p_request_id, v_profile_id,
    p_payment_transaction_id, p_expected_status, v_reason
  );

  if v_reused then
    return public.internal_storefront_payment_review_response(
      p_organization_id, p_payment_transaction_id, 'PAYMENT_VERIFY', true
    );
  end if;

  begin
    perform public.internal_settle_storefront_payment(
      p_organization_id, p_payment_transaction_id, v_profile_id, v_reason,
      p_request_id
    );
  exception
    when sqlstate '42501' or sqlstate '22023' then
      raise;
    when sqlstate 'P0001' then
      if sqlerrm in (
        'PAYMENT_REVIEW_NOT_FOUND', 'PAYMENT_REVIEW_SELF_ACTION_DENIED',
        'PAYMENT_STATE_CONFLICT', 'PAYMENT_ALREADY_REVIEWED',
        'PAYMENT_EXPIRED', 'PAYMENT_HOLD_INCONSISTENT',
        'PAYMENT_AMOUNT_INCONSISTENT', 'PAYMENT_ALLOCATION_INCONSISTENT',
        'PAYMENT_COUPON_INCONSISTENT', 'IDEMPOTENCY_CONFLICT'
      ) then
        raise;
      end if;
      raise exception 'PAYMENT_SETTLEMENT_FAILED' using errcode = 'P0001';
    when others then
      raise exception 'PAYMENT_SETTLEMENT_FAILED' using errcode = 'P0001';
  end;

  perform public.internal_complete_storefront_payment_review(
    p_organization_id, 'PAYMENT_VERIFY', p_request_id,
    p_payment_transaction_id
  );

  return public.internal_storefront_payment_review_response(
    p_organization_id, p_payment_transaction_id, 'PAYMENT_VERIFY', false
  );
end;
$$;

create function public.api_reject_storefront_payment(
  p_organization_id uuid,
  p_payment_transaction_id uuid,
  p_expected_status text,
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
  v_reason text := btrim(p_reason);
  v_reused boolean;
  v_entitled boolean;
  v_payment_id uuid;
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_transaction public.payment_transactions%rowtype;
  v_proof public.payment_proofs%rowtype;
  v_now timestamptz;
  v_coupon_count bigint;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_payment_transaction_id is null
     or p_request_id is null or p_expected_status <> 'PENDING' then
    raise exception 'PAYMENT_STATE_CONFLICT' using errcode = '22023';
  end if;

  if v_reason is null or char_length(v_reason) not between 8 and 500
     or v_reason ~ '[[:cntrl:]]'
     or v_reason ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|[0-9]{8,}|password|passcode|secret|token|api[_ -]?key|otp)' then
    raise exception 'PAYMENT_REASON_INVALID' using errcode = '22023';
  end if;

  select profile.id
  into v_profile_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.status = 'ACTIVE';

  if v_profile_id is null or not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.profile_id = v_profile_id
      and membership.status = 'ACTIVE'
  ) then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'payment.verify') then
    raise exception 'PAYMENT_VERIFY_PERMISSION_REQUIRED' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.organizations organization
    join public.organization_entitlements entitlement
      on entitlement.organization_id = organization.id
     and entitlement.enabled
     and (entitlement.valid_from is null or entitlement.valid_from <= statement_timestamp())
     and (entitlement.valid_until is null or entitlement.valid_until > statement_timestamp())
    join public.features feature
      on feature.id = entitlement.feature_id
     and feature.code = 'storefront.checkout'
     and feature.feature_type = 'BOOLEAN'
     and feature.status = 'ACTIVE'
    where organization.id = p_organization_id
      and organization.status = 'ACTIVE'
      and organization.currency_code = 'THB'
  ) into v_entitled;

  if not v_entitled then
    raise exception 'CHECKOUT_NOT_ENABLED' using errcode = '42501';
  end if;

  v_reused := public.internal_claim_storefront_payment_review(
    p_organization_id, 'PAYMENT_REJECT', p_request_id, v_profile_id,
    p_payment_transaction_id, p_expected_status, v_reason
  );

  if v_reused then
    return public.internal_storefront_payment_review_response(
      p_organization_id, p_payment_transaction_id, 'PAYMENT_REJECT', true
    );
  end if;

  select transaction_row.payment_id
  into v_payment_id
  from public.payment_transactions transaction_row
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = p_payment_transaction_id;

  select payment.order_id
  into v_order_id
  from public.payments payment
  where payment.organization_id = p_organization_id
    and payment.id = v_payment_id;

  select order_row.* into v_order
  from public.orders order_row
  where order_row.organization_id = p_organization_id
    and order_row.id = v_order_id
  for update;

  if v_order.id is null then
    raise exception 'PAYMENT_REVIEW_NOT_FOUND' using errcode = 'P0001';
  end if;

  select payment.* into v_payment
  from public.payments payment
  where payment.organization_id = p_organization_id
    and payment.id = v_payment_id
    and payment.order_id = v_order.id
  for update;

  select transaction_row.* into v_transaction
  from public.payment_transactions transaction_row
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = p_payment_transaction_id
    and transaction_row.payment_id = v_payment.id
  for update;

  select proof.* into v_proof
  from public.payment_proofs proof
  where proof.organization_id = p_organization_id
    and proof.payment_transaction_id = v_transaction.id
  order by proof.submitted_at desc, proof.id desc
  limit 1
  for update;

  v_now := statement_timestamp();

  if v_transaction.id is null or v_proof.id is null then
    raise exception 'PAYMENT_REVIEW_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_transaction.created_by = v_profile_id then
    raise exception 'PAYMENT_REVIEW_SELF_ACTION_DENIED' using errcode = '42501';
  end if;

  if v_transaction.status <> 'PENDING'
     or v_proof.verification_status <> 'PENDING' then
    raise exception 'PAYMENT_ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  if v_order.order_status <> 'PENDING_CONFIRMATION'
     or v_order.payment_status <> 'UNPAID'
     or v_payment.status <> 'UNPAID' then
    raise exception 'PAYMENT_STATE_CONFLICT' using errcode = 'P0001';
  end if;

  if v_order.payment_due_at is null or v_now >= v_order.payment_due_at then
    raise exception 'PAYMENT_EXPIRED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.inventory_reservations reservation
    where reservation.organization_id = p_organization_id
      and reservation.order_id = v_order.id
      and reservation.status = 'ACTIVE'
      and reservation.expires_at >= v_order.payment_due_at
  ) or exists (
    select 1
    from public.inventory_reservations reservation
    where reservation.organization_id = p_organization_id
      and reservation.order_id = v_order.id
      and reservation.status = 'ACTIVE'
      and (reservation.expires_at is null
           or reservation.expires_at < v_order.payment_due_at)
  ) then
    raise exception 'PAYMENT_HOLD_INCONSISTENT' using errcode = 'P0001';
  end if;

  select count(*)
  into v_coupon_count
  from public.coupon_redemptions redemption
  where redemption.organization_id = p_organization_id
    and redemption.order_id = v_order.id;

  if v_coupon_count > 1
     or (v_coupon_count = 1 and not exists (
       select 1
       from public.coupon_redemptions redemption
       where redemption.organization_id = p_organization_id
         and redemption.order_id = v_order.id
         and redemption.status = 'RESERVED'
     )) then
    raise exception 'PAYMENT_COUPON_INCONSISTENT' using errcode = 'P0001';
  end if;

  if nullif(btrim(v_transaction.external_reference), '') is not null
     and position(
       lower(btrim(v_transaction.external_reference)) in lower(v_reason)
     ) > 0 then
    raise exception 'PAYMENT_REASON_INVALID' using errcode = '22023';
  end if;

  update public.payment_transactions transaction_row
  set status = 'FAILED'
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = v_transaction.id
    and transaction_row.status = 'PENDING';

  update public.payment_proofs proof
  set verification_status = 'REJECTED',
      verified_by = v_profile_id,
      verified_at = v_now
  where proof.organization_id = p_organization_id
    and proof.id = v_proof.id
    and proof.verification_status = 'PENDING';

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_profile_id, 'USER', 'payment_transaction',
    v_transaction.id, 'PAYMENT_REJECTED',
    jsonb_build_object(
      'transaction_status', 'PENDING', 'proof_status', 'PENDING'
    ),
    jsonb_build_object(
      'transaction_status', 'FAILED', 'proof_status', 'REJECTED'
    ),
    v_reason, p_request_id
  );

  perform public.internal_complete_storefront_payment_review(
    p_organization_id, 'PAYMENT_REJECT', p_request_id,
    p_payment_transaction_id
  );

  return public.internal_storefront_payment_review_response(
    p_organization_id, p_payment_transaction_id, 'PAYMENT_REJECT', false
  );
exception
  when sqlstate '42501' or sqlstate '22023' or sqlstate 'P0001' then
    raise;
  when others then
    raise exception 'PAYMENT_REVIEW_FAILED' using errcode = 'P0001';
end;
$$;

create function public.api_record_storefront_payment_failed_event(
  p_organization_id uuid,
  p_payment_transaction_id uuid,
  p_review_request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_cart_id uuid;
  v_event_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_payment_transaction_id is null
     or p_review_request_id is null then
    raise exception 'PAYMENT_REVIEW_NOT_FOUND' using errcode = '22023';
  end if;

  select order_row.id, order_row.source_cart_id
  into v_order_id, v_cart_id
  from public.payment_transactions transaction_row
  join public.payments payment
    on payment.organization_id = transaction_row.organization_id
   and payment.id = transaction_row.payment_id
  join public.orders order_row
    on order_row.organization_id = payment.organization_id
   and order_row.id = payment.order_id
  where transaction_row.organization_id = p_organization_id
    and transaction_row.id = p_payment_transaction_id
    and transaction_row.status = 'FAILED'
    and order_row.source = 'STOREFRONT'
    and order_row.source_cart_id is not null
    and exists (
      select 1
      from public.audit_logs audit
      where audit.organization_id = transaction_row.organization_id
        and audit.entity_type = 'payment_transaction'
        and audit.entity_id = transaction_row.id
        and audit.action = 'PAYMENT_REJECTED'
        and audit.request_id = p_review_request_id
    )
  for update of transaction_row;

  if v_order_id is null or v_cart_id is null then
    raise exception 'PAYMENT_REVIEW_NOT_FOUND' using errcode = 'P0001';
  end if;

  select event.id
  into v_event_id
  from public.cart_events event
  where event.organization_id = p_organization_id
    and event.cart_id = v_cart_id
    and event.event_type = 'payment_failed'
    and event.payload_json ->> 'review_request_id' = p_review_request_id::text
  order by event.created_at, event.id
  limit 1;

  if v_event_id is not null then
    return jsonb_build_object(
      'event_id', v_event_id,
      'idempotency_reused', true
    );
  end if;

  insert into public.cart_events (
    organization_id, cart_id, event_type, actor_type, actor_id, payload_json
  ) values (
    p_organization_id, v_cart_id, 'payment_failed', 'SYSTEM', null,
    jsonb_build_object(
      'schema_version', 1,
      'review_request_id', p_review_request_id,
      'payment_transaction_id', p_payment_transaction_id,
      'order_id', v_order_id,
      'source', 'staff_review_rejection'
    )
  )
  returning id into v_event_id;

  return jsonb_build_object(
    'event_id', v_event_id,
    'idempotency_reused', false
  );
end;
$$;

drop policy payments_permission_update on public.payments;
drop policy payment_transactions_permission_insert on public.payment_transactions;
drop policy payment_transactions_permission_update on public.payment_transactions;
drop policy payment_proofs_permission_insert on public.payment_proofs;
drop policy payment_proofs_permission_update on public.payment_proofs;

revoke insert, update, delete on table public.payments
  from authenticated;
revoke insert, update, delete on table public.payment_transactions
  from authenticated;
revoke insert, update, delete on table public.payment_proofs
  from authenticated;

revoke execute on function public.internal_claim_storefront_payment_review(
  uuid, text, uuid, uuid, uuid, text, text
) from public, anon, authenticated, service_role;
revoke execute on function public.internal_complete_storefront_payment_review(
  uuid, text, uuid, uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.internal_storefront_payment_review_response(
  uuid, uuid, text, boolean
) from public, anon, authenticated, service_role;
revoke execute on function public.internal_settle_storefront_payment(
  uuid, uuid, uuid, text, uuid
) from public, anon, authenticated, service_role;

revoke execute on function public.api_verify_storefront_payment(
  uuid, uuid, text, text, uuid
) from public, anon, service_role;
grant execute on function public.api_verify_storefront_payment(
  uuid, uuid, text, text, uuid
) to authenticated;

revoke execute on function public.api_reject_storefront_payment(
  uuid, uuid, text, text, uuid
) from public, anon, service_role;
grant execute on function public.api_reject_storefront_payment(
  uuid, uuid, text, text, uuid
) to authenticated;

revoke execute on function public.api_record_storefront_payment_failed_event(
  uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.api_record_storefront_payment_failed_event(
  uuid, uuid, uuid
) to service_role;

comment on function public.api_verify_storefront_payment(
  uuid, uuid, text, text, uuid
) is 'Atomic full-payment verification and settlement boundary for one pending Storefront bank-transfer claim.';

comment on function public.api_reject_storefront_payment(
  uuid, uuid, text, text, uuid
) is 'Terminal rejection boundary for one pending Storefront bank-transfer claim; stock and coupon holds remain active.';

comment on function public.api_record_storefront_payment_failed_event(
  uuid, uuid, uuid
) is 'Service-only idempotent post-commit payment_failed cart event recorder for a proven rejection audit.';
