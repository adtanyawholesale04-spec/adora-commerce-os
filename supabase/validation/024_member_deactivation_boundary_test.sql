\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa241',
    'authenticated',
    'authenticated',
    'member-deactivation-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa242',
    'authenticated',
    'authenticated',
    'member-deactivation-target@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24',
  'Member Deactivation Boundary Org',
  'member-deactivation-boundary-org',
  'ACTIVE'
);

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc41',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa241',
    'Member Deactivation Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc42',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa242',
    'Member Deactivation Target',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd41',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24',
    'cccccccc-cccc-cccc-cccc-cccccccccc41',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd42',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24',
    'cccccccc-cccc-cccc-cccc-cccccccccc42',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-4777-8777-777777777741',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24',
    'member_deactivation_manager',
    'Member Deactivation Manager',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777742',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24',
    'member_deactivation_target',
    'Member Deactivation Target',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777741'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd41',
    '77777777-7777-4777-8777-777777777741'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd42',
    '77777777-7777-4777-8777-777777777742'
  );

insert into public.notifications (
  id,
  organization_id,
  notification_type,
  title,
  action_required,
  assigned_profile_id,
  status
) values (
  '88888888-8888-4888-8888-888888888841',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24',
  'MEMBER_DEACTIVATION_TEST',
  'Open assigned notification',
  true,
  'cccccccc-cccc-cccc-cccc-cccccccccc42',
  'ACTIVE'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa241', true);

do $$
begin
  begin
    perform *
    from public.api_deactivate_member(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd42'::uuid,
      '99999999-9999-4999-8999-999999999941'::uuid,
      'suspend member with open work'
    );
    raise exception 'open work deactivation unexpectedly succeeded';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%Open assigned or unassigned work blocks deactivation%' then
        raise;
      end if;
  end;
end $$;

reset role;

update public.notifications
set status = 'ACTIONED', action_required = false
where id = '88888888-8888-4888-8888-888888888841'::uuid;

update public.organization_memberships
set status = 'SUSPENDED'
where id = 'dddddddd-dddd-dddd-dddd-dddddddddd42'::uuid;

set local role authenticated;

do $$
declare
  v_retry record;
begin
  select *
  into v_retry
  from public.api_deactivate_member(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddd42'::uuid,
    '99999999-9999-4999-8999-999999999942'::uuid,
    'retry suspended member request'
  );

  if v_retry.current_status <> 'SUSPENDED'
     or v_retry.previous_status <> 'SUSPENDED'
     or v_retry.idempotency_reused is not false
     or v_retry.audit_log_id is null
     or cardinality(v_retry.coverage_gaps) <> 3 then
    raise exception 'suspended retry failed: %', row_to_json(v_retry);
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
  where membership_id = 'dddddddd-dddd-dddd-dddd-dddddddddd42'::uuid;

  if v_count <> 1 then
    raise exception 'deactivation changed retained role links: %', v_count;
  end if;

  select count(*)
  into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24'::uuid
    and entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddd42'::uuid
    and action = 'admin.member.deactivate.already_suspended';

  if v_count <> 1 then
    raise exception 'suspended retry audit count expected 1, got %', v_count;
  end if;
end $$;

select 'member_deactivation_boundary' as check_name, 'pass' as result;

rollback;
