\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa291', 'authenticated', 'authenticated', 'attribution-boundary@example.test', now(), '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29', 'Attribution Boundary Org', 'attribution-boundary-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc91', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa291', 'Attribution Boundary Actor', 'ACTIVE');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values
  ('88888888-8888-4888-8888-888888888891', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29', 'ATTR-CUST-001', 'Attribution Customer', 'ACTIVE'),
  ('88888888-8888-4888-8888-888888888892', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29', 'ATTR-CUST-002', 'Attribution Customer Two', 'ACTIVE');

insert into public.content_posts (
  id, organization_id, content_type, status, visibility, title, published_at, created_by_user_id
) values (
  '99999999-9999-4999-8999-999999999991',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29',
  'GENERAL_POST', 'PUBLISHED', 'PUBLIC', 'Attribution Test Post', now(),
  'cccccccc-cccc-cccc-cccc-cccccccccc91'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_record_attribution_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29'::uuid,
      'CONTENT_VIEW',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa291'::uuid,
      '88888888-8888-4888-8888-888888888891'::uuid,
    null,
    '99999999-9999-4999-8999-999999999991'::uuid,
    null, null, null, null, null, null, now(), '{"source":"test"}'::jsonb
  );

  if v_result.event_id is null or v_result.idempotency_reused then
    raise exception 'initial attribution event failed';
  end if;
end $$;

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_record_attribution_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29'::uuid,
    'CONTENT_VIEW',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa291'::uuid,
    '88888888-8888-4888-8888-888888888891'::uuid,
    null,
    '99999999-9999-4999-8999-999999999991'::uuid
  );

  if v_result.event_id is null or not v_result.idempotency_reused then
    raise exception 'attribution idempotency retry failed';
  end if;
end $$;

do $$
begin
  begin
    perform public.api_record_attribution_event(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29'::uuid,
      'CONTENT_VIEW',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa291'::uuid,
      '88888888-8888-4888-8888-888888888892'::uuid,
      null,
      '99999999-9999-4999-8999-999999999991'::uuid
    );
    raise exception 'conflicting attribution idempotency unexpectedly succeeded';
  exception when sqlstate '22023' then
    if sqlerrm not like '%Idempotency key conflicts%' then raise; end if;
  end;
end $$;

do $$
begin
  set local role postgres;
  begin
    update public.attribution_events
    set metadata = '{"mutated":true}'::jsonb
    where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29'::uuid;
    raise exception 'direct attribution update unexpectedly succeeded';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa291', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_record_attribution_event(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29'::uuid,
      'CONTENT_VIEW',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa293'::uuid,
      '88888888-8888-4888-8888-888888888891'::uuid,
      null,
      '99999999-9999-4999-8999-999999999991'::uuid
    );
    raise exception 'authenticated attribution RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'attribution_record_boundary|pass';
rollback;
