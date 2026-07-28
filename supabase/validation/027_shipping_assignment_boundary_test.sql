\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa271', 'authenticated', 'authenticated', 'shipping-assignment-manager@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa272', 'authenticated', 'authenticated', 'shipping-assignment-worker@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa273', 'authenticated', 'authenticated', 'shipping-assignment-target@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'Shipping Assignment Org', 'shipping-assignment-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc71', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa271', 'Shipping Assignment Manager', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc72', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa272', 'Shipping Assignment Worker', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc73', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa273', 'Shipping Assignment Target', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd71', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'cccccccc-cccc-cccc-cccc-cccccccccc71', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd72', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'cccccccc-cccc-cccc-cccc-cccccccccc72', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd73', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'cccccccc-cccc-cccc-cccc-cccccccccc73', 'ACTIVE', true, now());

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values ('77777777-7777-4777-8777-777777777771', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'shipping_assignment_manager', 'Shipping Assignment Manager', 'ACTIVE', false);

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-4777-8777-777777777771'::uuid, id from public.permissions
where code in ('shipping.create', 'members.manage');

insert into public.membership_roles (membership_id, role_id)
values ('dddddddd-dddd-dddd-dddd-dddddddddd71', '77777777-7777-4777-8777-777777777771');

insert into public.warehouses (id, organization_id, code, name, status)
values ('88888888-8888-4888-8888-888888888871', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'SHIP-WH', 'Shipping Assignment Warehouse', 'ACTIVE');

insert into public.fulfillments (id, organization_id, fulfillment_number, warehouse_id, status)
values ('16161616-1616-1616-1616-161616161671', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'SHIP-FA-001', '88888888-8888-4888-8888-888888888871', 'READY_TO_SHIP');

insert into public.shipping_providers (id, organization_id, provider_code, name, status)
values ('18181818-1818-4181-8181-181818181871', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', 'TEST', 'Test Carrier', 'ACTIVE');

insert into public.shipments (id, organization_id, fulfillment_id, shipping_provider_id, shipment_number, status)
values
  ('19191919-1919-4191-8191-191919191971', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', '16161616-1616-1616-1616-161616161671', '18181818-1818-4181-8181-181818181871', 'SHIP-001', 'LABEL_CREATED'),
  ('19191919-1919-4191-8191-191919191972', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', '16161616-1616-1616-1616-161616161671', '18181818-1818-4181-8181-181818181871', 'SHIP-002', 'READY_FOR_HANDOFF'),
  ('19191919-1919-4191-8191-191919191973', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', '16161616-1616-1616-1616-161616161671', '18181818-1818-4181-8181-181818181871', 'SHIP-003', 'DELIVERED');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa271', true);

do $$
declare v_result record;
begin
  select * into v_result from public.api_assign_shipment(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27'::uuid, '19191919-1919-4191-8191-191919191971'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc72'::uuid, '99999999-9999-4999-8999-999999999971'::uuid,
    'assign shipment to shipping worker');
  if v_result.operation <> 'assign' or v_result.current_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc72'::uuid or v_result.idempotency_reused then
    raise exception 'initial Shipping assignment failed: %', row_to_json(v_result);
  end if;
end $$;

do $$
declare v_result record;
begin
  select * into v_result from public.api_assign_shipment(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27'::uuid, '19191919-1919-4191-8191-191919191971'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc72'::uuid, '99999999-9999-4999-8999-999999999971'::uuid,
    'assign shipment to shipping worker');
  if v_result.operation <> 'duplicate_reused' or not v_result.idempotency_reused then raise exception 'Shipping retry failed'; end if;
end $$;

do $$
declare v_result record;
begin
  select * into v_result from public.api_assign_shipment(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27'::uuid, '19191919-1919-4191-8191-191919191971'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc73'::uuid, '99999999-9999-4999-8999-999999999972'::uuid,
    'reassign shipment to another worker', 'cccccccc-cccc-cccc-cccc-cccccccccc72'::uuid);
  if v_result.operation <> 'reassign' or v_result.previous_assignee_profile_id <> 'cccccccc-cccc-cccc-cccc-cccccccccc72'::uuid then raise exception 'Shipping reassignment failed'; end if;
end $$;

do $$
begin
  begin
    update public.shipments set assigned_profile_id = null where id = '19191919-1919-4191-8191-191919191971'::uuid;
    raise exception 'direct Shipping assignment update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

do $$
begin
  begin
    perform * from public.api_assign_shipment(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27'::uuid, '19191919-1919-4191-8191-191919191973'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccc72'::uuid, '99999999-9999-4999-8999-999999999973'::uuid,
      'assign delivered shipment to worker');
    raise exception 'terminal Shipping assignment unexpectedly succeeded';
  exception when sqlstate '22023' then
    if sqlerrm not like '%cannot be assigned from status DELIVERED%' then raise; end if;
  end;
end $$;

do $$
begin
  begin
    perform * from public.api_deactivate_member(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddd73'::uuid,
      '99999999-9999-4999-8999-999999999974'::uuid, 'suspend target with unassigned Shipping work present');
    raise exception 'deactivation with unassigned Shipping work unexpectedly succeeded';
  exception when sqlstate '22023' then
    if sqlerrm not like '%Open assigned or unassigned work blocks deactivation%' then raise; end if;
  end;
end $$;

reset role;

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.shipments where id = '19191919-1919-4191-8191-191919191971'::uuid and assigned_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc73'::uuid;
  if v_count <> 1 then raise exception 'Shipping assigned profile was not persisted'; end if;
  select count(*) into v_count from public.audit_logs where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27'::uuid and entity_type = 'shipment' and entity_id = '19191919-1919-4191-8191-191919191971'::uuid and action in ('admin.shipping.assign', 'admin.shipping.reassign', 'admin.shipping.assignment.duplicate_reused');
  if v_count <> 3 then raise exception 'Shipping assignment audit count expected 3, got %', v_count; end if;
end $$;

select 'shipping_assignment_boundary' as check_name, 'pass' as result;
rollback;
