\set ON_ERROR_STOP on

begin;

do $$
declare
  v_queue oid := to_regprocedure(
    'public.api_list_storefront_payment_reviews(uuid,timestamptz,uuid,integer)'
  );
  v_detail oid := to_regprocedure(
    'public.api_get_storefront_payment_review(uuid,uuid)'
  );
begin
  if v_queue is null or v_detail is null then
    raise exception 'Staff Review read functions are missing';
  end if;

  if not exists (
    select 1 from pg_proc p
    where p.oid = v_queue
      and p.prosecdef
      and p.provolatile = 's'
      and 'search_path=""' = any(p.proconfig)
  ) or not exists (
    select 1 from pg_proc p
    where p.oid = v_detail
      and p.prosecdef
      and p.provolatile = 's'
      and 'search_path=""' = any(p.proconfig)
  ) then
    raise exception 'Staff Review reads are not hardened STABLE SECURITY DEFINER functions';
  end if;

  if not has_function_privilege('authenticated', v_queue, 'EXECUTE')
     or not has_function_privilege('authenticated', v_detail, 'EXECUTE')
     or has_function_privilege('anon', v_queue, 'EXECUTE')
     or has_function_privilege('anon', v_detail, 'EXECUTE')
     or has_function_privilege('service_role', v_queue, 'EXECUTE')
     or has_function_privilege('service_role', v_detail, 'EXECUTE') then
    raise exception 'Staff Review read grants are incorrect';
  end if;

  if to_regprocedure(
       'public.api_verify_storefront_payment(uuid,uuid,text,text,uuid)'
     ) is not null
     or to_regprocedure(
       'public.api_reject_storefront_payment(uuid,uuid,text,text,uuid)'
     ) is not null then
    raise exception 'Layer A unexpectedly created Staff Review actions';
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
    raise exception 'Layer A changed direct-write posture reserved for Layer B';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('f0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'review-viewer@example.test', now(), '{}', '{}', now(), now()),
  ('f0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'review-verifier@example.test', now(), '{}', '{}', now(), now()),
  ('f0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'review-customer@example.test', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, slug, status, currency_code)
values
  ('f1000000-0000-4000-8000-000000000001', 'Staff Review A', 'staff-review-a', 'ACTIVE', 'THB'),
  ('f1000000-0000-4000-8000-000000000002', 'Staff Review B', 'staff-review-b', 'ACTIVE', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Review Viewer', 'ACTIVE'),
  ('f2000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'Review Verifier', 'ACTIVE'),
  ('f2000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000003', 'Review Customer', 'ACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('f3000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'ACTIVE', true, now()),
  ('f3000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000002', 'ACTIVE', true, now()),
  ('f3000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000003', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status)
values
  ('f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'REVIEW_VIEW', 'Review View', 'ACTIVE'),
  ('f4000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'REVIEW_VERIFY', 'Review Verify', 'ACTIVE');

insert into public.role_permissions (role_id, permission_id)
select 'f4000000-0000-4000-8000-000000000001', id
from public.permissions where code = 'payment.view';

insert into public.role_permissions (role_id, permission_id)
select 'f4000000-0000-4000-8000-000000000002', id
from public.permissions where code in ('payment.view', 'payment.verify');

insert into public.membership_roles (membership_id, role_id)
values
  ('f3000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001'),
  ('f3000000-0000-4000-8000-000000000002', 'f4000000-0000-4000-8000-000000000002');

insert into public.organization_checkout_settings (
  organization_id, status, currency_code, reservation_minutes, payment_due_minutes
) values
  ('f1000000-0000-4000-8000-000000000001', 'ACTIVE', 'THB', 15, 15),
  ('f1000000-0000-4000-8000-000000000002', 'ACTIVE', 'THB', 15, 15);

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, valid_from
)
select organization_id, f.id, 'MANUAL_OVERRIDE', true, now() - interval '1 day'
from unnest(array[
  'f1000000-0000-4000-8000-000000000001'::uuid,
  'f1000000-0000-4000-8000-000000000002'::uuid
]) as organization_id
cross join public.features f
where f.code = 'storefront.checkout';

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  ('f5000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'REVIEW-A', 'Review A', 'ACTIVE'),
  ('f5000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'REVIEW-B', 'Review B', 'ACTIVE');

insert into public.orders (
  id, organization_id, customer_id, order_number, source, currency_code,
  order_status, payment_status, fulfillment_status, subtotal, grand_total,
  amount_paid, amount_due, payment_due_at
) values
  ('f6000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 'REVIEW-1', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('f6000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 'REVIEW-2', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 200, 200, 0, 200, now() + interval '15 minutes'),
  ('f6000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 'REVIEW-3', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 300, 300, 0, 300, now() - interval '1 minute'),
  ('f6000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000002', 'f5000000-0000-4000-8000-000000000002', 'REVIEW-B', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 400, 400, 0, 400, now() + interval '15 minutes');

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received, currency_code
) values
  ('f7000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000001', 'UNPAID', 100, 0, 'THB'),
  ('f7000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000002', 'UNPAID', 200, 0, 'THB'),
  ('f7000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000003', 'UNPAID', 300, 0, 'THB'),
  ('f7000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000002', 'f6000000-0000-4000-8000-000000000004', 'UNPAID', 400, 0, 'THB');

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, external_reference, status, created_by
) values
  ('f8000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000001', 'PAYMENT', 'BANK_TRANSFER', 100, 'THB', 'secret-self-001', 'PENDING', 'f2000000-0000-4000-8000-000000000002'),
  ('f8000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000002', 'PAYMENT', 'BANK_TRANSFER', 200, 'THB', ' secret-review-002 ', 'PENDING', 'f2000000-0000-4000-8000-000000000003'),
  ('f8000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000003', 'PAYMENT', 'BANK_TRANSFER', 300, 'THB', 'secret-expired-003', 'PENDING', 'f2000000-0000-4000-8000-000000000003'),
  ('f8000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000004', 'PAYMENT', 'BANK_TRANSFER', 400, 'THB', 'secret-tenant-b-004', 'PENDING', 'f2000000-0000-4000-8000-000000000003');

insert into public.payment_proofs (
  id, organization_id, payment_transaction_id, storage_path, mime_type,
  submitted_by_type, submitted_at, verification_status, metadata_json
) values
  ('f9000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000001', null, null, 'CUSTOMER', now() - interval '3 minutes', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'),
  ('f9000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000002', null, null, 'CUSTOMER', now() - interval '2 minutes', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'),
  ('f9000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000003', null, null, 'CUSTOMER', now() - interval '1 minute', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'),
  ('f9000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000002', 'f8000000-0000-4000-8000-000000000004', null, null, 'CUSTOMER', now() - interval '4 minutes', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}');

create temporary table staff_review_before (
  evidence_counts text not null
) on commit drop;

insert into staff_review_before
select concat_ws('|',
  (select count(*) from public.orders),
  (select count(*) from public.payments),
  (select count(*) from public.payment_transactions),
  (select count(*) from public.payment_proofs),
  (select count(*) from public.audit_logs),
  (select count(*) from public.commerce_idempotency_keys)
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_queue jsonb;
begin
  v_queue := public.api_list_storefront_payment_reviews(
    'f1000000-0000-4000-8000-000000000001', null, null, 50
  );

  if jsonb_array_length(v_queue -> 'items') <> 3
     or v_queue -> 'next_cursor' <> 'null'::jsonb
     or v_queue::text like '%secret-%'
     or v_queue::text like '%payment_reference%'
     or exists (
       select 1
       from jsonb_array_elements(v_queue -> 'items') item
       where item ->> 'can_review' <> 'false'
     ) then
    raise exception 'View-only queue contract failed: %', v_queue;
  end if;

  if public.api_get_storefront_payment_review(
       'f1000000-0000-4000-8000-000000000001',
       'f8000000-0000-4000-8000-000000000002'
     ) <> '{"available":false}'::jsonb then
    raise exception 'View-only detail unexpectedly exposed private reference';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);

do $$
declare
  v_first jsonb;
  v_second jsonb;
  v_detail jsonb;
  v_self jsonb;
  v_expired jsonb;
  v_cursor_time timestamptz;
  v_cursor_id uuid;
begin
  v_first := public.api_list_storefront_payment_reviews(
    'f1000000-0000-4000-8000-000000000001', null, null, 1
  );

  if jsonb_array_length(v_first -> 'items') <> 1
     or v_first #>> '{items,0,payment_transaction_id}' <>
       'f8000000-0000-4000-8000-000000000001'
     or v_first #>> '{items,0,can_review}' <> 'false'
     or v_first -> 'next_cursor' = 'null'::jsonb then
    raise exception 'First keyset page or self-review affordance failed: %', v_first;
  end if;

  v_cursor_time := (v_first #>> '{next_cursor,submitted_at}')::timestamptz;
  v_cursor_id := (v_first #>> '{next_cursor,payment_transaction_id}')::uuid;
  v_second := public.api_list_storefront_payment_reviews(
    'f1000000-0000-4000-8000-000000000001', v_cursor_time, v_cursor_id, 1
  );

  if v_second #>> '{items,0,payment_transaction_id}' <>
       'f8000000-0000-4000-8000-000000000002'
     or v_second #>> '{items,0,can_review}' <> 'true' then
    raise exception 'Second keyset page failed: %', v_second;
  end if;

  v_detail := public.api_get_storefront_payment_review(
    'f1000000-0000-4000-8000-000000000001',
    'f8000000-0000-4000-8000-000000000002'
  );
  v_self := public.api_get_storefront_payment_review(
    'f1000000-0000-4000-8000-000000000001',
    'f8000000-0000-4000-8000-000000000001'
  );
  v_expired := public.api_get_storefront_payment_review(
    'f1000000-0000-4000-8000-000000000001',
    'f8000000-0000-4000-8000-000000000003'
  );

  if v_detail ->> 'available' <> 'true'
     or v_detail ->> 'payment_reference' <> 'SECRET-REVIEW-002'
     or v_detail ->> 'review_eligible' <> 'true'
     or v_detail ? 'metadata_json'
     or v_detail ? 'storage_path'
     or v_detail ? 'customer_id'
     or v_self ->> 'self_review' <> 'true'
     or v_self ->> 'review_eligible' <> 'false'
     or v_expired ->> 'review_eligible' <> 'false' then
    raise exception 'Private detail allowlist/eligibility failed: %, %, %', v_detail, v_self, v_expired;
  end if;

  if public.api_get_storefront_payment_review(
       'f1000000-0000-4000-8000-000000000002',
       'f8000000-0000-4000-8000-000000000004'
     ) <> '{"available":false}'::jsonb
     or public.api_get_storefront_payment_review(
       'f1000000-0000-4000-8000-000000000001',
       'fa000000-0000-4000-8000-000000000001'
     ) <> '{"available":false}'::jsonb then
    raise exception 'Cross-tenant or missing detail enumerated data';
  end if;
end;
$$;

reset role;

update public.organization_entitlements entitlement
set enabled = false
from public.features feature
where entitlement.feature_id = feature.id
  and entitlement.organization_id = 'f1000000-0000-4000-8000-000000000001'
  and feature.code = 'storefront.checkout';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_queue jsonb;
  v_detail jsonb;
begin
  v_queue := public.api_list_storefront_payment_reviews(
    'f1000000-0000-4000-8000-000000000001', null, null, 50
  );
  v_detail := public.api_get_storefront_payment_review(
    'f1000000-0000-4000-8000-000000000001',
    'f8000000-0000-4000-8000-000000000002'
  );

  if exists (
       select 1 from jsonb_array_elements(v_queue -> 'items') item
       where item ->> 'can_review' <> 'false'
     )
     or v_detail ->> 'review_eligible' <> 'false' then
    raise exception 'Disabled entitlement left review eligibility enabled';
  end if;
end;
$$;

reset role;

update public.organization_entitlements entitlement
set enabled = true
from public.features feature
where entitlement.feature_id = feature.id
  and entitlement.organization_id = 'f1000000-0000-4000-8000-000000000001'
  and feature.code = 'storefront.checkout';

update public.profiles
set status = 'INACTIVE'
where id = 'f2000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_list_storefront_payment_reviews(
      'f1000000-0000-4000-8000-000000000001', null, null, 25
    );
    raise exception 'Inactive profile unexpectedly listed Staff Review queue';
  exception when others then
    if sqlerrm <> 'PERMISSION_DENIED' then raise; end if;
  end;

  if public.api_get_storefront_payment_review(
       'f1000000-0000-4000-8000-000000000001',
       'f8000000-0000-4000-8000-000000000002'
     ) <> '{"available":false}'::jsonb then
    raise exception 'Inactive profile unexpectedly enumerated Staff Review detail';
  end if;
end;
$$;

reset role;

update public.profiles
set status = 'ACTIVE'
where id = 'f2000000-0000-4000-8000-000000000002';

do $$
declare
  v_before text;
  v_after text;
begin
  select evidence_counts into v_before from staff_review_before;
  select concat_ws('|',
    (select count(*) from public.orders),
    (select count(*) from public.payments),
    (select count(*) from public.payment_transactions),
    (select count(*) from public.payment_proofs),
    (select count(*) from public.audit_logs),
    (select count(*) from public.commerce_idempotency_keys)
  ) into v_after;

  if v_before <> v_after then
    raise exception 'Staff Review reads mutated evidence: before %, after %', v_before, v_after;
  end if;
end;
$$;

select 'phase_1d_manual_payment_staff_review_reads' as suite, 'pass' as result;

rollback;
