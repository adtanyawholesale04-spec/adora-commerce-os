-- ADORA Commerce OS (ACOS)
-- Phase 1D Manual Payment Part 3D-A3 guarded customer payment snapshot.

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
    'public.payment_proofs'
  ]) as required_object
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Phase 1D payment snapshot preflight failed: missing %', v_missing;
  end if;

  if to_regprocedure(
    'public.api_get_storefront_order_payment_snapshot(uuid,uuid)'
  ) is not null then
    raise exception 'Phase 1D payment snapshot preflight failed: function already exists';
  end if;
end;
$$;

create function public.api_get_storefront_order_payment_snapshot(
  p_organization_id uuid,
  p_order_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_pending_exists boolean := false;
  v_pending_proof_status text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null or p_order_id is null then
    raise exception 'PAYMENT_SNAPSHOT_FAILED' using errcode = '22023';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'ACTIVE';

  if v_profile_id is null then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.profile_id = v_profile_id
      and om.status = 'ACTIVE'
  ) then
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
    and cpl.link_status = 'ACTIVE';

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

  select o.*
  into v_order
  from public.orders o
  where o.organization_id = p_organization_id
    and o.id = p_order_id
    and o.customer_id = v_customer_id
    and o.source = 'STOREFRONT'
    and o.order_status <> 'DRAFT';

  if v_order.id is null then
    return jsonb_build_object('available', false);
  end if;

  select p.*
  into v_payment
  from public.payments p
  where p.organization_id = p_organization_id
    and p.order_id = p_order_id;

  if v_payment.id is null
     or v_payment.currency_code is distinct from v_order.currency_code
     or v_payment.status is distinct from v_order.payment_status
     or v_payment.amount_expected is distinct from v_order.grand_total
     or v_payment.amount_received is distinct from v_order.amount_paid
     or v_order.amount_due is distinct from greatest(
       v_order.grand_total - v_order.amount_paid,
       0::numeric
     ) then
    raise exception 'PAYMENT_STATE_INCONSISTENT' using errcode = 'P0001';
  end if;

  select true, pp.verification_status
  into v_pending_exists, v_pending_proof_status
  from public.payment_transactions pt
  join public.payment_proofs pp
    on pp.organization_id = pt.organization_id
   and pp.payment_transaction_id = pt.id
  where pt.organization_id = p_organization_id
    and pt.payment_id = v_payment.id
    and pt.transaction_type = 'PAYMENT'
    and pt.payment_method = 'BANK_TRANSFER'
    and pt.status = 'PENDING'
    and pp.storage_path is null
    and pp.mime_type is null
    and pp.submitted_by_type = 'CUSTOMER'
    and pp.verification_status = 'PENDING'
    and pp.metadata_json = jsonb_build_object(
      'schema_version', 1,
      'evidence_type', 'REFERENCE_ONLY'
    )
  limit 1;

  return jsonb_build_object(
    'available', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'order_status', v_order.order_status,
      'payment_status', v_order.payment_status,
      'fulfillment_status', v_order.fulfillment_status,
      'currency_code', v_order.currency_code,
      'grand_total', to_char(v_order.grand_total, 'FM9999999999990.00'),
      'amount_due', to_char(v_order.amount_due, 'FM9999999999990.00'),
      'payment_due_at', v_order.payment_due_at
    ),
    'pending_attempt', jsonb_build_object(
      'exists', coalesce(v_pending_exists, false),
      'proof_status', v_pending_proof_status
    )
  );
exception
  when others then
    if sqlerrm in (
      'AUTH_REQUIRED',
      'MEMBERSHIP_REQUIRED',
      'CUSTOMER_LINK_REQUIRED',
      'CHECKOUT_NOT_ENABLED',
      'PAYMENT_STATE_INCONSISTENT',
      'PAYMENT_SNAPSHOT_FAILED'
    ) then
      raise;
    end if;
    raise exception 'PAYMENT_SNAPSHOT_FAILED' using errcode = 'P0001';
end;
$$;

revoke all on function public.api_get_storefront_order_payment_snapshot(
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.api_get_storefront_order_payment_snapshot(
  uuid,
  uuid
) to authenticated;

comment on function public.api_get_storefront_order_payment_snapshot(
  uuid,
  uuid
) is
  'MR01-MR24 authenticated customer-owned Storefront order payment snapshot boundary.';
