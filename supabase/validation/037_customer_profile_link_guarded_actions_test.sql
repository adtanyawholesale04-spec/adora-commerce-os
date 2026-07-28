\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa371', 'authenticated', 'authenticated', 'link-manager@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa372', 'authenticated', 'authenticated', 'link-target@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'Link Action Org A', 'link-action-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb39', 'Link Action Org B', 'link-action-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc98', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa371', 'Link Manager', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc99', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa372', 'Link Target', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd63', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'cccccccc-cccc-cccc-cccc-cccccccccc98', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd64', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'cccccccc-cccc-cccc-cccc-cccccccccc99', 'ACTIVE', false, now());

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values ('77777777-7777-7777-7777-777777777773', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'link_manager', 'Link Manager', 'ACTIVE', false);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777773'::uuid, id
from public.permissions
where code = 'customer.edit';

insert into public.membership_roles (membership_id, role_id)
values ('dddddddd-dddd-dddd-dddd-dddddddddd63', '77777777-7777-7777-7777-777777777773');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values ('88888888-8888-4888-8888-888888888899', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'LINK-CUST-001', 'Link Customer', 'ACTIVE');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa371', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_request_customer_profile_link(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
    '88888888-8888-4888-8888-888888888899'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc99'::uuid,
    '99999999-9999-9999-9999-999999999971'::uuid,
    'Owner verified customer onboarding'
  );

  if v_result.link_id is null or v_result.link_status <> 'PENDING' or v_result.reused_existing then
    raise exception 'customer profile link request failed';
  end if;

  select * into v_result from public.api_request_customer_profile_link(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
    '88888888-8888-4888-8888-888888888899'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc99'::uuid,
    '99999999-9999-9999-9999-999999999972'::uuid,
    'Duplicate owner review'
  );

  if not v_result.reused_existing or v_result.link_status <> 'PENDING' then
    raise exception 'customer profile link duplicate reuse failed';
  end if;

  begin
    perform public.api_request_customer_profile_link(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb39'::uuid,
      '88888888-8888-4888-8888-888888888899'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccc99'::uuid,
      '99999999-9999-9999-9999-999999999973'::uuid,
      'Cross tenant request'
    );
    raise exception 'cross-tenant link request unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_link_id uuid;
  v_result record;
begin
  select id into v_link_id
  from public.customer_profile_links
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid
    and customer_id = '88888888-8888-4888-8888-888888888899'::uuid
    and profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc99'::uuid
    and link_status = 'PENDING';

  select * into v_result from public.api_activate_customer_profile_link(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
    v_link_id,
    'verified-owner-workflow',
    '99999999-9999-9999-9999-999999999974'::uuid
  );

  if v_result.link_id <> v_link_id or v_result.link_status <> 'ACTIVE' or v_result.idempotency_reused then
    raise exception 'customer profile link activation failed';
  end if;

  select * into v_result from public.api_activate_customer_profile_link(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
    v_link_id,
    'verified-owner-workflow',
    '99999999-9999-9999-9999-999999999974'::uuid
  );

  if not v_result.idempotency_reused or v_result.link_status <> 'ACTIVE' then
    raise exception 'customer profile link activation idempotency failed';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_link_id uuid;
  v_result record;
begin
  set local role postgres;
  select id into v_link_id
  from public.customer_profile_links
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid
    and link_status = 'ACTIVE';

  set local role authenticated;
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  begin
    perform public.api_activate_customer_profile_link(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
      v_link_id,
      'browser-forged-proof',
      '99999999-9999-9999-9999-999999999975'::uuid
    );
    raise exception 'authenticated activation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  select * into v_result from public.api_revoke_customer_profile_link(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
    v_link_id,
    '99999999-9999-9999-9999-999999999976'::uuid,
    'Owner revoked test link'
  );

  if v_result.link_id <> v_link_id or v_result.link_status <> 'REVOKED' or v_result.idempotency_reused then
    raise exception 'customer profile link revoke failed';
  end if;
end $$;

select 'customer_profile_link_guarded_actions|pass';
rollback;
