\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa221',
    'authenticated',
    'authenticated',
    'role-remove-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa222',
    'authenticated',
    'authenticated',
    'role-remove-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa223',
    'authenticated',
    'authenticated',
    'role-remove-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa224',
    'authenticated',
    'authenticated',
    'role-remove-inactive-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa225',
    'authenticated',
    'authenticated',
    'role-remove-last-role-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'Role Removal Org A', 'role-removal-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb22', 'Role Removal Org B', 'role-removal-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc21', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa221', 'Role Removal Manager', 'ACTIVE'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc22', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa222', 'Role Removal Target', 'ACTIVE'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc23', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa223', 'Role Removal Limited', 'ACTIVE'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc24', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa224', 'Role Removal Inactive Target', 'ACTIVE'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc25', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa225', 'Role Removal Last Role Target', 'ACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd21', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'cccccccc-cccc-4ccc-8ccc-cccccccccc21', 'ACTIVE', true, now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd22', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'cccccccc-cccc-4ccc-8ccc-cccccccccc22', 'ACTIVE', true, now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd23', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'cccccccc-cccc-4ccc-8ccc-cccccccccc23', 'ACTIVE', true, now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd24', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'cccccccc-cccc-4ccc-8ccc-cccccccccc24', 'SUSPENDED', false, null),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd25', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'cccccccc-cccc-4ccc-8ccc-cccccccccc25', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  ('77777777-7777-4777-8777-777777777721', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_manager', 'Role Removal Manager', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777722', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_limited', 'Role Removal Limited', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777723', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_target', 'Role Removal Target', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777724', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_keeper', 'Role Removal Keeper', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777725', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb22', 'role_removal_other_org', 'Role Removal Other Org', 'ACTIVE', false),
  ('77777777-7777-4777-8777-777777777726', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_inactive', 'Role Removal Inactive', 'INACTIVE', false),
  ('77777777-7777-4777-8777-777777777727', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_system', 'Role Removal System', 'ACTIVE', true),
  ('77777777-7777-4777-8777-777777777728', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21', 'role_removal_last_role', 'Role Removal Last Role', 'ACTIVE', false);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777721'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777722'::uuid, id
from public.permissions
where code in ('members.view');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777723'::uuid, id
from public.permissions
where code in ('product.view');

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd21', '77777777-7777-4777-8777-777777777721'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd22', '77777777-7777-4777-8777-777777777723'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd22', '77777777-7777-4777-8777-777777777724'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd22', '77777777-7777-4777-8777-777777777727'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd23', '77777777-7777-4777-8777-777777777722'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd25', '77777777-7777-4777-8777-777777777728');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa221', true);

do $$
declare
  v_first record;
  v_second record;
begin
  select *
  into v_first
  from public.api_remove_member_role(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
    'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid,
    '77777777-7777-4777-8777-777777777723'::uuid,
    '99999999-9999-4999-8999-999999999921'::uuid,
    'remove product view role'
  );

  if v_first.membership_id <> 'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid
     or v_first.role_id <> '77777777-7777-4777-8777-777777777723'::uuid
     or v_first.role_removed is not true
     or v_first.already_removed is not false
     or v_first.remaining_role_count <> 2
     or v_first.audit_log_id is null then
    raise exception 'role removal success row incorrect: %', row_to_json(v_first);
  end if;

  select *
  into v_second
  from public.api_remove_member_role(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
    'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid,
    '77777777-7777-4777-8777-777777777723'::uuid,
    null,
    null
  );

  if v_second.membership_id <> v_first.membership_id
     or v_second.role_id <> v_first.role_id
     or v_second.role_removed is not false
     or v_second.already_removed is not true
     or v_second.remaining_role_count <> 2 then
    raise exception 'role removal already-removed row incorrect: %', row_to_json(v_second);
  end if;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.membership_roles
  where membership_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid
    and role_id = '77777777-7777-4777-8777-777777777723'::uuid;

  if v_count <> 0 then
    raise exception 'role removal expected zero removed membership_roles rows, got %', v_count;
  end if;

  select count(*) into v_count
  from public.membership_roles
  where membership_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid
    and role_id = '77777777-7777-4777-8777-777777777724'::uuid;

  if v_count <> 1 then
    raise exception 'role removal should preserve unrelated keeper role';
  end if;

  select count(*) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid
    and actor_profile_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccc21'::uuid
    and entity_type = 'organization_membership'
    and entity_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid
    and action = 'admin.member.role.remove'
    and request_id = '99999999-9999-4999-8999-999999999921'::uuid;

  if v_count <> 1 then
    raise exception 'role removal audit missing';
  end if;

  select count(*) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid
    and entity_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid
    and action = 'admin.member.role.remove.already_removed';

  if v_count <> 1 then
    raise exception 'role removal already-removed audit missing';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa222', true);

do $$
begin
  if public.has_org_permission(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
    'product.view'
  ) then
    raise exception 'removed role still grants role-derived permission';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa223', true);

do $$
begin
  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid,
      '77777777-7777-4777-8777-777777777724'::uuid,
      null,
      null
    );

    raise exception 'limited user role removal unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa221', true);

do $$
begin
  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid,
      '77777777-7777-4777-8777-777777777725'::uuid,
      null,
      null
    );

    raise exception 'cross-tenant role removal unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd24'::uuid,
      '77777777-7777-4777-8777-777777777724'::uuid,
      null,
      null
    );

    raise exception 'inactive membership role removal unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd21'::uuid,
      '77777777-7777-4777-8777-777777777721'::uuid,
      null,
      null
    );

    raise exception 'self role removal unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid,
      '77777777-7777-4777-8777-777777777726'::uuid,
      null,
      null
    );

    raise exception 'inactive role removal unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd22'::uuid,
      '77777777-7777-4777-8777-777777777727'::uuid,
      null,
      null
    );

    raise exception 'system role removal unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.api_remove_member_role(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21'::uuid,
      'dddddddd-dddd-4ddd-8ddd-dddddddddd25'::uuid,
      '77777777-7777-4777-8777-777777777728'::uuid,
      null,
      null
    );

    raise exception 'last role removal unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

reset role;

select 'member_role_removal_boundary' as check_name, 'pass' as result;

rollback;
