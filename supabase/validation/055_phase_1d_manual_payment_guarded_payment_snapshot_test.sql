\set ON_ERROR_STOP on

begin;

do $$
declare
  v_api oid := to_regprocedure(
    'public.api_get_storefront_order_payment_snapshot(uuid,uuid)'
  );
begin
  if v_api is null then
    raise exception 'guarded payment snapshot function is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_api
      and p.prosecdef
      and p.provolatile = 's'
      and 'search_path=""' = any(p.proconfig)
  ) then
    raise exception 'guarded payment snapshot is not hardened STABLE SECURITY DEFINER';
  end if;

  if not has_function_privilege('authenticated', v_api, 'EXECUTE')
     or has_function_privilege('anon', v_api, 'EXECUTE')
     or has_function_privilege('service_role', v_api, 'EXECUTE') then
    raise exception 'guarded payment snapshot grants are incorrect';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values (
  'e0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'payment-snapshot@example.test',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.organizations (id, name, slug, status, currency_code)
values
  ('e1000000-0000-4000-8000-000000000001', 'Payment Snapshot A', 'payment-snapshot-a', 'ACTIVE', 'THB'),
  ('e1000000-0000-4000-8000-000000000002', 'Payment Snapshot B', 'payment-snapshot-b', 'ACTIVE', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values (
  'e2000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'Payment Snapshot Customer',
  'ACTIVE'
);

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('e3000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'ACTIVE', true, now()),
  ('e3000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', 'ACTIVE', false, now());

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  ('e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'PAY-SNAPSHOT-OWNER', 'Payment Snapshot Owner', 'ACTIVE'),
  ('e4000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'PAY-SNAPSHOT-OTHER', 'Payment Snapshot Other', 'ACTIVE'),
  ('e4000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'PAY-SNAPSHOT-B', 'Payment Snapshot B', 'ACTIVE');

insert into public.customer_profile_links (
  id, organization_id, customer_id, profile_id, link_status, link_source,
  verification_method, verified_at
) values
  ('e5000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'ACTIVE', 'VERIFIED_SIGNUP', 'EMAIL_OTP', now()),
  ('e5000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000003', 'e2000000-0000-4000-8000-000000000001', 'ACTIVE', 'VERIFIED_SIGNUP', 'EMAIL_OTP', now());

insert into public.organization_storefronts (
  id, organization_id, publication_status, tagline, published_at, published_by
) values
  ('e6000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'PUBLISHED', 'Payment Snapshot A', now(), 'e2000000-0000-4000-8000-000000000001'),
  ('e6000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'PUBLISHED', 'Payment Snapshot B', now(), 'e2000000-0000-4000-8000-000000000001');

insert into public.organization_checkout_settings (
  organization_id, status, currency_code, reservation_minutes, payment_due_minutes
) values
  ('e1000000-0000-4000-8000-000000000001', 'ACTIVE', 'THB', 15, 15),
  ('e1000000-0000-4000-8000-000000000002', 'ACTIVE', 'THB', 15, 15);

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, valid_from
)
select organization_id, f.id, 'MANUAL_OVERRIDE', true, now() - interval '1 day'
from unnest(array[
  'e1000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid
]) as organization_id
cross join public.features f
where f.code = 'storefront.checkout';

insert into public.orders (
  id, organization_id, customer_id, order_number, source, currency_code,
  order_status, payment_status, fulfillment_status, subtotal, grand_total,
  amount_paid, amount_due, payment_due_at
) values
  ('e7000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'PAY-SNAPSHOT-1', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('e7000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000002', 'PAY-SNAPSHOT-2', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('e7000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'PAY-SNAPSHOT-3', 'ADMIN', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('e7000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'PAY-SNAPSHOT-4', 'STOREFRONT', 'THB', 'DRAFT', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, null),
  ('e7000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'PAY-SNAPSHOT-5', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 90, now() + interval '15 minutes'),
  ('e7000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000003', 'PAY-SNAPSHOT-6', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes');

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received, currency_code
) values
  ('e8000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000001', 'UNPAID', 100, 0, 'THB'),
  ('e8000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000002', 'UNPAID', 100, 0, 'THB'),
  ('e8000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000003', 'UNPAID', 100, 0, 'THB'),
  ('e8000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000004', 'UNPAID', 100, 0, 'THB'),
  ('e8000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000005', 'UNPAID', 100, 0, 'THB'),
  ('e8000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000006', 'UNPAID', 100, 0, 'THB');

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, external_reference, status
) values (
  'e9000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'e8000000-0000-4000-8000-000000000001',
  'PAYMENT',
  'BANK_TRANSFER',
  100,
  'THB',
  'SECRET-REFERENCE-001',
  'PENDING'
);

insert into public.payment_proofs (
  id, organization_id, payment_transaction_id, storage_path, mime_type,
  submitted_by_type, verification_status, metadata_json
) values (
  'ea000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'e9000000-0000-4000-8000-000000000001',
  null,
  null,
  'CUSTOMER',
  'PENDING',
  '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'::jsonb
);

create temporary table payment_snapshot_validation_counts (
  evidence_counts text not null
) on commit drop;

insert into payment_snapshot_validation_counts (evidence_counts)
select concat_ws('|',
  (select count(*) from public.payment_transactions),
  (select count(*) from public.payment_proofs),
  (select count(*) from public.audit_logs),
  (select count(*) from public.commerce_idempotency_keys)
);

set local role authenticated;

do $$
begin
  begin
    perform public.api_get_storefront_order_payment_snapshot(
      'e1000000-0000-4000-8000-000000000001',
      'e7000000-0000-4000-8000-000000000001'
    );
    raise exception 'unauthenticated snapshot unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_result jsonb;
  v_unavailable jsonb := '{"available":false}'::jsonb;
begin
  v_result := public.api_get_storefront_order_payment_snapshot(
    'e1000000-0000-4000-8000-000000000001',
    'e7000000-0000-4000-8000-000000000001'
  );

  if v_result ->> 'available' <> 'true'
     or v_result -> 'order' <> jsonb_build_object(
       'id', 'e7000000-0000-4000-8000-000000000001'::uuid,
       'order_number', 'PAY-SNAPSHOT-1',
       'order_status', 'PENDING_CONFIRMATION',
       'payment_status', 'UNPAID',
       'fulfillment_status', 'UNFULFILLED',
       'currency_code', 'THB',
       'grand_total', '100.00',
       'amount_due', '100.00',
       'payment_due_at', v_result #> '{order,payment_due_at}'
     )
     or v_result -> 'pending_attempt' <> '{"exists":true,"proof_status":"PENDING"}'::jsonb
     or v_result::text like '%SECRET-REFERENCE-001%'
     or v_result::text like '%e9000000-0000-4000-8000-000000000001%'
     or v_result::text like '%ea000000-0000-4000-8000-000000000001%' then
    raise exception 'guarded payment snapshot response is incorrect or leaks data: %', v_result;
  end if;

  if public.api_get_storefront_order_payment_snapshot(
       'e1000000-0000-4000-8000-000000000001',
       'e7000000-0000-4000-8000-000000000002'
     ) <> v_unavailable
     or public.api_get_storefront_order_payment_snapshot(
       'e1000000-0000-4000-8000-000000000001',
       'e7000000-0000-4000-8000-000000000003'
     ) <> v_unavailable
     or public.api_get_storefront_order_payment_snapshot(
       'e1000000-0000-4000-8000-000000000001',
       'e7000000-0000-4000-8000-000000000004'
     ) <> v_unavailable
     or public.api_get_storefront_order_payment_snapshot(
       'e1000000-0000-4000-8000-000000000001',
       'e7000000-0000-4000-8000-000000000006'
     ) <> v_unavailable
     or public.api_get_storefront_order_payment_snapshot(
       'e1000000-0000-4000-8000-000000000001',
       'eb000000-0000-4000-8000-000000000001'
     ) <> v_unavailable then
    raise exception 'non-enumerating unavailable contract failed';
  end if;

  begin
    perform public.api_get_storefront_order_payment_snapshot(
      'e1000000-0000-4000-8000-000000000001',
      'e7000000-0000-4000-8000-000000000005'
    );
    raise exception 'inconsistent payment state unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'PAYMENT_STATE_INCONSISTENT' then raise; end if;
  end;
end;
$$;

reset role;

do $$
declare
  v_before text;
  v_after text;
begin
  select evidence_counts into v_before
  from payment_snapshot_validation_counts;

  select concat_ws('|',
    (select count(*) from public.payment_transactions),
    (select count(*) from public.payment_proofs),
    (select count(*) from public.audit_logs),
    (select count(*) from public.commerce_idempotency_keys)
  ) into v_after;

  if v_before <> v_after then
    raise exception 'guarded read mutated evidence tables: before %, after %', v_before, v_after;
  end if;
end;
$$;

select 'phase_1d_manual_payment_guarded_payment_snapshot' as suite, 'pass' as result;

rollback;
