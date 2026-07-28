\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa331', 'authenticated', 'authenticated', 'media-upload@example.test', now(), '{"provider":"email"}', '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33', 'Media Upload Org', 'media-upload-org', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccc94', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa331', 'Media Upload Actor', 'ACTIVE');

set local role postgres;

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, limit_value, valid_from
)
select
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid,
  id,
  'MANUAL_OVERRIDE',
  true,
  100000,
  now()
from public.features
where code = 'MEDIA_STORAGE_BYTES';

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result record;
begin
  select * into v_result from public.api_register_content_media_upload(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc94'::uuid,
    null,
    'IMAGE', 'original', 'media', 'uploads/test-image.jpg', 'image/jpeg',
    2048, 1200, 800, 'checksum-001', 'Test image', 0,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa332'::uuid
  );

  if v_result.media_id is null
     or v_result.upload_status <> 'UPLOADED'
     or v_result.upload_usage_id is null
     or v_result.storage_usage_id is null
     or v_result.storage_quota_status <> 'OK'
     or v_result.idempotency_reused then
    raise exception 'media upload initial boundary failed';
  end if;
end $$;

do $$
declare
  v_result record;
  v_media_count integer;
  v_upload_usage_count integer;
  v_storage_usage numeric;
begin
  select * into v_result from public.api_register_content_media_upload(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc94'::uuid,
    null,
    'IMAGE', 'original', 'media', 'uploads/test-image.jpg', 'image/jpeg',
    2048, 1200, 800, 'checksum-001', 'Test image', 0,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa332'::uuid
  );

  set local role postgres;
  select count(*) into v_media_count
  from public.content_media
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid;

  select count(*) into v_upload_usage_count
  from public.subscription_usage su
  join public.features f on f.id = su.feature_id
  where su.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid
    and f.code = 'MEDIA_UPLOADS'
    and su.used_quantity = 1;

  select su.used_quantity into v_storage_usage
  from public.subscription_usage su
  join public.features f on f.id = su.feature_id
  where su.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid
    and f.code = 'MEDIA_STORAGE_BYTES';

  if not v_result.idempotency_reused
     or v_media_count <> 1
     or v_upload_usage_count <> 1
     or v_storage_usage <> 2048 then
    raise exception 'media upload idempotency or meter aggregation failed';
  end if;

  set local role service_role;
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  begin
    perform public.api_register_content_media_upload(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb33'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccc94'::uuid,
      null,
      'IMAGE', 'original', 'media', 'uploads/denied.jpg', 'image/jpeg',
      100, null, null, null, null, 0,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa333'::uuid
    );
    raise exception 'authenticated media upload RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.content_media set alt_text = 'direct write';
    raise exception 'direct content media update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'media_upload_usage_boundary|pass';
rollback;
