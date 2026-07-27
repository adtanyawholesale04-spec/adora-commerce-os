\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa201',
    'authenticated',
    'authenticated',
    'role-assign-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa202',
    'authenticated',
    'authenticated',
    'role-assign-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa203',
    'authenticated',
    'authenticated',
    'role-assign-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa204',
    'authenticated',
    'authenticated',
    'role-assign-inactive-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'Role Assignment Org A', 'role-assignment-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Role Assignment Org B', 'role-assignment-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa201', 'Role Assignment Manager', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa202', 'Role Assignment Target', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa203', 'Role Assignment Limited', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa204', 'Role Assignment Inactive Target', 'ACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 'SUSPENDED', false, null);

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  ('77777777-7777-4777-8777-777777777701', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'role_assignment_manager', 'Role Assignment Manager', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777702', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'role_assignment_limited', 'Role Assignment Limited', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777703', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'role_assignment_target', 'Role Assignment Target', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777704', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'role_assignment_other_org', 'Role Assignment Other Org', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777705', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'role_assignment_inactive', 'Role Assignment Inactive', 'INACTIVE', false),
  ('77777777-7777-4777-8777-777777777706', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'role_assignment_system', 'Role Assignment System', 'ACTIVE', true);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777701'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777702'::uuid, id
from public.permissions
where code in ('members.view');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777703'::uuid, id
from public.permissions
where code in ('product.view');

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', '77777777-7777-4777-8777-777777777701'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd03', '77777777-7777-4777-8777-777777777702');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa201', true);

do $$
declare
  v_first record;
  v_second record;
begin
  select *
  into v_first
  from public.api_assign_member_role(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
    '77777777-7777-4777-8777-777777777703'::uuid,
    '99999999-9999-4999-8999-999999999901'::uuid,
    'assign product view after invite acceptance'
  );

  if v_first.membership_id <> 'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid
     or v_first.role_id <> '77777777-7777-4777-8777-777777777703'::uuid
     or v_first.role_assigned is not true
     or v_first.already_assigned is not false
     or v_first.audit_log_id is null then
    raise exception 'role assignment success row incorrect: %', row_to_json(v_first);
  end if;

  select *
  into v_second
  from public.api_assign_member_role(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
    '77777777-7777-4777-8777-777777777703'::uuid,
    null,
    null
  );

  if v_second.membership_id <> v_first.membership_id
     or v_second.role_id <> v_first.role_id
     or v_second.role_assigned is not false
     or v_second.already_assigned is not true then
    raise exception 'role assignment duplicate row incorrect: %', row_to_json(v_second);
  end if;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.membership_roles
  where membership_id = 'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid
    and role_id = '77777777-7777-4777-8777-777777777703'::uuid;

  if v_count <> 1 then
    raise exception 'role assignment expected one membership_roles row, got %', v_count;
  end if;

  select count(*) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid
    and actor_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid
    and entity_type = 'organization_membership'
    and entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid
    and action = 'admin.member.role.assign'
    and request_id = '99999999-9999-4999-8999-999999999901'::uuid;

  if v_count <> 1 then
    raise exception 'role assignment audit missing';
  end if;

  select count(*) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid
    and entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid
    and action = 'admin.member.role.assign.duplicate_reused';

  if v_count <> 1 then
    raise exception 'role assignment duplicate audit missing';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa202', true);

do $$
begin
  if not public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
    'product.view'
  ) then
    raise exception 'assigned target does not have role-derived permission';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa203', true);

do $$
begin
  begin
    perform public.api_assign_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
      '77777777-7777-4777-8777-777777777703'::uuid,
      null,
      null
    );

    raise exception 'limited user role assignment unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa201', true);

do $$
begin
  begin
    perform public.api_assign_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
      '77777777-7777-4777-8777-777777777704'::uuid,
      null,
      null
    );

    raise exception 'cross-tenant role assignment unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_assign_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd04'::uuid,
      '77777777-7777-4777-8777-777777777703'::uuid,
      null,
      null
    );

    raise exception 'inactive membership role assignment unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_assign_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd01'::uuid,
      '77777777-7777-4777-8777-777777777703'::uuid,
      null,
      null
    );

    raise exception 'self role assignment unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_assign_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
      '77777777-7777-4777-8777-777777777705'::uuid,
      null,
      null
    );

    raise exception 'inactive role assignment unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_assign_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
      '77777777-7777-4777-8777-777777777706'::uuid,
      null,
      null
    );

    raise exception 'system role assignment unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

reset role;

select 'member_role_assignment_boundary' as check_name, 'pass' as result;

rollback;
