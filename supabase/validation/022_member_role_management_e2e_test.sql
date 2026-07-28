\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa221',
    'authenticated',
    'authenticated',
    'role-management-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa222',
    'authenticated',
    'authenticated',
    'role-management-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21',
  'Role Management E2E Org',
  'role-management-e2e-org',
  'ACTIVE'
);

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc21',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa221',
    'Role Management Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc22',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa222',
    'Role Management Target',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd21',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21',
    'cccccccc-cccc-cccc-cccc-cccccccccc21',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd22',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21',
    'cccccccc-cccc-cccc-cccc-cccccccccc22',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-4777-8777-777777777721',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21',
    'role_management_manager',
    'Role Management Manager',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777722',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21',
    'role_management_target',
    'Role Management Target',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777723',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21',
    'role_management_catalog',
    'Role Management Catalog',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777721'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777723'::uuid, id
from public.permissions
where code = 'product.view';

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd21',
    '77777777-7777-4777-8777-777777777721'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd22',
    '77777777-7777-4777-8777-777777777722'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa221', true);

do $$
declare
  v_assignment record;
begin
  select *
  into v_assignment
  from public.api_assign_member_role(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd22'::uuid,
    '77777777-7777-4777-8777-777777777723'::uuid,
    '99999999-9999-4999-8999-999999999921'::uuid,
    'role management e2e assignment'
  );

  if v_assignment.role_assigned is not true
     or v_assignment.already_assigned is not false
     or v_assignment.audit_log_id is null then
    raise exception 'role management assignment failed: %', row_to_json(v_assignment);
  end if;

end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa222', true);

do $$
begin
  if not public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21'::uuid,
    'product.view'
  ) then
    raise exception 'assigned target lacks role-derived product permission';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa221', true);

do $$
declare
  v_removal record;
begin
  select *
  into v_removal
  from public.api_remove_member_role(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd22'::uuid,
    '77777777-7777-4777-8777-777777777723'::uuid,
    '99999999-9999-4999-8999-999999999922'::uuid,
    'role management e2e removal'
  );

  if v_removal.role_removed is not true
     or v_removal.already_removed is not false
     or v_removal.remaining_role_count <> 1
     or v_removal.audit_log_id is null then
    raise exception 'role management removal failed: %', row_to_json(v_removal);
  end if;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from public.membership_roles
  where membership_id = 'dddddddd-dddd-dddd-dddd-dddddddddd22'::uuid
    and role_id = '77777777-7777-4777-8777-777777777723'::uuid;

  if v_count <> 0 then
    raise exception 'role management removal left assignment row: %', v_count;
  end if;

  select count(*)
  into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21'::uuid
    and entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddd22'::uuid
    and action in ('admin.member.role.assign', 'admin.member.role.remove');

  if v_count <> 2 then
    raise exception 'role management lifecycle audit count expected 2, got %', v_count;
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa222', true);

do $$
begin
  if public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21'::uuid,
    'product.view'
  ) then
    raise exception 'removed role-derived product permission still present';
  end if;
end $$;

reset role;

select 'member_role_management_e2e' as check_name, 'pass' as result;

rollback;
