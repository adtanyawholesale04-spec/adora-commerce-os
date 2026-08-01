-- ADORA Commerce OS (ACOS)
-- Phase 1D Manual Payment Part 4D Layer A private Staff Review reads.
-- Read-only queue/detail RPCs; no review action, settlement or direct-write change.

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
    'public.roles',
    'public.membership_roles',
    'public.role_permissions',
    'public.permissions',
    'public.organization_storefronts',
    'public.organization_checkout_settings',
    'public.features',
    'public.organization_entitlements',
    'public.orders',
    'public.payments',
    'public.payment_transactions',
    'public.payment_proofs'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Staff Review read preflight failed: missing %', v_missing;
  end if;

  if to_regprocedure('public.has_org_permission(uuid,text)') is null then
    raise exception 'Staff Review read preflight failed: permission helper missing';
  end if;

  if to_regprocedure(
    'public.api_list_storefront_payment_reviews(uuid,timestamptz,uuid,integer)'
  ) is not null
     or to_regprocedure(
       'public.api_get_storefront_payment_review(uuid,uuid)'
     ) is not null then
    raise exception 'Staff Review read preflight failed: target function exists';
  end if;

  if exists (
    select 1
    from public.organization_checkout_settings settings
    where settings.payment_due_minutes > settings.reservation_minutes
  ) then
    raise exception 'Staff Review read preflight failed: deadline exceeds hold';
  end if;

  if exists (
    select 1
    from public.payment_transactions pt
    join public.payment_proofs pp
      on pp.organization_id = pt.organization_id
     and pp.payment_transaction_id = pt.id
     and pp.verification_status = 'PENDING'
     and pp.storage_path is null
     and pp.mime_type is null
     and pp.submitted_by_type = 'CUSTOMER'
     and pp.metadata_json = jsonb_build_object(
       'schema_version', 1,
       'evidence_type', 'REFERENCE_ONLY'
     )
    join public.payments p
      on p.organization_id = pt.organization_id
     and p.id = pt.payment_id
    join public.orders o
      on o.organization_id = p.organization_id
     and o.id = p.order_id
    where pt.transaction_type = 'PAYMENT'
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status = 'PENDING'
      and (
        pt.external_reference is null
        or btrim(pt.external_reference) = ''
        or o.source <> 'STOREFRONT'
        or o.order_status <> 'PENDING_CONFIRMATION'
        or o.payment_status <> 'UNPAID'
        or p.status <> 'UNPAID'
        or o.currency_code <> 'THB'
        or p.currency_code is distinct from o.currency_code
        or pt.currency_code is distinct from o.currency_code
        or p.amount_expected is distinct from o.grand_total
        or p.amount_received is distinct from 0::numeric
        or o.amount_paid is distinct from 0::numeric
        or o.amount_due is distinct from o.grand_total
        or pt.amount is distinct from p.amount_expected
        or o.payment_due_at is null
      )
  ) then
    raise exception 'Staff Review read preflight failed: pending evidence inconsistent';
  end if;
end;
$$;

