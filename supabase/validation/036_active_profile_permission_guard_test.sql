\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa36',
  'authenticated',
  'authenticated',
  'active-profile-guard@example.test',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.organizations (id, name, slug, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
  'Active Profile Guard Org',
  'active-profile-guard-org',
  'ACTIVE'
);

insert into public.profiles (id, auth_user_id, display_name, status)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccc36',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa36',
  'Active Profile Guard User',
  'ACTIVE'
);

insert into public.organization_memberships (
  id,
  organization_id,
  profile_id,
  status,
  is_default,
  joined_at
) values (
  'dddddddd-dddd-dddd-dddd-dddddddddd36',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
  'cccccccc-cccc-cccc-cccc-cccccccccc36',
  'ACTIVE',
  true,
  now()
);

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values (
  '77777777-7777-7777-7777-777777777736',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
  'active_profile_guard_viewer',
  'Active Profile Guard Viewer',
  'ACTIVE',
  false
);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777736'::uuid, id
from public.permissions
where code = 'customer.view';

insert into public.membership_roles (membership_id, role_id)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddd36',
  '77777777-7777-7777-7777-777777777736'
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa36',
  true
);

do $$
begin
  if not public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36'::uuid,
    'customer.view'
  ) then
    raise exception 'active profile should retain customer.view';
  end if;

  if not public.is_org_member(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36'::uuid
  ) then
    raise exception 'active profile should remain an organization member';
  end if;
end
$$;

reset role;

update public.profiles
set status = 'INACTIVE'
where id = 'cccccccc-cccc-cccc-cccc-cccccccccc36'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa36',
  true
);

do $$
begin
  if public.current_profile_id() is not null then
    raise exception 'inactive profile must not resolve as current profile';
  end if;

  if public.is_org_member(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36'::uuid
  ) then
    raise exception 'inactive profile must not resolve as organization member';
  end if;

  if public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36'::uuid,
    'customer.view'
  ) then
    raise exception 'inactive profile must not retain customer.view';
  end if;
end
$$;

reset role;

select 'active_profile_permission_guard' as check_name, 'pass' as result;

rollback;
