\set ON_ERROR_STOP on

begin;

do $$
declare
  v_api oid := to_regprocedure(
    'public.api_submit_storefront_payment_proof(uuid,uuid,text,uuid)'
  );
  v_helper oid := to_regprocedure(
    'public.internal_storefront_payment_proof_response(uuid,uuid,boolean)'
  );
begin
  if v_api is null or v_helper is null then
    raise exception 'manual payment submission functions are missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_api
      and p.prosecdef
      and 'search_path=""' = any(p.proconfig)
  ) then
    raise exception 'submission API is not hardened SECURITY DEFINER';
  end if;

  if not has_function_privilege('authenticated', v_api, 'EXECUTE')
     or has_function_privilege('anon', v_api, 'EXECUTE')
     or has_function_privilege('service_role', v_api, 'EXECUTE')
     or has_function_privilege('anon', v_helper, 'EXECUTE')
     or has_function_privilege('authenticated', v_helper, 'EXECUTE')
     or has_function_privilege('service_role', v_helper, 'EXECUTE') then
    raise exception 'manual payment submission grants are incorrect';
  end if;

end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values (
  'f0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'manual-payment-submit@example.test',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.organizations (id, name, slug, status, currency_code)
values
  ('f1000000-0000-4000-8000-000000000001', 'Payment Submit A', 'payment-submit-a', 'ACTIVE', 'THB'),
  ('f1000000-0000-4000-8000-000000000002', 'Payment Submit B', 'payment-submit-b', 'ACTIVE', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values (
  'f2000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000001',
  'Payment Submit Customer',
  'ACTIVE'
);

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values (
  'f3000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'ACTIVE',
  true,
  now()
);

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  ('f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'PAY-SUBMIT-OWNER', 'Payment Owner', 'ACTIVE'),
  ('f4000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'PAY-SUBMIT-OTHER', 'Other Customer', 'ACTIVE'),
  ('f4000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000002', 'PAY-SUBMIT-TENANT-B', 'Tenant B Customer', 'ACTIVE');

insert into public.customer_profile_links (
  id, organization_id, customer_id, profile_id, link_status, link_source,
  verification_method, verified_at
) values (
  'f5000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'ACTIVE',
  'VERIFIED_SIGNUP',
  'EMAIL_OTP',
  now()
);

insert into public.organization_storefronts (
  id, organization_id, publication_status, tagline, published_at, published_by
) values (
  'f6000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'PUBLISHED',
  'Payment Submit',
  now(),
  'f2000000-0000-4000-8000-000000000001'
);

insert into public.organization_checkout_settings (
  organization_id, status, currency_code, reservation_minutes, payment_due_minutes
) values (
  'f1000000-0000-4000-8000-000000000001',
  'ACTIVE',
  'THB',
  15,
  15
);

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, valid_from
)
select
  'f1000000-0000-4000-8000-000000000001',
  id,
  'MANUAL_OVERRIDE',
  true,
  now() - interval '1 day'
from public.features
where code = 'storefront.checkout';

insert into public.orders (
  id, organization_id, customer_id, order_number, source, currency_code,
  order_status, payment_status, fulfillment_status, subtotal, grand_total,
  amount_paid, amount_due, payment_due_at
) values
  ('f7000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'PAY-SUBMIT-1', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('f7000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'PAY-SUBMIT-2', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('f7000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'PAY-SUBMIT-3', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('f7000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000002', 'PAY-SUBMIT-4', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes'),
  ('f7000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'PAY-SUBMIT-5', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() - interval '1 minute'),
  ('f7000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000002', 'f4000000-0000-4000-8000-000000000003', 'PAY-SUBMIT-6', 'STOREFRONT', 'THB', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 0, 100, now() + interval '15 minutes');

insert into public.payments (
  id, organization_id, order_id, status, amount_expected, amount_received, currency_code
) values
  ('f8000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000001', 'UNPAID', 100, 0, 'THB'),
  ('f8000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000002', 'UNPAID', 100, 0, 'THB'),
  ('f8000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000003', 'UNPAID', 100, 0, 'THB'),
  ('f8000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000004', 'UNPAID', 100, 0, 'THB'),
  ('f8000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000005', 'UNPAID', 100, 0, 'THB'),
  ('f8000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000006', 'UNPAID', 100, 0, 'THB');

insert into public.payment_transactions (
  id, organization_id, payment_id, transaction_type, payment_method,
  amount, currency_code, external_reference, status
) values (
  'f9000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000001',
  'f8000000-0000-4000-8000-000000000003',
  'PAYMENT',
  'BANK_TRANSFER',
  100,
  'THB',
  'EXISTING-PENDING-003',
  'PENDING'
);

insert into public.payment_proofs (
  organization_id, payment_transaction_id, storage_path, mime_type,
  submitted_by_type, verification_status
) values (
  'f1000000-0000-4000-8000-000000000001',
  'f9000000-0000-4000-8000-000000000003',
  'private/existing-pending-003.png',
  'image/png',
  'CUSTOMER',
  'PENDING'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_result jsonb;
  v_retry jsonb;
  v_transaction_id uuid;
begin
  v_result := public.api_submit_storefront_payment_proof(
    'f1000000-0000-4000-8000-000000000001',
    'f7000000-0000-4000-8000-000000000001',
    '  abc-123/xy_9  ',
    'fa000000-0000-4000-8000-000000000001'
  );
  v_transaction_id := (v_result ->> 'payment_transaction_id')::uuid;

  if v_result ->> 'transaction_status' <> 'PENDING'
     or v_result ->> 'proof_status' <> 'PENDING'
     or v_result ->> 'evidence_type' <> 'REFERENCE_ONLY'
     or (v_result ->> 'idempotency_reused')::boolean
     or v_result::text like '%ABC-123/XY_9%' then
    raise exception 'payment submission response is incorrect or leaks reference: %', v_result;
  end if;

  v_retry := public.api_submit_storefront_payment_proof(
    'f1000000-0000-4000-8000-000000000001',
    'f7000000-0000-4000-8000-000000000001',
    'abc-123/xy_9',
    'fa000000-0000-4000-8000-000000000001'
  );

  if not (v_retry ->> 'idempotency_reused')::boolean
     or v_retry ->> 'payment_transaction_id' <> v_transaction_id::text then
    raise exception 'payment submission retry is not deterministic: %', v_retry;
  end if;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000001',
      'DIFFERENT-REFERENCE',
      'fa000000-0000-4000-8000-000000000001'
    );
    raise exception 'idempotency conflict unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000002',
      'ABC-123/XY_9',
      'fa000000-0000-4000-8000-000000000002'
    );
    raise exception 'duplicate reference unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'PAYMENT_REFERENCE_CONFLICT' then raise; end if;
  end;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000003',
      'NEW-REFERENCE-003',
      'fa000000-0000-4000-8000-000000000003'
    );
    raise exception 'second pending attempt unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'PAYMENT_ATTEMPT_PENDING' then raise; end if;
  end;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000004',
      'OTHER-CUSTOMER-004',
      'fa000000-0000-4000-8000-000000000004'
    );
    raise exception 'other customer order unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'ORDER_NOT_PAYABLE' then raise; end if;
  end;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000005',
      'EXPIRED-REFERENCE-005',
      'fa000000-0000-4000-8000-000000000005'
    );
    raise exception 'expired order unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'PAYMENT_EXPIRED' then raise; end if;
  end;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000006',
      'CROSS-TENANT-006',
      'fa000000-0000-4000-8000-000000000006'
    );
    raise exception 'cross-tenant order unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'ORDER_NOT_PAYABLE' then raise; end if;
  end;

  begin
    perform public.api_submit_storefront_payment_proof(
      'f1000000-0000-4000-8000-000000000001',
      'f7000000-0000-4000-8000-000000000002',
      'bad reference!',
      'fa000000-0000-4000-8000-000000000007'
    );
    raise exception 'invalid reference unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm <> 'PAYMENT_REFERENCE_INVALID' then raise; end if;
  end;

  begin
    insert into public.payment_transactions (
      organization_id, payment_id, transaction_type, payment_method,
      amount, currency_code, external_reference, status
    ) values (
      'f1000000-0000-4000-8000-000000000001',
      'f8000000-0000-4000-8000-000000000002',
      'PAYMENT',
      'BANK_TRANSFER',
      100,
      'THB',
      'DIRECT-WRITE-DENIED',
      'PENDING'
    );
    raise exception 'direct payment transaction write unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
