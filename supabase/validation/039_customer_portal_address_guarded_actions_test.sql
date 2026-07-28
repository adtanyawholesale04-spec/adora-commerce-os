\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa391', 'authenticated', 'authenticated', 'address-a@example.test', now(), '{"provider":"email"}', '{}', now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa392', 'authenticated', 'authenticated', 'address-b@example.test', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40', 'Address Org A', 'address-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41', 'Address Org B', 'address-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc90', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa391', 'Address Profile A', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc91', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa392', 'Address Profile B', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd65', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40', 'cccccccc-cccc-cccc-cccc-cccccccccc90', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd66', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41', 'cccccccc-cccc-cccc-cccc-cccccccccc91', 'ACTIVE', true, now());

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('88888888-8888-4888-8888-888888888901', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40', 'ADDR-CUST-001', 'Address Customer A', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888902', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41', 'ADDR-CUST-002', 'Address Customer B', 'ACTIVE');

set local role postgres;
insert into public.customer_profile_links (organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40', '88888888-8888-4888-8888-888888888901', 'cccccccc-cccc-cccc-cccc-cccccccccc90', 'ACTIVE', 'VERIFIED_SIGNUP', 'fixture-auth-proof', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa391', true);

do $$
declare
  v_first jsonb;
  v_retry jsonb;
  v_address_id uuid;
  v_audit_count integer;
begin
  v_first := public.api_create_customer_portal_address(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40'::uuid,
    'บ้าน', 'Address Customer A', '0812345678', '1 Portal Road', null, 'Subdistrict', 'District', 'Province', '10110', 'TH', true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa391'::uuid
  );
  v_address_id := (v_first ->> 'address_id')::uuid;
  if v_address_id is null or (v_first ->> 'reused_existing') <> 'false' then raise exception 'address create failed'; end if;

  v_retry := public.api_create_customer_portal_address(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40'::uuid,
    'บ้าน', 'Address Customer A', '0812345678', '1 Portal Road', null, 'Subdistrict', 'District', 'Province', '10110', 'TH', true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa391'::uuid
  );
  if (v_retry ->> 'reused_existing') <> 'true' or (v_retry ->> 'address_id')::uuid <> v_address_id then raise exception 'address create idempotency failed'; end if;

  if (public.api_update_customer_portal_address(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40'::uuid, v_address_id, 'บ้านใหม่', 'Address Customer A', '0812345678', '2 Portal Road', null, null, 'District', 'Province', '10110', 'TH', true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa393'::uuid
  ) ->> 'address_id')::uuid <> v_address_id then raise exception 'address update failed'; end if;

  if (public.api_archive_customer_portal_address(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40'::uuid, v_address_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa394'::uuid
  ) ->> 'status') <> 'ARCHIVED' then raise exception 'address archive failed'; end if;

  set local role postgres;
  select count(*) into v_audit_count from public.audit_logs
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb40'::uuid and entity_id = v_address_id and entity_type = 'CUSTOMER_ADDRESS';
  if v_audit_count <> 3 then raise exception 'address audit count mismatch'; end if;
end $$;

set local role authenticated;
do $$
begin
  begin
    perform public.api_create_customer_portal_address('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb41'::uuid, 'Cross', 'Cross', '0811111111', 'Denied', null, null, null, null, null, 'TH', false, gen_random_uuid());
    raise exception 'cross-tenant address create unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    select 1 from public.customer_addresses limit 1;
    raise exception 'direct address table read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  begin
    perform public.api_archive_customer_portal_address(gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
    raise exception 'anon address archive unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'customer_portal_address_guarded_actions|pass';
rollback;
