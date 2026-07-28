\set ON_ERROR_STOP on

begin;

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30', 'Usage Meter Org', 'usage-meter-org', 'ACTIVE');

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_record_usage_meter(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
    'CUSTOMERS', 3, 'customers',
    '2026-07-01 00:00:00+00'::timestamptz,
    '2026-08-01 00:00:00+00'::timestamptz,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa301'::uuid,
    'CUSTOMER_SYNC', null
  );

  if v_result.used_quantity <> 3 or v_result.idempotency_reused or v_result.quota_status <> 'OK' then
    raise exception 'initial usage meter increment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare
  v_result record;
  v_count integer;
begin
  select * into v_result from public.api_record_usage_meter(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
    'CUSTOMERS', 3, 'customers',
    '2026-07-01 00:00:00+00'::timestamptz,
    '2026-08-01 00:00:00+00'::timestamptz,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa301'::uuid,
    'CUSTOMER_SYNC', null
  );

  set local role postgres;
  select count(*) into v_count
  from public.subscription_usage su
  join public.features f on f.id = su.feature_id
  where su.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid
    and f.code = 'CUSTOMERS'
    and su.used_quantity = 3;

  if not v_result.idempotency_reused or v_count <> 1 then
    raise exception 'usage meter idempotency failed';
  end if;

  set local role service_role;
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

do $$
begin
  begin
    perform public.api_record_usage_meter(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
      'SMS_MESSAGES', 1, 'messages',
      '2026-07-01 00:00:00+00'::timestamptz,
      '2026-08-01 00:00:00+00'::timestamptz,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa302'::uuid,
      'CAMPAIGN_DISPATCH', null
    );
    raise exception 'missing high-cost entitlement unexpectedly succeeded';
  exception when sqlstate '42501' then null;
  end;
end $$;

set local role postgres;

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, limit_value, valid_from
)
select
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
  id,
  'MANUAL_OVERRIDE',
  true,
  5,
  now()
from public.features
where code = 'SMS_MESSAGES';

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_record_usage_meter(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
    'SMS_MESSAGES', 3, 'messages',
    '2026-07-01 00:00:00+00'::timestamptz,
    '2026-08-01 00:00:00+00'::timestamptz,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa303'::uuid,
    'CAMPAIGN_DISPATCH', null
  );

  if v_result.used_quantity <> 3 or v_result.limit_value <> 5 or v_result.quota_status <> 'OK' then
    raise exception 'high-cost usage increment failed';
  end if;
end $$;

do $$
begin
  begin
    perform public.api_record_usage_meter(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
      'SMS_MESSAGES', 3, 'messages',
      '2026-07-01 00:00:00+00'::timestamptz,
      '2026-08-01 00:00:00+00'::timestamptz,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa304'::uuid,
      'CAMPAIGN_DISPATCH', null
    );
    raise exception 'high-cost quota exceed unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_record_usage_meter(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30'::uuid,
      'CUSTOMERS', 1, 'customers',
      '2026-07-01 00:00:00+00'::timestamptz,
      '2026-08-01 00:00:00+00'::timestamptz,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa305'::uuid,
      'CUSTOMER_SYNC', null
    );
    raise exception 'authenticated usage RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.subscription_usage set used_quantity = 999;
    raise exception 'direct subscription usage update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'usage_meter_boundary|pass';
rollback;