declare
  v_transaction_id uuid;
  v_proof_id uuid;
begin
  select pt.id
  into strict v_transaction_id
  from public.payment_transactions pt
  where pt.organization_id = 'f1000000-0000-4000-8000-000000000001'
    and pt.payment_id = 'f8000000-0000-4000-8000-000000000001';

  select pp.id
  into strict v_proof_id
  from public.payment_proofs pp
  where pp.organization_id = 'f1000000-0000-4000-8000-000000000001'
    and pp.payment_transaction_id = v_transaction_id;

  if not exists (
    select 1
    from public.payment_transactions pt
    where pt.id = v_transaction_id
      and pt.external_reference = 'ABC-123/XY_9'
      and pt.transaction_type = 'PAYMENT'
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.amount = 100
      and pt.currency_code = 'THB'
      and pt.status = 'PENDING'
      and pt.created_by = 'f2000000-0000-4000-8000-000000000001'
  ) or not exists (
    select 1
    from public.payment_proofs pp
    where pp.id = v_proof_id
      and pp.storage_path is null
      and pp.mime_type is null
      and pp.submitted_by_type = 'CUSTOMER'
      and pp.verification_status = 'PENDING'
      and pp.metadata_json = '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'::jsonb
  ) then
    raise exception 'canonical transaction or reference-only proof is incorrect';
  end if;

  if (
    select count(*)
    from public.audit_logs a
    where a.organization_id = 'f1000000-0000-4000-8000-000000000001'
      and a.action = 'PAYMENT_PROOF_SUBMITTED'
      and a.entity_id = v_transaction_id
  ) <> 1 then
    raise exception 'submission audit cardinality is incorrect';
  end if;

  if exists (
    select 1
    from public.audit_logs a
    where a.organization_id = 'f1000000-0000-4000-8000-000000000001'
      and a.action = 'PAYMENT_PROOF_SUBMITTED'
      and (coalesce(a.before_json::text, '') || coalesce(a.after_json::text, '') || coalesce(a.reason, ''))
        like '%ABC-123/XY_9%'
  ) then
    raise exception 'payment reference leaked into audit';
  end if;

  if (select count(*) from public.payment_transactions where payment_id = 'f8000000-0000-4000-8000-000000000001') <> 1
     or (select count(*) from public.payment_proofs where payment_transaction_id = v_transaction_id) <> 1
     or (select count(*) from public.commerce_idempotency_keys where operation = 'PAYMENT_PROOF_SUBMIT' and request_id = 'fa000000-0000-4000-8000-000000000001' and state = 'SUCCEEDED') <> 1
     or not exists (
       select 1 from public.orders
       where id = 'f7000000-0000-4000-8000-000000000001'
         and order_status = 'PENDING_CONFIRMATION'
         and payment_status = 'UNPAID'
         and fulfillment_status = 'UNFULFILLED'
         and amount_paid = 0
         and amount_due = 100
     )
     or not exists (
       select 1 from public.payments
       where id = 'f8000000-0000-4000-8000-000000000001'
         and status = 'UNPAID'
         and amount_received = 0
     ) then
    raise exception 'submission changed canonical payment or order state';
  end if;
end;
$$;

select 'phase_1d_manual_payment_customer_submission|pass';

rollback;
