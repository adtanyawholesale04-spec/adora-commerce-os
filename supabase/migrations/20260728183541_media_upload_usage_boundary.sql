-- ADORA Commerce OS (ACOS)
-- Track B: Media upload + additive Usage Meter guarded service boundary
--
-- Owner-approved integration decisions:
-- - count one MEDIA_UPLOADS unit per successful uploaded media record;
-- - count MEDIA_STORAGE_BYTES as additive upload volume only;
-- - current stored-byte quota and provider calls remain separate contracts;
-- - keep direct browser writes disabled and do not use database triggers.

create or replace function public.api_register_content_media_upload(
  p_organization_id uuid,
  p_uploaded_by_user_id uuid,
  p_content_post_id uuid,
  p_media_type text,
  p_variant text,
  p_storage_bucket text,
  p_storage_key text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_width integer,
  p_height integer,
  p_checksum text,
  p_alt_text text,
  p_sort_order integer,
  p_client_request_id uuid
)
returns table (
  media_id uuid,
  upload_status text,
  upload_usage_id uuid,
  storage_usage_id uuid,
  upload_quota_status text,
  storage_quota_status text,
  idempotency_reused boolean,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_service_role boolean;
  v_previous_audit record;
  v_media_id uuid;
  v_upload_usage record;
  v_storage_usage record;
  v_audit_log_id uuid;
  v_now timestamptz := now();
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Media upload registration requires server service boundary'
      using errcode = '42501';
  end if;

  if p_organization_id is null or p_uploaded_by_user_id is null or p_client_request_id is null then
    raise exception 'Organization, uploader, and idempotency key are required' using errcode = '22023';
  end if;

  if p_media_type not in ('IMAGE', 'DOCUMENT') then
    raise exception 'Unsupported media type' using errcode = '22023';
  end if;

  if p_variant not in ('original', 'thumbnail', 'feed', 'large') then
    raise exception 'Unsupported media variant' using errcode = '22023';
  end if;

  if nullif(trim(p_storage_bucket), '') is null
     or nullif(trim(p_storage_key), '') is null
     or nullif(trim(p_mime_type), '') is null then
    raise exception 'Storage bucket, key, and MIME type are required' using errcode = '22023';
  end if;

  if p_file_size_bytes is null or p_file_size_bytes < 0 then
    raise exception 'Media file size cannot be negative' using errcode = '22023';
  end if;

  if p_sort_order is null or p_sort_order < 0 then
    raise exception 'Media sort order cannot be negative' using errcode = '22023';
  end if;

  if p_content_post_id is not null then
    perform 1
    from public.content_posts cp
    where cp.organization_id = p_organization_id
      and cp.id = p_content_post_id
      and cp.deleted_at is null;

    if not found then
      raise exception 'Content post is not available for media attachment' using errcode = '22023';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_client_request_id::text,
    0
  ));

  select al.id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'content_media'
    and al.request_id = p_client_request_id
    and al.action in ('media.upload.register', 'media.upload.register.duplicate_reused')
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if (v_previous_audit.after_json ->> 'storage_key') <> trim(p_storage_key)
       or (v_previous_audit.after_json ->> 'file_size_bytes')::bigint <> p_file_size_bytes then
      raise exception 'Idempotency key conflicts with existing media upload request'
        using errcode = '22023';
    end if;

    media_id := (v_previous_audit.after_json ->> 'media_id')::uuid;
    upload_status := 'UPLOADED';
    upload_usage_id := (v_previous_audit.after_json ->> 'upload_usage_id')::uuid;
    storage_usage_id := (v_previous_audit.after_json ->> 'storage_usage_id')::uuid;
    upload_quota_status := v_previous_audit.after_json ->> 'upload_quota_status';
    storage_quota_status := v_previous_audit.after_json ->> 'storage_quota_status';
    idempotency_reused := true;
    audit_log_id := v_previous_audit.id;
    return next;
    return;
  end if;

  insert into public.content_media (
    organization_id,
    content_post_id,
    media_type,
    variant,
    storage_bucket,
    storage_key,
    mime_type,
    file_size_bytes,
    width,
    height,
    checksum,
    alt_text,
    sort_order,
    upload_status,
    uploaded_by_user_id,
    attached_at,
    created_at
  ) values (
    p_organization_id,
    p_content_post_id,
    p_media_type,
    p_variant,
    trim(p_storage_bucket),
    trim(p_storage_key),
    trim(p_mime_type),
    p_file_size_bytes,
    p_width,
    p_height,
    nullif(trim(p_checksum), ''),
    nullif(trim(p_alt_text), ''),
    p_sort_order,
    'UPLOADED',
    p_uploaded_by_user_id,
    case when p_content_post_id is null then null else v_now end,
    v_now
  )
  returning id into v_media_id;

  v_period_start := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';
  v_period_end := v_period_start + interval '1 month';

  select * into v_upload_usage
  from public.api_record_usage_meter(
    p_organization_id, 'MEDIA_UPLOADS', 1, 'uploads',
    v_period_start, v_period_end, p_client_request_id,
    'MEDIA_UPLOAD', v_media_id
  );

  select * into v_storage_usage
  from public.api_record_usage_meter(
    p_organization_id, 'MEDIA_STORAGE_BYTES', p_file_size_bytes, 'bytes',
    v_period_start, v_period_end,
    gen_random_uuid(),
    'MEDIA_UPLOAD_VOLUME', v_media_id
  );

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'content_media', v_media_id,
    'media.upload.register',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'storage_key', trim(p_storage_key),
      'file_size_bytes', p_file_size_bytes,
      'client_request_id', p_client_request_id
    ),
    jsonb_build_object(
      'media_id', v_media_id,
      'storage_key', trim(p_storage_key),
      'file_size_bytes', p_file_size_bytes,
      'upload_usage_id', v_upload_usage.usage_id,
      'storage_usage_id', v_storage_usage.usage_id,
      'upload_quota_status', v_upload_usage.quota_status,
      'storage_quota_status', v_storage_usage.quota_status
    ),
    'media_upload_registered_and_metered', p_client_request_id
  )
  returning id into v_audit_log_id;

  media_id := v_media_id;
  upload_status := 'UPLOADED';
  upload_usage_id := v_upload_usage.usage_id;
  storage_usage_id := v_storage_usage.usage_id;
  upload_quota_status := v_upload_usage.quota_status;
  storage_quota_status := v_storage_usage.quota_status;
  idempotency_reused := false;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

revoke execute on function public.api_register_content_media_upload(
  uuid, uuid, uuid, text, text, text, text, text, bigint, integer, integer,
  text, text, integer, uuid
) from public, anon, authenticated;
grant execute on function public.api_register_content_media_upload(
  uuid, uuid, uuid, text, text, text, text, text, bigint, integer, integer,
  text, text, integer, uuid
) to service_role;
