\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa281', 'authenticated', 'authenticated', 'returns-assignment-manager@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa282', 'authenticated', 'authenticated', 'returns-assignment-worker@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa283', 'authenticated', 'authenticated', 'returns-assignment-target@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', 'Returns Assignment Org', 'returns-assignment-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc81', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa281', 'Returns Assignment Manager', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc82', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa282', 'Returns Assignment Worker', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc83', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa283', 'Returns Assignment Target', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd81', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', 'cccccccc-cccc-cccc-cccc-cccccccccc81', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd82', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', 'cccccccc-cccc-cccc-cccc-cccccccccc82', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd83', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', 'cccccccc-cccc-cccc-cccc-cccccccccc83', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values ('77777777-7777-4777-8777-777777777781', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', 'returns_assignment_manager', 'Returns Assignment Manager', 'ACTIVE', false);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777781'::uuid, id from public.permissions
where code in ('return.manage', 'members.manage');

insert into public.membership_roles (membership_id, role_id)
values ('dddddddd-dddd-dddd-dddd-dddddddddd81', '77777777-7777-4777-8777-777777777781');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values ('88888888-8888-4888-8888-888888888881', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', 'RET-CUST-001', 'Returns Assignment Customer', 'ACTIVE');

insert into public.orders (id, organization_id, customer_id, order_number, source, order_status, payment_status, fulfillment_status)
values ('89898989-8989-4898-8898-898989898981', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', '88888888-8888-4888-8888-888888888881', 'RET-ORD-001', 'ADMIN', 'COMPLETED', 'PAID', 'RETURN_IN_PROGRESS');

insert into public.returns (id, organization_id, order_id, return_number, return_type, status)
values
  ('91919191-9191-4191-8191-919191919181', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', '89898989-8989-4898-8898-898989898981', 'RET-001', 'CUSTOMER_RETURN', 'REQUESTED'),
  ('91919191-9191-4191-8191-919191919182', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', '89898989-8989-4898-8898-898989898981', 'RET-002', 'RTO', 'APPROVED'),
  ('91919191-9191-4191-8191-919191919183', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', '89898989-8989-4898-8898-898989898981', 'RET-003', 'EXCHANGE', 'RESOLVED');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa281', true);

do $$
declare v_result record;
begin
  select * into v_result from public.api_assign_return(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28'::uuid, '91919191-9191-4191-8191-919191919181'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc82'::uuid, '99999999-9999-4999-8999-999999999981'::uuid,
    'assign return to returns worker');
  if v_result.operation <> 'assign' or v_result.current_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc82'::uuid or v_result.idempotency_reused then
    raise exception 'initial Returns assignment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare v_result record;
begin
  select * into v_result from public.api_assign_return(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28'::uuid, '91919191-9191-4191-8191-919191919181'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc82'::uuid, '99999999-9999-4999-8999-999999999981'::uuid,
    'assign return to returns worker');
  if v_result.operation <> 'duplicate_reused' or not v_result.idempotency_reused then raise exception 'Returns retry failed'; end if;
end $$;

do $$
declare v_result record;
begin
  select * into v_result from public.api_assign_return(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28'::uuid, '91919191-9191-4191-8191-919191919181'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc83'::uuid, '99999999-9999-4999-8999-999999999982'::uuid,
    'reassign return to another worker', 'cccccccc-cccc-cccc-cccc-cccccccccc82'::uuid);
  if v_result.operation <> 'reassign' or v_result.previous_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc82'::uuid then raise exception 'Returns reassignment failed'; end if;
end $$;

do $$
begin
  begin
    update public.returns set assigned_profile_id = null where id = '91919191-9191-4191-8191-919191919181'::uuid;
    raise exception 'direct Returns assignment update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

do $$
begin
  begin
    perform * from public.api_assign_return(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28'::uuid, '91919191-9191-4191-8191-919191919183'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccc82'::uuid, '99999999-9999-4999-8999-999999999983'::uuid,
      'assign resolved return to worker');
    raise exception 'terminal Returns assignment unexpectedly succeeded';
  exception when sqlstate '22023' then
    if sqlerrm not like '%cannot be assigned from status RESOLVED%' then raise; end if;
  end;
end $$;

do $$
begin
  begin
    perform * from public.api_deactivate_member(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddd83'::uuid,
      '99999999-9999-4999-8999-999999999984'::uuid, 'suspend target with unassigned Returns work present');
    raise exception 'deactivation with unassigned Returns work unexpectedly succeeded';
  exception when sqlstate '22023' then
    if sqlerrm not like '%Open assigned or unassigned work blocks deactivation%' then raise; end if;
  end;
end $$;

reset role;

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.returns where id = '91919191-9191-4191-8191-919191919181'::uuid and assigned_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc83'::uuid;
  if v_count <> 1 then raise exception 'Returns assigned profile was not persisted'; end if;
  select count(*) into v_count from public.audit_logs where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28'::uuid and entity_type = 'return' and entity_id = '91919191-9191-4191-8191-919191919181'::uuid and action in ('admin.return.assign', 'admin.return.reassign', 'admin.return.assignment.duplicate_reused');
  if v_count <> 3 then raise exception 'Returns assignment audit count expected 3, got %', v_count; end if;
end $$;

select 'returns_assignment_boundary' as check_name, 'pass' as result;
rollback;
