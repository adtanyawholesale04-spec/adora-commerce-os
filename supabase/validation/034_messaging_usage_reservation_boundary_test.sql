\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa341', 'authenticated', 'authenticated', 'messaging-reservation@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34', 'Messaging Reservation Org', 'messaging-reservation-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc95', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa341', 'Messaging Reservation Actor', 'ACTIVE');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values ('88888888-8888-4888-8888-888888888895', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34', 'MSG-CUST-001', 'Messaging Customer', 'ACTIVE');

insert into public.message_jobs (
  id, organization_id, customer_id, channel, purpose, destination,
  status, idempotency_key, created_at, updated_at
) values (
  '99999999-9999-4999-8999-999999999994',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34',
  '88888888-8888-4888-8888-888888888895',
  'SMS', 'PROMOTION', '+66800000001', 'PENDING', 'msg-job-001', now(), now()
);

set local role postgres;

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, limit_value, valid_from
)
select
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34'::uuid,
  id,
  'MANUAL_OVERRIDE',
  true,
  5,
  now()
from public.features
where code = 'SMS_MESSAGES';

insert into public.customer_consents (
  organization_id, customer_id, channel, purpose, status, destination, granted_at
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34',
  '88888888-8888-4888-8888-888888888895',
  'SMS', 'PROMOTION', 'GRANTED', '+66800000001', now()
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_reserve_message_job_usage(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34'::uuid,
    '99999999-9999-4999-8999-999999999994'::uuid,
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa342'::uuid
  );

  if v_result.status <> 'SENDING'
     or v_result.channel_usage_id is null
     or v_result.channel_quota_status <> 'OK'
     or v_result.reservation_reused then
    raise exception 'messaging reservation initial boundary failed';
  end if;
end $$;

do $$
declare
  v_result record;
  v_job_status text;
  v_usage numeric;
begin
  select * into v_result from public.api_reserve_message_job_usage(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34'::uuid,
    '99999999-9999-4999-8999-999999999994'::uuid,
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa342'::uuid
  );

  set local role postgres;
  select status into v_job_status from public.message_jobs
  where id = '99999999-9999-4999-8999-999999999994'::uuid;

  select su.used_quantity into v_usage
  from public.subscription_usage su
  join public.features f on f.id = su.feature_id
  where su.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34'::uuid
    and f.code = 'SMS_MESSAGES';

  if not v_result.reservation_reused or v_job_status <> 'SENDING' or v_usage <> 1 then
    raise exception 'messaging reservation idempotency or attempted spend failed';
  end if;

  set local role service_role;
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_reserve_message_job_usage(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb34'::uuid,
      '99999999-9999-4999-8999-999999999994'::uuid,
      true,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa343'::uuid
    );
    raise exception 'authenticated messaging reservation RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.message_jobs set status = 'FAILED';
    raise exception 'direct message job update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'messaging_usage_reservation_boundary|pass';
rollback;
