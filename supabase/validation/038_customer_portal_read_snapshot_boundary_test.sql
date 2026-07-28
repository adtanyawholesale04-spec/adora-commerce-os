\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa381', 'authenticated', 'authenticated', 'portal-a@example.test', now(), '{"provider":"email"}', '{}', now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa382', 'authenticated', 'authenticated', 'portal-b@example.test', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'Portal Org A', 'portal-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb39', 'Portal Org B', 'portal-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc98', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa381', 'Portal Profile A', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc99', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa382', 'Portal Profile B', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd63', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'cccccccc-cccc-cccc-cccc-cccccccccc98', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd64', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb39', 'cccccccc-cccc-cccc-cccc-cccccccccc99', 'ACTIVE', true, now());

insert into public.customers (id, organization_id, customer_code, display_name, email, status)
values
  ('88888888-8888-4888-8888-888888888899', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38', 'PORTAL-CUST-001', 'Portal Customer A', 'portal-a@example.test', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888900', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb39', 'PORTAL-CUST-002', 'Portal Customer B', 'portal-b@example.test', 'ACTIVE');

set local role postgres;

insert into public.customer_profile_links (
  organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38',
  '88888888-8888-4888-8888-888888888899',
  'cccccccc-cccc-cccc-cccc-cccccccccc98',
  'ACTIVE', 'VERIFIED_SIGNUP', 'fixture-auth-proof', now()
);

insert into public.orders (
  id, organization_id, customer_id, order_number, source, order_status,
  payment_status, fulfillment_status, grand_total, amount_paid, amount_due
) values (
  '99999999-9999-4999-8999-999999999981',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38',
  '88888888-8888-4888-8888-888888888899',
  'PORTAL-ORDER-001', 'PORTAL', 'CONFIRMED', 'PAID', 'UNFULFILLED', 1250, 1250, 0
);

insert into public.order_items (
  id, organization_id, order_id, product_name_snapshot, quantity,
  original_unit_price, applied_unit_price, line_total
) values (
  '99999999-9999-4999-8999-999999999982',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38',
  '99999999-9999-4999-8999-999999999981',
  'Portal Test Product', 1, 1250, 1250, 1250
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa381', true);

do $$
declare
  v_snapshot jsonb;
  v_audit_count integer;
  v_direct_rows integer;
begin
  v_snapshot := public.api_get_customer_portal_snapshot(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa381'::uuid
  );

  if (v_snapshot ->> 'available') <> 'true'
     or (v_snapshot #>> '{customer,customer_code}') <> 'PORTAL-CUST-001'
     or jsonb_array_length(v_snapshot -> 'orders') <> 1
     or (v_snapshot #>> '{orders,0,order_number}') <> 'PORTAL-ORDER-001'
  then
    raise exception 'portal snapshot did not return the linked customer scope: %', v_snapshot;
  end if;

  set local role postgres;
  select count(*) into v_audit_count
  from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid
    and entity_id = '88888888-8888-4888-8888-888888888899'::uuid
    and action = 'CUSTOMER_PORTAL_READ'
    and request_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa381'::uuid;
  if v_audit_count <> 1 then
    raise exception 'portal read audit was not recorded';
  end if;

  set local role authenticated;

  select count(*) into v_direct_rows
  from public.customers
  where id = '88888888-8888-4888-8888-888888888899'::uuid;
  if v_direct_rows <> 0 then
    raise exception 'authenticated source-table read unexpectedly bypassed RLS';
  end if;

  begin
    perform public.api_get_customer_portal_snapshot('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb39'::uuid);
    raise exception 'cross-tenant portal snapshot unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

do $$
begin
  begin
    perform public.api_get_customer_portal_snapshot('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb38'::uuid);
    raise exception 'anon portal snapshot unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'customer_portal_read_snapshot_boundary|pass';
rollback;
