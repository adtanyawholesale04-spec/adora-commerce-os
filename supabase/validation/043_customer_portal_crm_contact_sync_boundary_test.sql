\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000431', 'authenticated', 'authenticated', 'crm-a@example.test', now(), '{"provider":"email"}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000432', 'authenticated', 'authenticated', 'crm-b@example.test', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('b0000000-0000-4000-8000-000000000431', 'CRM Sync Org A', 'crm-sync-a', 'ACTIVE'),
  ('b0000000-0000-4000-8000-000000000432', 'CRM Sync Org B', 'crm-sync-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('c0000000-0000-4000-8000-000000000431', 'a0000000-0000-4000-8000-000000000431', 'CRM Profile A', 'ACTIVE'),
  ('c0000000-0000-4000-8000-000000000432', 'a0000000-0000-4000-8000-000000000432', 'CRM Profile B', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('d0000000-0000-4000-8000-000000000431', 'b0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'ACTIVE', true, now()),
  ('d0000000-0000-4000-8000-000000000432', 'b0000000-0000-4000-8000-000000000432', 'c0000000-0000-4000-8000-000000000432', 'ACTIVE', true, now());

insert into public.customers (
  id, organization_id, customer_code, display_name, email, email_normalized, phone, phone_normalized, status
) values
  ('e0000000-0000-4000-8000-000000000431', 'b0000000-0000-4000-8000-000000000431', 'CRM-EMPTY', 'Empty Contact', null, null, null, null, 'ACTIVE'),
  ('e0000000-0000-4000-8000-000000000432', 'b0000000-0000-4000-8000-000000000431', 'CRM-RESERVED', 'Reserved Contact', null, null, null, null, 'ACTIVE'),
  ('e0000000-0000-4000-8000-000000000433', 'b0000000-0000-4000-8000-000000000431', 'CRM-CONFLICT', 'Conflicting Contact', 'merchant@example.test', 'merchant@example.test', null, null, 'ACTIVE'),
  ('e0000000-0000-4000-8000-000000000434', 'b0000000-0000-4000-8000-000000000431', 'CRM-DUPLICATE', 'Duplicate Owner', 'duplicate@example.test', 'duplicate@example.test', null, null, 'ACTIVE'),
  ('e0000000-0000-4000-8000-000000000435', 'b0000000-0000-4000-8000-000000000431', 'CRM-INACTIVE', 'Inactive Contact', null, null, null, null, 'ARCHIVED'),
  ('e0000000-0000-4000-8000-000000000436', 'b0000000-0000-4000-8000-000000000432', 'CRM-OTHER-TENANT', 'Other Tenant', null, null, null, null, 'ACTIVE');

insert into public.customer_profile_links (
  organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at
) values
  ('b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'ACTIVE', 'VERIFIED_SIGNUP', 'fixture', now()),
  ('b0000000-0000-4000-8000-000000000432', 'e0000000-0000-4000-8000-000000000436', 'c0000000-0000-4000-8000-000000000432', 'ACTIVE', 'VERIFIED_SIGNUP', 'fixture', now());

insert into public.customer_identities (
  id, organization_id, customer_id, provider, external_user_id, verification_status
) values (
  '71000000-0000-4000-8000-000000000431',
  'b0000000-0000-4000-8000-000000000431',
  'e0000000-0000-4000-8000-000000000431',
  'LINE',
  'crm-sync-identity',
  'VERIFIED'
);

insert into public.customer_consents (
  id, organization_id, customer_id, channel, purpose, status, destination, source, granted_at
) values (
  '72000000-0000-4000-8000-000000000431',
  'b0000000-0000-4000-8000-000000000431',
  'e0000000-0000-4000-8000-000000000431',
  'EMAIL',
  'PROMOTION',
  'GRANTED',
  'original-consent@example.test',
  'FIXTURE',
  now()
);

insert into public.customer_suppressions (
  id, organization_id, customer_id, channel, purpose, destination, suppression_type, source
) values (
  '73000000-0000-4000-8000-000000000431',
  'b0000000-0000-4000-8000-000000000431',
  'e0000000-0000-4000-8000-000000000431',
  'EMAIL',
  'PROMOTION',
  'suppressed@example.test',
  'MANUAL_SUPPRESS',
  'FIXTURE'
);

insert into public.customer_contact_change_requests (
  id, organization_id, customer_id, profile_id, contact_type, requested_value,
  normalized_value, status, expires_at, verified_at, applied_at
) values
  ('f0000000-0000-4000-8000-000000000431', 'b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'EMAIL', 'Fill@Example.Test', 'fill@example.test', 'APPLIED', now() + interval '1 hour', now(), now()),
  ('f0000000-0000-4000-8000-000000000432', 'b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'EMAIL', 'MATCH@example.test', 'match@example.test', 'APPLIED', now() + interval '1 hour', now(), now()),
  ('f0000000-0000-4000-8000-000000000433', 'b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'EMAIL', 'new@example.test', 'new@example.test', 'APPLIED', now() + interval '1 hour', now(), now()),
  ('f0000000-0000-4000-8000-000000000434', 'b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'EMAIL', 'duplicate@example.test', 'duplicate@example.test', 'APPLIED', now() + interval '1 hour', now(), now()),
  ('f0000000-0000-4000-8000-000000000435', 'b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'PHONE', '+66811111111', '+66811111111', 'APPLIED', now() + interval '1 hour', now(), now()),
  ('f0000000-0000-4000-8000-000000000436', 'b0000000-0000-4000-8000-000000000431', 'e0000000-0000-4000-8000-000000000431', 'c0000000-0000-4000-8000-000000000431', 'PHONE', '+66822222222', '+66822222222', 'VERIFIED', now() + interval '1 hour', now(), null);

set local role postgres;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
  v_retry record;
  v_email text;
  v_normalized text;
  v_raw_audit text;
begin
  if not has_function_privilege(
    'service_role',
    'public.api_sync_applied_customer_contact_to_crm(uuid,uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'service role execute grant missing';
  end if;

  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000431',
    '90000000-0000-4000-8000-000000000431'
  );
  if v_result.sync_result <> 'synced' then raise exception 'empty field was not synced'; end if;

  select email, email_normalized into v_email, v_normalized
  from public.customers where id = 'e0000000-0000-4000-8000-000000000431';
  if v_email <> 'Fill@Example.Test' or v_normalized <> 'fill@example.test' then
    raise exception 'raw and normalized fields were not updated atomically';
  end if;

  select * into v_retry from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000431',
    '90000000-0000-4000-8000-000000000431'
  );
  if v_retry.sync_result <> 'synced' or v_retry.reused_existing is not true then
    raise exception 'client request retry was not idempotent';
  end if;

  update public.customers
  set email = 'match@example.test', email_normalized = 'match@example.test'
  where id = 'e0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000432', gen_random_uuid()
  );
  if v_result.sync_result <> 'already_matching' then raise exception 'matching value was not idempotent'; end if;

  update public.customers
  set email = 'merchant@example.test', email_normalized = 'merchant@example.test'
  where id = 'e0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000433', gen_random_uuid()
  );
  if v_result.sync_result <> 'crm_contact_conflict' then raise exception 'existing CRM value was overwritten'; end if;

  update public.customers set email = null, email_normalized = null
  where id = 'e0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000434', gen_random_uuid()
  );
  if v_result.sync_result <> 'crm_duplicate_contact_conflict' then raise exception 'duplicate was not denied'; end if;

  update public.customers set status = 'ARCHIVED'
  where id = 'e0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000435', gen_random_uuid()
  );
  if v_result.sync_result <> 'customer_not_active' then raise exception 'inactive customer was not denied'; end if;

  update public.customers set status = 'BLOCKED'
  where id = 'e0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000435', gen_random_uuid()
  );
  if v_result.sync_result <> 'customer_not_active' then raise exception 'blocked customer was not denied'; end if;

  update public.customers
  set status = 'MERGED', merged_into_customer_id = 'e0000000-0000-4000-8000-000000000432'
  where id = 'e0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000435', gen_random_uuid()
  );
  if v_result.sync_result <> 'customer_not_active' then raise exception 'merged customer was not denied'; end if;

  update public.customers set status = 'ACTIVE'
    , merged_into_customer_id = null
  where id = 'e0000000-0000-4000-8000-000000000431';

  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000436', gen_random_uuid()
  );
  if v_result.sync_result <> 'contact_request_not_applied' then raise exception 'non-applied request was not denied'; end if;

  update public.customer_profile_links set link_status = 'REVOKED', revoked_at = now()
  where organization_id = 'b0000000-0000-4000-8000-000000000431'
    and profile_id = 'c0000000-0000-4000-8000-000000000431';
  select * into v_result from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000431', 'f0000000-0000-4000-8000-000000000432', gen_random_uuid()
  );
  if v_result.sync_result <> 'customer_link_not_active' then raise exception 'inactive link was not denied'; end if;

  select after_json::text into v_raw_audit
  from public.audit_logs
  where action = 'CUSTOMER_CONTACT_CRM_SYNC'
  order by created_at desc limit 1;
  if v_raw_audit ~* 'fill@example|66822222222' then raise exception 'raw contact leaked into audit'; end if;

  if (select count(*) from public.customer_identities where id = '71000000-0000-4000-8000-000000000431') <> 1
    or (select external_user_id from public.customer_identities where id = '71000000-0000-4000-8000-000000000431') <> 'crm-sync-identity'
  then raise exception 'customer identity changed during CRM sync'; end if;

  if (select count(*) from public.customer_consents where id = '72000000-0000-4000-8000-000000000431') <> 1
    or (select destination from public.customer_consents where id = '72000000-0000-4000-8000-000000000431') <> 'original-consent@example.test'
  then raise exception 'consent changed during CRM sync'; end if;

  if (select count(*) from public.customer_suppressions where id = '73000000-0000-4000-8000-000000000431') <> 1
    or (select destination from public.customer_suppressions where id = '73000000-0000-4000-8000-000000000431') <> 'suppressed@example.test'
  then raise exception 'suppression changed during CRM sync'; end if;
end $$;

do $$
begin
  begin
    perform public.api_sync_applied_customer_contact_to_crm(
      'b0000000-0000-4000-8000-000000000432',
      'f0000000-0000-4000-8000-000000000431',
      gen_random_uuid()
    );
    raise exception 'cross-tenant request unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
do $$
begin
  begin
    perform public.api_sync_applied_customer_contact_to_crm(
      'b0000000-0000-4000-8000-000000000431',
      'f0000000-0000-4000-8000-000000000431',
      gen_random_uuid()
    );
    raise exception 'authenticated execution unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  begin
    perform public.api_sync_applied_customer_contact_to_crm(
      'b0000000-0000-4000-8000-000000000431',
      'f0000000-0000-4000-8000-000000000431',
      gen_random_uuid()
    );
    raise exception 'anonymous execution unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'customer_portal_crm_contact_sync_boundary|pass';

rollback;
