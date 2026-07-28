\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa251', 'authenticated', 'authenticated',
   'fulfillment-assignment-manager@example.test', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa252', 'authenticated', 'authenticated',
   'fulfillment-assignment-worker@example.test', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa253', 'authenticated', 'authenticated',
   'fulfillment-assignment-target@example.test', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25', 'Fulfillment Assignment Org',
        'fulfillment-assignment-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc51', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa251', 'Assignment Manager', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc52', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa252', 'Assignment Worker', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc53', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa253', 'Assignment Target', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd51', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25', 'cccccccc-cccc-cccc-cccc-cccccccccc51', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd52', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25', 'cccccccc-cccc-cccc-cccc-cccccccccc52', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd53', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25', 'cccccccc-cccc-cccc-cccc-cccccccccc53', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values ('77777777-7777-4777-8777-777777777751', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25',
        'fulfillment_assignment_manager', 'Fulfillment Assignment Manager', 'ACTIVE', false);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777751'::uuid, id
from public.permissions
where code in ('warehouse.pick', 'members.manage');

insert into public.membership_roles (membership_id, role_id)
values ('dddddddd-dddd-dddd-dddd-dddddddddd51', '77777777-7777-4777-8777-777777777751');

insert into public.warehouses (id, organization_id, code, name, status)
values ('88888888-8888-4888-8888-888888888851', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25',
        'FA-WH', 'Fulfillment Assignment Warehouse', 'ACTIVE');

insert into public.fulfillments (
  id, organization_id, fulfillment_number, warehouse_id, status
) values (
  '16161616-1616-1616-1616-161616161651', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25',
  'FA-001', '88888888-8888-4888-8888-888888888851', 'READY_TO_PICK'
), (
  '16161616-1616-1616-1616-161616161652', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25',
  'FA-002', '88888888-8888-4888-8888-888888888851', 'READY_TO_PICK'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa251', true);

do $$
declare
  v_result record;
begin
  select * into v_result
  from public.api_assign_fulfillment(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25'::uuid,
    '16161616-1616-1616-1616-161616161651'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc52'::uuid,
    '99999999-9999-4999-8999-999999999951'::uuid,
    'assign fulfillment to warehouse worker'
  );

  if v_result.operation <> 'assign'
     or v_result.current_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc52'::uuid
     or v_result.idempotency_reused
     or v_result.audit_log_id is null then
    raise exception 'initial fulfillment assignment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare
  v_result record;
begin
  select * into v_result
  from public.api_assign_fulfillment(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25'::uuid,
    '16161616-1616-1616-1616-161616161651'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc52'::uuid,
    '99999999-9999-4999-8999-999999999951'::uuid,
    'assign fulfillment to warehouse worker'
  );

  if v_result.operation <> 'duplicate_reused' or not v_result.idempotency_reused then
    raise exception 'assignment retry failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare
  v_result record;
begin
  select * into v_result
  from public.api_assign_fulfillment(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25'::uuid,
    '16161616-1616-1616-1616-161616161651'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc53'::uuid,
    '99999999-9999-4999-8999-999999999952'::uuid,
    'reassign fulfillment to another worker',
    'cccccccc-cccc-cccc-cccc-cccccccccc52'::uuid
  );

  if v_result.operation <> 'reassign'
     or v_result.previous_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc52'::uuid
     or v_result.current_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc53'::uuid then
    raise exception 'fulfillment reassignment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
begin
  begin
    update public.fulfillments
    set assigned_profile_id = null
    where id = '16161616-1616-1616-1616-161616161651'::uuid;
    raise exception 'direct fulfillment assignment update unexpectedly succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

do $$
begin
  begin
    perform *
    from public.api_deactivate_member(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd53'::uuid,
      '99999999-9999-4999-8999-999999999953'::uuid,
      'suspend target with unassigned work present'
    );
    raise exception 'deactivation with unassigned fulfillment unexpectedly succeeded';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%Open assigned or unassigned work blocks deactivation%' then
        raise;
      end if;
  end;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.fulfillments
  where id = '16161616-1616-1616-1616-161616161651'::uuid
    and assigned_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc53'::uuid;
  if v_count <> 1 then
    raise exception 'assigned profile was not persisted';
  end if;

  select count(*) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25'::uuid
    and entity_type = 'fulfillment'
    and entity_id = '16161616-1616-1616-1616-161616161651'::uuid
    and action in (
      'admin.fulfillment.assign',
      'admin.fulfillment.reassign',
      'admin.fulfillment.assignment.duplicate_reused'
    );
  if v_count <> 3 then
    raise exception 'fulfillment assignment audit count expected 3, got %', v_count;
  end if;
end $$;

select 'fulfillment_assignment_boundary' as check_name, 'pass' as result;

rollback;
