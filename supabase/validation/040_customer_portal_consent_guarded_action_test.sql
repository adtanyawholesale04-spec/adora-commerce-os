\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa401', 'authenticated', 'authenticated', 'consent-a@example.test', now(), '{"provider":"email"}', '{}', now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa402', 'authenticated', 'authenticated', 'consent-b@example.test', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'Consent Org A', 'consent-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb43', 'Consent Org B', 'consent-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc92', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa401', 'Consent Profile A', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc93', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa402', 'Consent Profile B', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd67', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'cccccccc-cccc-cccc-cccc-cccccccccc92', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd68', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb43', 'cccccccc-cccc-cccc-cccc-cccccccccc93', 'ACTIVE', true, now());

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('88888888-8888-4888-8888-888888888903', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'CONSENT-CUST-001', 'Consent Customer A', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888904', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb43', 'CONSENT-CUST-002', 'Consent Customer B', 'ACTIVE');

set local role postgres;
insert into public.customer_profile_links (organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', '88888888-8888-4888-8888-888888888903', 'cccccccc-cccc-cccc-cccc-cccccccccc92', 'ACTIVE', 'VERIFIED_SIGNUP', 'fixture-auth-proof', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa401', true);

do $$
declare
  v_first jsonb;
  v_retry jsonb;
  v_consent_id uuid;
  v_event_count integer;
  v_audit_count integer;
begin
  v_first := public.api_update_customer_portal_consent(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid, 'EMAIL', 'PROMOTION', 'GRANTED', ' CONSENT-A@EXAMPLE.TEST ', 'v1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa401'::uuid
  );
  v_consent_id := (v_first ->> 'consent_id')::uuid;
  if v_consent_id is null or (v_first ->> 'status') <> 'GRANTED' or (v_first ->> 'message_dispatch_triggered') <> 'false' then raise exception 'consent grant failed'; end if;

  v_retry := public.api_update_customer_portal_consent(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid, 'EMAIL', 'PROMOTION', 'GRANTED', 'consent-a@example.test', 'v1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa401'::uuid
  );
  if (v_retry ->> 'reused_existing') <> 'true' or (v_retry ->> 'consent_id')::uuid <> v_consent_id then raise exception 'consent idempotency failed'; end if;

  perform public.api_update_customer_portal_consent(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid, 'EMAIL', 'PROMOTION', 'REVOKED', 'consent-a@example.test', 'v1', gen_random_uuid()
  );

  set local role postgres;
  select count(*) into v_event_count from public.customer_consent_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid and consent_id = v_consent_id;
  if v_event_count <> 2 then raise exception 'consent event count mismatch'; end if;
  select count(*) into v_audit_count from public.audit_logs where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid and entity_id = v_consent_id and action = 'CUSTOMER_PORTAL_CONSENT_UPDATE';
  if v_audit_count <> 2 then raise exception 'consent audit count mismatch'; end if;
end $$;

set local role authenticated;
do $$
begin
  begin
    perform public.api_update_customer_portal_consent('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb43'::uuid, 'EMAIL', 'PROMOTION', 'GRANTED', 'other@example.test', 'v1', gen_random_uuid());
    raise exception 'cross-tenant consent update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    select 1 from public.customer_consents limit 1;
    raise exception 'direct consent table read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  begin
    perform public.api_update_customer_portal_consent(gen_random_uuid(), 'EMAIL', 'PROMOTION', 'REVOKED', 'anon@example.test', null, gen_random_uuid());
    raise exception 'anon consent update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'customer_portal_consent_guarded_action|pass';
rollback;