create function public.api_list_storefront_payment_reviews(
  p_organization_id uuid,
  p_cursor_submitted_at timestamptz,
  p_cursor_transaction_id uuid,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_limit integer := least(50, greatest(1, coalesce(p_limit, 25)));
  v_can_verify boolean := false;
  v_checkout_enabled boolean := false;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null
     or (p_cursor_submitted_at is null) <> (p_cursor_transaction_id is null) then
    raise exception 'PAYMENT_REVIEW_READ_FAILED' using errcode = '22023';
  end if;

  if not public.has_org_permission(p_organization_id, 'payment.view') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'ACTIVE';

  v_can_verify := public.has_org_permission(
    p_organization_id,
    'payment.verify'
  );

  select exists (
    select 1
    from public.organizations o
    join public.organization_entitlements oe
      on oe.organization_id = o.id
     and oe.enabled
     and (oe.valid_from is null or oe.valid_from <= statement_timestamp())
     and (oe.valid_until is null or oe.valid_until > statement_timestamp())
    join public.features f
      on f.id = oe.feature_id
     and f.code = 'storefront.checkout'
     and f.feature_type = 'BOOLEAN'
     and f.status = 'ACTIVE'
    where o.id = p_organization_id
      and o.status = 'ACTIVE'
      and o.currency_code = 'THB'
  ) into v_checkout_enabled;

  with candidates as (
    select
      pt.id as payment_transaction_id,
      pp.id as payment_proof_id,
      p.id as payment_id,
      o.id as order_id,
      to_char(pt.amount, 'FM9999999999990.00') as amount,
      pt.currency_code,
      pp.submitted_at,
      o.payment_due_at,
      (
        v_can_verify
        and v_checkout_enabled
        and pt.created_by is distinct from v_profile_id
        and statement_timestamp() < o.payment_due_at
      ) as can_review,
      row_number() over (order by pp.submitted_at, pt.id) as page_row
    from public.payment_transactions pt
    join public.payment_proofs pp
      on pp.organization_id = pt.organization_id
     and pp.payment_transaction_id = pt.id
    join public.payments p
      on p.organization_id = pt.organization_id
     and p.id = pt.payment_id
    join public.orders o
      on o.organization_id = p.organization_id
     and o.id = p.order_id
    where pt.organization_id = p_organization_id
      and pt.transaction_type = 'PAYMENT'
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status = 'PENDING'
      and pt.external_reference is not null
      and btrim(pt.external_reference) <> ''
      and pp.storage_path is null
      and pp.mime_type is null
      and pp.submitted_by_type = 'CUSTOMER'
      and pp.verification_status = 'PENDING'
      and pp.metadata_json = jsonb_build_object(
        'schema_version', 1,
        'evidence_type', 'REFERENCE_ONLY'
      )
      and o.source = 'STOREFRONT'
      and o.order_status = 'PENDING_CONFIRMATION'
      and o.payment_status = 'UNPAID'
      and p.status = 'UNPAID'
      and o.currency_code = 'THB'
      and p.currency_code = o.currency_code
      and pt.currency_code = o.currency_code
      and p.amount_expected = o.grand_total
      and p.amount_received = 0
      and o.amount_paid = 0
      and o.amount_due = o.grand_total
      and pt.amount = p.amount_expected
      and o.payment_due_at is not null
      and (
        p_cursor_submitted_at is null
        or (pp.submitted_at, pt.id) > (
          p_cursor_submitted_at,
          p_cursor_transaction_id
        )
      )
    order by pp.submitted_at, pt.id
    limit v_limit + 1
  ),
  page as (
    select *
    from candidates
    where page_row <= v_limit
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_transaction_id', item.payment_transaction_id,
            'payment_proof_id', item.payment_proof_id,
            'payment_id', item.payment_id,
            'order_id', item.order_id,
            'amount', item.amount,
            'currency_code', item.currency_code,
            'submitted_at', item.submitted_at,
            'payment_due_at', item.payment_due_at,
            'can_review', item.can_review
          )
          order by item.submitted_at, item.payment_transaction_id
        )
        from page item
      ),
      '[]'::jsonb
    ),
    'next_cursor', case
      when (select count(*) from candidates) > v_limit then (
        select jsonb_build_object(
          'submitted_at', cursor_item.submitted_at,
          'payment_transaction_id', cursor_item.payment_transaction_id
        )
        from page cursor_item
        order by cursor_item.submitted_at desc,
                 cursor_item.payment_transaction_id desc
        limit 1
      )
      else null
    end
  ) into v_result;

  return v_result;
exception
  when others then
    if sqlerrm in (
      'AUTH_REQUIRED',
      'PERMISSION_DENIED',
      'PAYMENT_REVIEW_READ_FAILED'
    ) then
      raise;
    end if;
    raise exception 'PAYMENT_REVIEW_READ_FAILED' using errcode = 'P0001';
end;
$$;

