\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa361', 'authenticated', 'authenticated', 'ownership-a@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa362', 'authenticated', 'authenticated', 'ownership-b@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36', 'Ownership Org A', 'ownership-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb37', 'Ownership Org B', 'ownership-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc96', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa361', 'Ownership Profile A', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc97', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa362', 'Ownership Profile B', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd61', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36', 'cccccccc-cccc-cccc-cccc-cccccccccc96', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd62', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb37', 'cccccccc-cccc-cccc-cccc-cccccccccc97', 'ACTIVE', true, now());

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('88888888-8888-4888-8888-888888888896', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36', 'OWN-CUST-001', 'Ownership Customer A', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888898', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36', 'OWN-CUST-003', 'Ownership Customer A2', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888897', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb37', 'OWN-CUST-002', 'Ownership Customer B', 'ACTIVE');

set local role postgres;

insert into public.customer_profile_links (
  organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
  '88888888-8888-4888-8888-888888888896',
  'cccccccc-cccc-cccc-cccc-cccccccccc96',
  'ACTIVE', 'VERIFIED_SIGNUP', 'fixture-auth-proof', now()
);

do $$
begin
  begin
    insert into public.customer_profile_links (
      organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
      '88888888-8888-4888-8888-888888888898',
      'cccccccc-cccc-cccc-cccc-cccccccccc97',
      'ACTIVE', 'VERIFIED_SIGNUP', 'cross-tenant-fixture', now()
    );
    raise exception 'cross-tenant profile link unexpectedly succeeded';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.customer_profile_links (
      organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
      '88888888-8888-4888-8888-888888888896',
      'cccccccc-cccc-cccc-cccc-cccccccccc96',
      'ACTIVE', 'VERIFIED_SIGNUP', 'duplicate-fixture', now()
    );
    raise exception 'duplicate active customer link unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    select 1 from public.customer_profile_links limit 1;
    raise exception 'authenticated ownership link read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.customer_profile_links (
      organization_id, customer_id, profile_id, link_status, link_source
    ) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb36',
      '88888888-8888-4888-8888-888888888896',
      'cccccccc-cccc-cccc-cccc-cccccccccc96',
      'PENDING', 'VERIFIED_SIGNUP'
    );
    raise exception 'authenticated ownership link insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'customer_profile_ownership_boundary|pass';
rollback;
