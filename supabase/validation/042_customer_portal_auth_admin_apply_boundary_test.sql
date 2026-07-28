\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa421', 'authenticated', 'authenticated', 'auth-apply@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'Auth Apply Org', 'auth-apply-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc42', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa421', 'Auth Apply Customer', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values ('dddddddd-dddd-dddd-dddd-dddddddddd42', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'cccccccc-cccc-cccc-cccc-cccccccccc42', 'ACTIVE', true, now());

insert into public.customers (id, organization_id, customer_code, display_name, status)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee42', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'AUTH-APPLY-001', 'Auth Apply Customer', 'ACTIVE');

insert into public.customer_contact_change_requests (
  id, organization_id, customer_id, profile_id, contact_type, requested_value, normalized_value, status, expires_at, verification_method, verified_at
) values (
  'ffffffff-ffff-4fff-8fff-fffffffff421', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee42',
  'cccccccc-cccc-cccc-cccc-cccccccccc42', 'EMAIL', 'new-auth-apply@example.test', 'new-auth-apply@example.test', 'VERIFIED', now() + interval '1 hour', 'otp', now()
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_applied record;
  v_retry record;
  v_failure record;
begin
  select * into v_applied
  from public.api_apply_customer_contact_change(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid,
    'ffffffff-ffff-4fff-8fff-fffffffff421'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa421'::uuid,
    '99999999-9999-4999-8999-999999999421'::uuid
  );

  if v_applied.status <> 'APPLIED' or v_applied.already_applied is not false then
    raise exception 'verified request was not applied';
  end if;

  select * into v_retry
  from public.api_apply_customer_contact_change(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid,
    'ffffffff-ffff-4fff-8fff-fffffffff421'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa421'::uuid,
    '99999999-9999-4999-8999-999999999422'::uuid
  );

  if v_retry.status <> 'APPLIED' or v_retry.already_applied is not true then
    raise exception 'applied retry was not idempotent';
  end if;

  select * into v_failure
  from public.api_record_customer_contact_change_apply_failure(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid,
    'ffffffff-ffff-4fff-8fff-fffffffff421'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa421'::uuid,
    'auth_admin_update_failed',
    '99999999-9999-4999-8999-999999999423'::uuid
  );

  if v_failure.recorded is not true or v_failure.status <> 'APPLIED' then
    raise exception 'apply failure audit was not recorded';
  end if;
end $$;

do $$
begin
  begin
    perform public.api_apply_customer_contact_change(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb42'::uuid,
      'ffffffff-ffff-4fff-8fff-fffffffff421'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa422'::uuid,
      gen_random_uuid()
    );
    raise exception 'mismatched auth user unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'customer_portal_auth_admin_apply|pass';

rollback;
