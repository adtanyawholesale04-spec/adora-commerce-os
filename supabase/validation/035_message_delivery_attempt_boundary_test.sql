\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa351', 'authenticated', 'authenticated', 'delivery-attempt@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35', 'Delivery Attempt Org', 'delivery-attempt-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc96', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa351', 'Delivery Attempt Actor', 'ACTIVE');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values ('88888888-8888-4888-8888-888888888896', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35', 'DEL-CUST-001', 'Delivery Customer', 'ACTIVE');

insert into public.message_jobs (
  id, organization_id, customer_id, channel, purpose, destination,
  status, idempotency_key, created_at, updated_at
) values (
  '99999999-9999-4999-8999-999999999995',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35',
  '88888888-8888-4888-8888-888888888896',
  'EMAIL', 'CONTENT_UPDATE', 'customer@example.test', 'PENDING', 'del-job-001', now(), now()
);

set local role postgres;

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, limit_value, valid_from
)
select
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35'::uuid,
  id,
  'MANUAL_OVERRIDE',
  true,
  5,
  now()
from public.features
where code = 'EMAIL_MESSAGES';

insert into public.customer_consents (
  organization_id, customer_id, channel, purpose, status, destination, granted_at
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35',
  '88888888-8888-4888-8888-888888888896',
  'EMAIL', 'CONTENT_UPDATE', 'GRANTED', 'customer@example.test', now()
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

select * from public.api_reserve_message_job_usage(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35'::uuid,
  '99999999-9999-4999-8999-999999999995'::uuid,
  true,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa352'::uuid
);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_record_message_delivery_attempt(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35'::uuid,
    '99999999-9999-4999-8999-999999999995'::uuid,
    'fixture-email', 'FAILED', null, 'TEMP_PROVIDER', 'temporary provider failure',
    '{"fixture":true}'::jsonb,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa353'::uuid
  );

  if v_result.attempt_id is null
     or v_result.attempt_no <> 1
     or v_result.message_job_status <> 'FAILED'
     or v_result.idempotency_reused then
    raise exception 'delivery attempt initial boundary failed';
  end if;
end $$;

do $$
declare
  v_result record;
  v_attempt_count integer;
  v_job_status text;
begin
  select * into v_result from public.api_record_message_delivery_attempt(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35'::uuid,
    '99999999-9999-4999-8999-999999999995'::uuid,
    'fixture-email', 'FAILED', null, 'TEMP_PROVIDER', 'temporary provider failure',
    '{"fixture":true}'::jsonb,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa353'::uuid
  );

  set local role postgres;
  select count(*) into v_attempt_count
  from public.message_delivery_attempts
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35'::uuid
    and message_job_id = '99999999-9999-4999-8999-999999999995'::uuid;

  select status into v_job_status
  from public.message_jobs
  where id = '99999999-9999-4999-8999-999999999995'::uuid;

  if not v_result.idempotency_reused or v_attempt_count <> 1 or v_job_status <> 'FAILED' then
    raise exception 'delivery attempt idempotency failed';
  end if;

  set local role service_role;
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_record_message_delivery_attempt(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb35'::uuid,
      '99999999-9999-4999-8999-999999999995'::uuid,
      'fixture-email', 'FAILED', null, 'DENIED', 'denied', null,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa354'::uuid
    );
    raise exception 'authenticated delivery attempt RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.message_delivery_attempts set provider_error_message = 'direct write';
    raise exception 'direct delivery attempt update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'message_delivery_attempt_boundary|pass';
rollback;
