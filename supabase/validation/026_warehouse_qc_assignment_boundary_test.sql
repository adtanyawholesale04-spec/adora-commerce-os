\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa261', 'authenticated', 'authenticated',
   'qc-assignment-manager@example.test', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa262', 'authenticated', 'authenticated',
   'qc-assignment-worker@example.test', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa263', 'authenticated', 'authenticated',
   'qc-assignment-target@example.test', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26', 'QC Assignment Org',
        'qc-assignment-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc61', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa261', 'QC Assignment Manager', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc62', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa262', 'QC Assignment Worker', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc63', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa263', 'QC Assignment Target', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd61', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26', 'cccccccc-cccc-cccc-cccc-cccccccccc61', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd62', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26', 'cccccccc-cccc-cccc-cccc-cccccccccc62', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd63', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26', 'cccccccc-cccc-cccc-cccc-cccccccccc63', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values ('77777777-7777-4777-8777-777777777761', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26',
        'qc_assignment_manager', 'QC Assignment Manager', 'ACTIVE', false);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777761'::uuid, id
from public.permissions
where code in ('warehouse.qc', 'members.manage');

insert into public.membership_roles (membership_id, role_id)
values ('dddddddd-dddd-dddd-dddd-dddddddddd61', '77777777-7777-4777-8777-777777777761');

insert into public.warehouses (id, organization_id, code, name, status)
values ('88888888-8888-4888-8888-888888888861', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26',
        'QC-WH', 'QC Assignment Warehouse', 'ACTIVE');

insert into public.fulfillments (
  id, organization_id, fulfillment_number, warehouse_id, status
) values (
  '16161616-1616-1616-1616-161616161661', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26',
  'QC-FA-001', '88888888-8888-4888-8888-888888888861', 'QC_PENDING'
);

insert into public.fulfillment_qc_sessions (
  id, organization_id, fulfillment_id, status
) values
  ('17171717-1717-4177-8177-171717171761', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26',
   '16161616-1616-1616-1616-161616161661', 'PENDING'),
  ('17171717-1717-4177-8177-171717171762', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26',
   '16161616-1616-1616-1616-161616161661', 'FAILED'),
  ('17171717-1717-4177-8177-171717171763', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26',
   '16161616-1616-1616-1616-161616161661', 'PASSED');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa261', true);

do $$
declare
  v_result record;
begin
  select * into v_result
  from public.api_assign_qc_session(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26'::uuid,
    '17171717-1717-4177-8177-171717171761'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc62'::uuid,
    '99999999-9999-4999-8999-999999999961'::uuid,
    'assign QC session to warehouse QC worker'
  );

  if v_result.operation <> 'assign'
     or v_result.current_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc62'::uuid
     or v_result.idempotency_reused
     or v_result.audit_log_id is null then
    raise exception 'initial QC assignment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare
  v_result record;
begin
  select * into v_result
  from public.api_assign_qc_session(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26'::uuid,
    '17171717-1717-4177-8177-171717171761'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc62'::uuid,
    '99999999-9999-4999-8999-999999999961'::uuid,
    'assign QC session to warehouse QC worker'
  );

  if v_result.operation <> 'duplicate_reused' or not v_result.idempotency_reused then
    raise exception 'QC assignment retry failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare
  v_result record;
begin
  select * into v_result
  from public.api_assign_qc_session(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26'::uuid,
    '17171717-1717-4177-8177-171717171761'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc63'::uuid,
    '99999999-9999-4999-8999-999999999962'::uuid,
    'reassign QC session to another worker',
    'cccccccc-cccc-cccc-cccc-cccccccccc62'::uuid
  );

  if v_result.operation <> 'reassign'
     or v_result.previous_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc62'::uuid
     or v_result.current_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc63'::uuid then
    raise exception 'QC reassignment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
begin
  begin
    perform *
    from public.api_assign_qc_session(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26'::uuid,
      '17171717-1717-4177-8177-171717171763'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccc62'::uuid,
      '99999999-9999-4999-8999-999999999963'::uuid,
      'assign completed QC session to worker'
    );
    raise exception 'terminal QC assignment unexpectedly succeeded';
  exception
    when sqlstate '22023' then
      if sqlerrm not like '%cannot be assigned from status PASSED%' then
        raise;
      end if;
  end;
end $$;

do $$
begin
  begin
    update public.fulfillment_qc_sessions
    set assigned_profile_id = null
    where id = '17171717-1717-4177-8177-171717171761'::uuid;
    raise exception 'direct QC assignment update unexpectedly succeeded';
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
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddd63'::uuid,
      '99999999-9999-4999-8999-999999999964'::uuid,
      'suspend target with unassigned QC work present'
    );
    raise exception 'deactivation with unassigned QC work unexpectedly succeeded';
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
  from public.fulfillment_qc_sessions
  where id = '17171717-1717-4177-8177-171717171761'::uuid
    and assigned_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc63'::uuid;
  if v_count <> 1 then
    raise exception 'QC assigned profile was not persisted';
  end if;

  select count(*) into v_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26'::uuid
    and entity_type = 'fulfillment_qc_session'
    and entity_id = '17171717-1717-4177-8177-171717171761'::uuid
    and action in (
      'admin.warehouse_qc.assign',
      'admin.warehouse_qc.reassign',
      'admin.warehouse_qc.assignment.duplicate_reused'
    );
  if v_count <> 3 then
    raise exception 'QC assignment audit count expected 3, got %', v_count;
  end if;
end $$;

select 'warehouse_qc_assignment_boundary' as check_name, 'pass' as result;

rollback;
