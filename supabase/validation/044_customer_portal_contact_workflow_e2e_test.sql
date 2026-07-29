\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values (
  'a0000000-0000-4000-8000-000000000441', 'authenticated', 'authenticated',
  'before-workflow@example.test', now(), '{"provider":"email"}', '{}', now(), now()
);

insert into public.organizations (id, name, slug, status)
values ('b0000000-0000-4000-8000-000000000441', 'Portal Workflow Org', 'portal-workflow', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values (
  'c0000000-0000-4000-8000-000000000441',
  'a0000000-0000-4000-8000-000000000441',
  'Portal Workflow Profile',
  'ACTIVE'
);

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values (
  'd0000000-0000-4000-8000-000000000441',
  'b0000000-0000-4000-8000-000000000441',
  'c0000000-0000-4000-8000-000000000441',
  'ACTIVE',
  true,
  now()
);

insert into public.customers (
  id, organization_id, customer_code, display_name, email, email_normalized, status
) values (
  'e0000000-0000-4000-8000-000000000441',
  'b0000000-0000-4000-8000-000000000441',
  'PORTAL-E2E-001',
  'Portal Workflow Customer',
  null,
  null,
  'ACTIVE'
);

insert into public.customer_profile_links (
  id, organization_id, customer_id, profile_id, link_status, link_source,
  verification_method, verified_at
) values (
  'f0000000-0000-4000-8000-000000000441',
  'b0000000-0000-4000-8000-000000000441',
  'e0000000-0000-4000-8000-000000000441',
  'c0000000-0000-4000-8000-000000000441',
  'ACTIVE',
  'VERIFIED_SIGNUP',
  'fixture-auth-proof',
  now()
);

insert into public.customer_identities (
  id, organization_id, customer_id, provider, external_user_id, verification_status
) values (
  '71000000-0000-4000-8000-000000000441',
  'b0000000-0000-4000-8000-000000000441',
  'e0000000-0000-4000-8000-000000000441',
  'LINE',
  'portal-workflow-identity',
  'VERIFIED'
);

insert into public.customer_consents (
  id, organization_id, customer_id, channel, purpose, status, destination, source, granted_at
) values (
  '72000000-0000-4000-8000-000000000441',
  'b0000000-0000-4000-8000-000000000441',
  'e0000000-0000-4000-8000-000000000441',
  'EMAIL',
  'PROMOTION',
  'GRANTED',
  'consent-stays@example.test',
  'FIXTURE',
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000441', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.api_request_customer_contact_change(
  'b0000000-0000-4000-8000-000000000441',
  'EMAIL',
  'Verified.Workflow@Example.Test',
  '90000000-0000-4000-8000-000000000441'
);

reset role;

do $$
declare
  v_request_id uuid;
  v_verification jsonb;
  v_apply record;
  v_sync record;
  v_retry record;
  v_audit_text text;
begin
  select id into v_request_id
  from public.customer_contact_change_requests
  where organization_id = 'b0000000-0000-4000-8000-000000000441'
    and profile_id = 'c0000000-0000-4000-8000-000000000441';

  perform set_config('request.jwt.claim.role', 'service_role', true);

  v_verification := public.api_verify_customer_contact_change_request(
    'b0000000-0000-4000-8000-000000000441',
    v_request_id,
    'fixture-otp',
    '90000000-0000-4000-8000-000000000442'
  );
  if v_verification ->> 'status' <> 'VERIFIED' then
    raise exception 'request did not reach VERIFIED';
  end if;

  -- The real server boundary performs this Auth Admin update before the apply RPC.
  update auth.users
  set email = 'verified.workflow@example.test', updated_at = now()
  where id = 'a0000000-0000-4000-8000-000000000441';

  select * into v_apply
  from public.api_apply_customer_contact_change(
    'b0000000-0000-4000-8000-000000000441',
    v_request_id,
    'a0000000-0000-4000-8000-000000000441',
    '90000000-0000-4000-8000-000000000443'
  );
  if v_apply.status <> 'APPLIED' or v_apply.already_applied is not false then
    raise exception 'verified request did not reach APPLIED';
  end if;

  select * into v_sync
  from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000441',
    v_request_id,
    '90000000-0000-4000-8000-000000000444'
  );
  if v_sync.sync_result <> 'synced' or v_sync.reused_existing is not false then
    raise exception 'CRM contact was not synchronized';
  end if;

  select * into v_retry
  from public.api_sync_applied_customer_contact_to_crm(
    'b0000000-0000-4000-8000-000000000441',
    v_request_id,
    '90000000-0000-4000-8000-000000000444'
  );
  if v_retry.sync_result <> 'synced' or v_retry.reused_existing is not true then
    raise exception 'CRM synchronization retry was not idempotent';
  end if;

  if not exists (
    select 1 from public.customers
    where id = 'e0000000-0000-4000-8000-000000000441'
      and email = 'Verified.Workflow@Example.Test'
      and email_normalized = 'verified.workflow@example.test'
  ) then
    raise exception 'canonical customer contact pair is incorrect';
  end if;

  if not exists (
    select 1 from public.customer_contact_change_requests
    where id = v_request_id and status = 'APPLIED'
  ) then
    raise exception 'request lifecycle was not preserved';
  end if;

  if (select destination from public.customer_consents where id = '72000000-0000-4000-8000-000000000441')
      <> 'consent-stays@example.test'
  then
    raise exception 'consent was changed by contact workflow';
  end if;

  if (select external_user_id from public.customer_identities where id = '71000000-0000-4000-8000-000000000441')
      <> 'portal-workflow-identity'
  then
    raise exception 'customer identity was changed by contact workflow';
  end if;

  select string_agg(
    coalesce(before_json::text, '') || coalesce(after_json::text, '') || coalesce(reason, ''),
    ' '
  ) into v_audit_text
  from public.audit_logs
  where entity_id = v_request_id;

  if v_audit_text ~* 'verified[.]workflow@example[.]test' then
    raise exception 'raw contact leaked into workflow audit';
  end if;

  if not exists (
    select 1 from public.audit_logs
    where entity_id = v_request_id and action = 'CUSTOMER_CONTACT_CHANGE_REQUEST'
  ) or not exists (
    select 1 from public.audit_logs
    where entity_id = v_request_id and action = 'CUSTOMER_CONTACT_CHANGE_VERIFIED'
  ) or not exists (
    select 1 from public.audit_logs
    where entity_id = v_request_id and action = 'CUSTOMER_CONTACT_CHANGE_APPLIED'
  ) or not exists (
    select 1 from public.audit_logs
    where entity_id = v_request_id and action = 'CUSTOMER_CONTACT_CRM_SYNC'
  ) then
    raise exception 'workflow audit chain is incomplete';
  end if;
end $$;

select 'customer_portal_contact_workflow_e2e|pass';

rollback;
