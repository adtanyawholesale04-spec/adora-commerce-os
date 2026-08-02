-- Local-only QA fixture. Never apply this file to Production.
-- Run scripts/local/seed-admin-qa.mjs first so Auth owns the local QA user.

begin;

do $$
declare
  v_auth_user_id uuid;
  v_organization_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_profile_id uuid := 'a0000000-0000-4000-8000-000000000002';
  v_membership_id uuid := 'a0000000-0000-4000-8000-000000000003';
  v_role_id uuid := 'a0000000-0000-4000-8000-000000000004';
  v_entitlement_id uuid := 'a0000000-0000-4000-8000-00000000000a';
  v_customer_id uuid := 'a0000000-0000-4000-8000-000000000005';
  v_order_id uuid := 'a0000000-0000-4000-8000-000000000006';
  v_payment_id uuid := 'a0000000-0000-4000-8000-000000000007';
  v_transaction_id uuid := 'a0000000-0000-4000-8000-000000000008';
  v_proof_id uuid := 'a0000000-0000-4000-8000-000000000009';
  v_checkout_feature_id uuid;
begin
  select id into v_auth_user_id
  from auth.users
  where email = 'ceoacos@example.com';

  if v_auth_user_id is null then
    raise exception 'Run scripts/local/seed-admin-qa.mjs first to create the Local Auth user';
  end if;

  insert into public.organizations (id, name, slug, status, timezone, currency_code)
  values (v_organization_id, 'ACOS Local QA', 'acos-local-qa', 'ACTIVE', 'Asia/Bangkok', 'THB')
  on conflict (id) do update
  set name = excluded.name, slug = excluded.slug, status = excluded.status,
      timezone = excluded.timezone, currency_code = excluded.currency_code;

  insert into public.profiles (id, auth_user_id, display_name, status)
  values (v_profile_id, v_auth_user_id, 'ACOS Local QA Admin', 'ACTIVE')
  on conflict (auth_user_id) do update
  set display_name = excluded.display_name, status = excluded.status;

  select id into v_profile_id
  from public.profiles
  where auth_user_id = v_auth_user_id;

  insert into public.organization_memberships
    (id, organization_id, profile_id, status, is_default, joined_at)
  values (v_membership_id, v_organization_id, v_profile_id, 'ACTIVE', true, now())
  on conflict (id) do update
  set organization_id = excluded.organization_id, profile_id = excluded.profile_id,
      status = excluded.status, is_default = excluded.is_default,
      joined_at = excluded.joined_at;

  insert into public.roles (id, organization_id, code, name, status, is_system_role)
  values (v_role_id, v_organization_id, 'LOCAL_QA_ADMIN', 'Local QA Admin', 'ACTIVE', true)
  on conflict (id) do update
  set organization_id = excluded.organization_id, code = excluded.code,
      name = excluded.name, status = excluded.status, is_system_role = excluded.is_system_role;

  insert into public.membership_roles (membership_id, role_id)
  values (v_membership_id, v_role_id)
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, id from public.permissions
  on conflict do nothing;

  select id into v_checkout_feature_id
  from public.features
  where code = 'storefront.checkout';

  if v_checkout_feature_id is null then
    raise exception 'Feature storefront.checkout does not exist';
  end if;

  insert into public.organization_entitlements
    (id, organization_id, feature_id, source_type, enabled, valid_from)
  values (v_entitlement_id, v_organization_id, v_checkout_feature_id, 'MANUAL_OVERRIDE', true, now())
  on conflict (id) do update
  set source_type = excluded.source_type, enabled = excluded.enabled,
      valid_from = excluded.valid_from, valid_until = null;

  insert into public.customers
    (id, organization_id, customer_code, display_name, email, email_normalized, status)
  values
    (v_customer_id, v_organization_id, 'LOCAL-QA-CUSTOMER-001', 'Local QA Customer',
     'customer@example.test', 'customer@example.test', 'ACTIVE')
  on conflict (id) do update
  set organization_id = excluded.organization_id, display_name = excluded.display_name,
      email = excluded.email, email_normalized = excluded.email_normalized,
      status = excluded.status;

  insert into public.orders
    (id, organization_id, customer_id, order_number, source, currency_code,
     order_status, payment_status, fulfillment_status, grand_total, amount_paid,
     amount_due, payment_due_at)
  values
    (v_order_id, v_organization_id, v_customer_id, 'LOCAL-QA-ORDER-001', 'STOREFRONT',
     'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100.00, 0, 100.00,
     now() + interval '1 day')
  on conflict (id) do update
  set order_status = excluded.order_status, payment_status = excluded.payment_status,
      fulfillment_status = excluded.fulfillment_status, grand_total = excluded.grand_total,
      amount_paid = excluded.amount_paid, amount_due = excluded.amount_due,
      payment_due_at = excluded.payment_due_at;

  insert into public.payments
    (id, organization_id, order_id, status, amount_expected, amount_received, currency_code)
  values (v_payment_id, v_organization_id, v_order_id, 'UNPAID', 100.00, 0, 'THB')
  on conflict (id) do update
  set status = excluded.status, amount_expected = excluded.amount_expected,
      amount_received = excluded.amount_received, currency_code = excluded.currency_code;

  insert into public.payment_transactions
    (id, organization_id, payment_id, transaction_type, payment_method, amount,
     currency_code, provider, external_reference, status, created_by)
  values
    (v_transaction_id, v_organization_id, v_payment_id, 'PAYMENT', 'BANK_TRANSFER',
     100.00, 'THB', 'LOCAL_QA', 'LOCAL-QA-REFERENCE-001', 'PENDING', null)
  on conflict (id) do update
  set transaction_type = excluded.transaction_type, payment_method = excluded.payment_method,
      amount = excluded.amount, currency_code = excluded.currency_code,
      provider = excluded.provider, external_reference = excluded.external_reference,
      status = excluded.status, created_by = excluded.created_by;

  insert into public.payment_proofs
    (id, organization_id, payment_transaction_id, storage_path, mime_type,
     submitted_by_type, verification_status, metadata_json)
  values
    (v_proof_id, v_organization_id, v_transaction_id, null, null, 'CUSTOMER',
     'PENDING', jsonb_build_object('schema_version', 1, 'evidence_type', 'REFERENCE_ONLY'))
  on conflict (id) do update
  set storage_path = null, mime_type = null, submitted_by_type = 'CUSTOMER',
      verification_status = 'PENDING', metadata_json =
        jsonb_build_object('schema_version', 1, 'evidence_type', 'REFERENCE_ONLY');
end;
$$;

commit;
