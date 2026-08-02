-- Forward-only fix for the Staff Review detail response.
-- The historical function returned NULL for self_review when created_by was NULL.
-- The application contract requires a boolean and the maker-checker comparison
-- must remain distinct-from semantics for a missing creator.

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'api_get_storefront_payment_review'
      and pg_get_function_identity_arguments(p.oid) = 'p_organization_id uuid, p_payment_transaction_id uuid'
  ) then
    raise exception 'Expected Staff Review detail function is missing';
  end if;
end;
$$;

create or replace function public.api_get_storefront_payment_review(
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
    'self_review', pt.created_by is not distinct from v_profile_id,
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

revoke all on function public.api_get_storefront_payment_review(
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.api_get_storefront_payment_review(
  uuid,
  uuid
) to authenticated;

comment on function public.api_get_storefront_payment_review(
  uuid,
  uuid
) is
  'Forward fix: RM01-RM09 detail read returns boolean self_review for nullable maker identity.';
