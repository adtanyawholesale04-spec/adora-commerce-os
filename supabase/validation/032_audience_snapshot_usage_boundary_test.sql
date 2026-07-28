\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa321', 'authenticated', 'authenticated', 'audience-snapshot@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32', 'Audience Snapshot Org', 'audience-snapshot-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc93', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa321', 'Audience Snapshot Actor', 'ACTIVE');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('88888888-8888-4888-8888-888888888893', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32', 'AUD-CUST-001', 'Audience Customer One', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888894', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32', 'AUD-CUST-002', 'Audience Customer Two', 'ACTIVE');

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_create_audience_snapshot(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc93'::uuid,
    null,
    'Manual Audience Snapshot',
    'MANUAL',
    null,
    null,
    '[{"customer_id":"88888888-8888-4888-8888-888888888893","eligibility_reason":{"source":"test"}},{"customer_id":"88888888-8888-4888-8888-888888888894"}]'::jsonb,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa322'::uuid
  );

  if v_result.snapshot_id is null
     or v_result.member_count <> 2
     or v_result.usage_id is null
     or v_result.usage_quota_status <> 'OK'
     or v_result.idempotency_reused then
    raise exception 'audience snapshot initial boundary failed';
  end if;
end $$;

do $$
declare
  v_result record;
  v_snapshot_count integer;
  v_member_count integer;
  v_usage_count integer;
begin
  select * into v_result from public.api_create_audience_snapshot(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc93'::uuid,
    null,
    'Manual Audience Snapshot',
    'MANUAL',
    null,
    null,
    '[{"customer_id":"88888888-8888-4888-8888-888888888893","eligibility_reason":{"source":"test"}},{"customer_id":"88888888-8888-4888-8888-888888888894"}]'::jsonb,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa322'::uuid
  );

  set local role postgres;
  select count(*) into v_snapshot_count
  from public.audience_snapshots
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32'::uuid;

  select count(*) into v_member_count
  from public.audience_snapshot_members
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32'::uuid;

  select count(*) into v_usage_count
  from public.subscription_usage su
  join public.features f on f.id = su.feature_id
  where su.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32'::uuid
    and f.code = 'AUDIENCE_SNAPSHOTS'
    and su.used_quantity = 1;

  if not v_result.idempotency_reused
     or v_snapshot_count <> 1
     or v_member_count <> 2
     or v_usage_count <> 1 then
    raise exception 'audience snapshot idempotency or atomic meter failed';
  end if;

  set local role service_role;
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_create_audience_snapshot(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb32'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccc93'::uuid,
      null,
      'Denied Snapshot',
      'MANUAL',
      null,
      null,
      '[]'::jsonb,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa323'::uuid
    );
    raise exception 'authenticated audience snapshot RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.audience_snapshots set name = 'direct write';
    raise exception 'direct audience snapshot update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'audience_snapshot_usage_boundary|pass';
rollback;