create function public.api_get_storefront_payment_review(
  p_organization_id uuid,
  p_payment_transaction_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_checkout_enabled boolean := false;
  v_result jsonb;
begin
  if auth.uid() is null
     or p_organization_id is null
     or p_payment_transaction_id is null then
    return jsonb_build_object('available', false);
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'ACTIVE';

  if v_profile_id is null
     or not public.has_org_permission(p_organization_id, 'payment.view')
     or not public.has_org_permission(p_organization_id, 'payment.verify') then
    return jsonb_build_object('available', false);
  end if;

  select exists (
    select 1
    from public.organizations o
    join public.organization_entitlements oe
      on oe.organization_id = o.id
     and oe.enabled
     and (oe.valid_from is null or oe.valid_from <= statement_timestamp())
     and (oe.valid_until is null or oe.valid_until > statement_timestamp())
    join public.features f
      on f.id = oe.feature_id
     and f.code = 'storefront.checkout'
     and f.feature_type = 'BOOLEAN'
     and f.status = 'ACTIVE'
    where o.id = p_organization_id
      and o.status = 'ACTIVE'
      and o.currency_code = 'THB'
  ) into v_checkout_enabled;

  select jsonb_build_object(
    'available', true,
    'order_id', o.id,
    'payment_id', p.id,
    'payment_transaction_id', pt.id,
    'payment_proof_id', pp.id,
    'order_status', o.order_status,
    'order_payment_status', o.payment_status,
    'payment_status', p.status,
    'transaction_status', pt.status,
    'proof_status', pp.verification_status,
    'amount', to_char(pt.amount, 'FM9999999999990.00'),
    'currency_code', pt.currency_code,
    'submitted_at', pp.submitted_at,
    'payment_due_at', o.payment_due_at,
    'payment_reference', upper(btrim(pt.external_reference)),
    'self_review', pt.created_by = v_profile_id,
    'review_eligible', (
      v_checkout_enabled
      and pt.created_by is distinct from v_profile_id
      and statement_timestamp() < o.payment_due_at
    )
  )
  into v_result
  from public.payment_transactions pt
  join public.payment_proofs pp
    on pp.organization_id = pt.organization_id
   and pp.payment_transaction_id = pt.id
  join public.payments p
    on p.organization_id = pt.organization_id
   and p.id = pt.payment_id
  join public.orders o
    on o.organization_id = p.organization_id
   and o.id = p.order_id
  where pt.organization_id = p_organization_id
    and pt.id = p_payment_transaction_id
    and pt.transaction_type = 'PAYMENT'
    and pt.payment_method = 'BANK_TRANSFER'
    and pt.status = 'PENDING'
    and pt.external_reference is not null
    and btrim(pt.external_reference) <> ''
    and pp.storage_path is null
    and pp.mime_type is null
    and pp.submitted_by_type = 'CUSTOMER'
    and pp.verification_status = 'PENDING'
    and pp.metadata_json = jsonb_build_object(
      'schema_version', 1,
      'evidence_type', 'REFERENCE_ONLY'
    )
    and o.source = 'STOREFRONT'
    and o.order_status = 'PENDING_CONFIRMATION'
    and o.payment_status = 'UNPAID'
    and p.status = 'UNPAID'
    and o.currency_code = 'THB'
    and p.currency_code = o.currency_code
    and pt.currency_code = o.currency_code
    and p.amount_expected = o.grand_total
    and p.amount_received = 0
    and o.amount_paid = 0
    and o.amount_due = o.grand_total
    and pt.amount = p.amount_expected
    and o.payment_due_at is not null;

  return coalesce(v_result, jsonb_build_object('available', false));
exception
  when others then
    raise exception 'PAYMENT_REVIEW_READ_FAILED' using errcode = 'P0001';
end;
$$;

revoke all on function public.api_list_storefront_payment_reviews(
  uuid,
  timestamptz,
  uuid,
  integer
) from public, anon, authenticated, service_role;

grant execute on function public.api_list_storefront_payment_reviews(
  uuid,
  timestamptz,
  uuid,
  integer
) to authenticated;

revoke all on function public.api_get_storefront_payment_review(
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.api_get_storefront_payment_review(
  uuid,
  uuid
) to authenticated;

comment on function public.api_list_storefront_payment_reviews(
  uuid,
  timestamptz,
  uuid,
  integer
) is
  'RM01-RM09 private reference-free Staff Review queue read boundary.';

comment on function public.api_get_storefront_payment_review(
  uuid,
  uuid
) is
  'RM01-RM09 permission-gated private Staff Review detail read boundary.';
