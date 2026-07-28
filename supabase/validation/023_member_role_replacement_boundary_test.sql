\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa231',
    'authenticated',
    'authenticated',
    'role-replacement-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa232',
    'authenticated',
    'authenticated',
    'role-replacement-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
  'Role Replacement Boundary Org',
  'role-replacement-boundary-org',
  'ACTIVE'
);

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc31',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa231',
    'Role Replacement Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc32',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa232',
    'Role Replacement Target',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd31',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
    'cccccccc-cccc-cccc-cccc-cccccccccc31',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd32',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
    'cccccccc-cccc-cccc-cccc-cccccccccc32',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-4777-8777-777777777731',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
    'role_replacement_manager',
    'Role Replacement Manager',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777732',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
    'role_replacement_source',
    'Role Replacement Source',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777733',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
    'role_replacement_target',
    'Role Replacement Target',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777734',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23',
    'role_replacement_owner',
    'Role Replacement Owner',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777731'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777732'::uuid, id
from public.permissions
where code = 'product.view';

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777733'::uuid, id
from public.permissions
where code = 'inventory.view';

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd31',
    '77777777-7777-4777-8777-777777777731'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd32',
    '77777777-7777-4777-8777-777777777732'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa231', true);

do $$
declare
  v_replacement record;
begin
  select *
  into v_replacement
  from public.api_replace_member_role(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd32'::uuid,
    '77777777-7777-4777-8777-777777777732'::uuid,
    '77777777-7777-4777-8777-777777777733'::uuid,
    '99999999-9999-4999-8999-999999999931'::uuid,
    'replace source role with target role'
  );

  if v_replacement.role_replaced is not true
     or v_replacement.already_replaced is not false
     or v_replacement.idempotency_reused is not false
     or v_replacement.audit_log_id is null then
    raise exception 'role replacement failed: %', row_to_json(v_replacement);
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa232', true);

do $$
begin
  if public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23'::uuid,
    'product.view'
  ) then
    raise exception 'source role permission still present after replacement';
  end if;

  if not public.has_org_permission(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23'::uuid,
    'inventory.view'
  ) then
    raise exception 'replacement role permission missing after replacement';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa231', true);

do $$
declare
  v_retry record;
begin
  select *
  into v_retry
  from public.api_replace_member_role(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd32'::uuid,
    '77777777-7777-4777-8777-777777777732'::uuid,
    '77777777-7777-4777-8777-777777777733'::uuid,
    '99999999-9999-4999-8999-999999999931'::uuid,
    'replace source role with target role'
  );

  if v_retry.role_replaced is not false
     or v_retry.already_replaced is not true
     or v_retry.idempotency_reused is not true
     or v_retry.audit_log_id is null then
    raise exception 'role replacement retry failed: %', row_to_json(v_retry);
  end if;
end $$;

do $$
begin
  begin
    perform *
    from public.api_replace_member_role(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd32'::uuid,
      '77777777-7777-4777-8777-777777777732'::uuid,
      '77777777-7777-4777-8777-777777777733'::uuid,
      '99999999-9999-4999-8999-999999999931'::uuid,
      'different request with same key'
    );
    raise exception 'idempotency conflict unexpectedly succeeded';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%Idempotency key conflicts%' then
        raise;
      end if;
  end;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from public.membership_roles
  where membership_id = 'dddddddd-dddd-dddd-dddd-dddddddddd32'::uuid
    and role_id = '77777777-7777-4777-8777-777777777732'::uuid;

  if v_count <> 0 then
    raise exception 'source role assignment remains: %', v_count;
  end if;

  select count(*)
  into v_count
  from public.membership_roles
  where membership_id = 'dddddddd-dddd-dddd-dddd-dddddddddd32'::uuid
    and role_id = '77777777-7777-4777-8777-777777777733'::uuid;

  if v_count <> 1 then
    raise exception 'replacement role assignment expected 1, got %', v_count;
  end if;

  select count(*)
  into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23'::uuid
    and entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddd32'::uuid
    and action in (
      'admin.member.role.replace',
      'admin.member.role.replace.duplicate_reused'
    );

  if v_count <> 2 then
    raise exception 'role replacement audit count expected 2, got %', v_count;
  end if;
end $$;

select 'member_role_replacement_boundary' as check_name, 'pass' as result;

rollback;
