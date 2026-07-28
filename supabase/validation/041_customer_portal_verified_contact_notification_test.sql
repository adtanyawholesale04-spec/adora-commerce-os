\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa411', 'authenticated', 'authenticated', 'contact-a@example.test', now(), '{"provider":"email"}', '{}', now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa412', 'authenticated', 'authenticated', 'contact-b@example.test', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44', 'Contact Org A', 'contact-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb45', 'Contact Org B', 'contact-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc94', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa411', 'Contact Profile A', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc95', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa412', 'Contact Profile B', 'ACTIVE');

insert into public.organization_memberships (id, organization_id, profile_id, status, is_default, joined_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd69', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44', 'cccccccc-cccc-cccc-cccc-cccccccccc94', 'ACTIVE', true, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd70', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb45', 'cccccccc-cccc-cccc-cccc-cccccccccc95', 'ACTIVE', true, now());

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('88888888-8888-4888-8888-888888888905', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44', 'CONTACT-CUST-001', 'Contact Customer A', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888906', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb45', 'CONTACT-CUST-002', 'Contact Customer B', 'ACTIVE');

set local role postgres;
insert into public.customer_profile_links (organization_id, customer_id, profile_id, link_status, link_source, verification_method, verified_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44', '88888888-8888-4888-8888-888888888905', 'cccccccc-cccc-cccc-cccc-cccccccccc94', 'ACTIVE', 'VERIFIED_SIGNUP', 'fixture-auth-proof', now());

insert into public.notifications (id, organization_id, notification_type, title, body, status)
values ('99999999-9999-4999-8999-999999999991', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44', 'ORDER_UPDATE', 'Order update', 'Your order moved forward.', 'ACTIVE');
insert into public.notification_recipients (id, organization_id, notification_id, recipient_type, profile_id, status)
values ('99999999-9999-4999-8999-999999999992', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44', '99999999-9999-4999-8999-999999999991', 'PROFILE', 'cccccccc-cccc-cccc-cccc-cccccccccc94', 'UNREAD');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa411', true);

do $$
declare
  v_first jsonb;
  v_retry jsonb;
  v_request_id uuid;
  v_notifications jsonb;
begin
  v_first := public.api_request_customer_contact_change('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44'::uuid, 'EMAIL', 'New-Contact@Example.Test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa411'::uuid);
  v_request_id := (v_first ->> 'request_id')::uuid;
  if v_request_id is null or (v_first ->> 'status') <> 'PENDING' then raise exception 'contact request failed'; end if;
  v_retry := public.api_request_customer_contact_change('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44'::uuid, 'EMAIL', 'New-Contact@Example.Test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa411'::uuid);
  if (v_retry ->> 'reused_existing') <> 'true' or (v_retry ->> 'request_id')::uuid <> v_request_id then raise exception 'contact request idempotency failed'; end if;
  begin
    perform public.api_verify_customer_contact_change_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44'::uuid, v_request_id, 'otp', gen_random_uuid());
    raise exception 'authenticated contact verification unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  v_notifications := public.api_get_customer_portal_notifications('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44'::uuid, gen_random_uuid());
  if (v_notifications ->> 'available') <> 'true' or jsonb_array_length(v_notifications -> 'notifications') <> 1 then raise exception 'notification mapping read failed'; end if;
end $$;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare
  v_verified jsonb;
  v_request_id uuid;
begin
  select id into v_request_id from public.customer_contact_change_requests where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44'::uuid limit 1;
  v_verified := public.api_verify_customer_contact_change_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb44'::uuid, v_request_id, 'otp', gen_random_uuid());
  if (v_verified ->> 'status') <> 'VERIFIED' or (v_verified ->> 'auth_admin_apply_required') <> 'true' then raise exception 'service contact verification failed'; end if;
end $$;

set local role authenticated;
do $$
begin
  begin
    perform public.api_request_customer_contact_change('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb45'::uuid, 'EMAIL', 'other@example.test', gen_random_uuid());
    raise exception 'cross-tenant contact request unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    select 1 from public.customer_contact_change_requests limit 1;
    raise exception 'direct contact request read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  begin
    perform public.api_get_customer_portal_notifications(gen_random_uuid(), gen_random_uuid());
    raise exception 'anon notification read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'customer_portal_verified_contact_notification|pass';
rollback;
