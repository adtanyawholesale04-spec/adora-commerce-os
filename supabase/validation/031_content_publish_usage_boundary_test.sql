\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa311', 'authenticated', 'authenticated', 'content-publish@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31', 'Content Publish Org', 'content-publish-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc92', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa311', 'Content Publisher', 'ACTIVE');

insert into public.content_posts (
  id, organization_id, content_type, status, visibility, title, created_by_user_id
) values (
  '99999999-9999-4999-8999-999999999992',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31',
  'GENERAL_POST', 'DRAFT', 'PUBLIC', 'Publish Boundary Test',
  'cccccccc-cccc-cccc-cccc-cccccccccc92'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_publish_content_post(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
    '99999999-9999-4999-8999-999999999992'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa312'::uuid
  );

  if v_result.status <> 'PUBLISHED'
     or v_result.usage_id is null
     or v_result.usage_quota_status <> 'OK'
     or v_result.idempotency_reused then
    raise exception 'content publish initial boundary failed';
  end if;
end $$;

do $$
declare
  v_result record;
  v_usage_count integer;
  v_publish_audit_count integer;
  v_status text;
begin
  select * into v_result from public.api_publish_content_post(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
    '99999999-9999-4999-8999-999999999992'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa312'::uuid
  );

  set local role postgres;
  select cp.status into v_status
  from public.content_posts cp
  where cp.id = '99999999-9999-4999-8999-999999999992'::uuid;

  select count(*) into v_usage_count
  from public.subscription_usage su
  join public.features f on f.id = su.feature_id
  where su.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid
    and f.code = 'POSTS'
    and su.used_quantity = 1;

  select count(*) into v_publish_audit_count
  from public.audit_logs al
  where al.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid
    and al.entity_type = 'content_post'
    and al.action = 'content.publish'
    and al.request_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa312'::uuid;

  if not v_result.idempotency_reused
     or v_status <> 'PUBLISHED'
     or v_usage_count <> 1
     or v_publish_audit_count <> 1 then
    raise exception 'content publish idempotency or atomic meter failed';
  end if;

  set local role service_role;
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_publish_content_post(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31'::uuid,
      '99999999-9999-4999-8999-999999999992'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa313'::uuid
    );
    raise exception 'authenticated content publish RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.content_posts set title = 'direct write';
    raise exception 'direct content post update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'content_publish_usage_boundary|pass';
rollback;
