-- ADORA Commerce OS (ACOS)
-- Track B: Content publish + POSTS usage guarded service boundary
--
-- Owner-approved integration decisions:
-- - count one POSTS unit on a successful guarded transition to PUBLISHED;
-- - use the content post ID as the source reference;
-- - meter and publish in one transaction;
-- - keep direct browser writes disabled and do not use database triggers.

create or replace function public.api_publish_content_post(
  p_organization_id uuid,
  p_content_post_id uuid,
  p_client_request_id uuid
)
returns table (
  content_post_id uuid,
  status text,
  published_at timestamptz,
  usage_id uuid,
  usage_quota_status text,
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
  v_post record;
  v_usage record;
  v_audit_log_id uuid;
  v_published_at timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Content publishing requires server service boundary'
      using errcode = '42501';
  end if;

  if p_organization_id is null or p_content_post_id is null then
    raise exception 'Organization and content post are required' using errcode = '22023';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_client_request_id::text,
    0
  ));

  select al.id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'content_post'
    and al.request_id = p_client_request_id
    and al.action in ('content.publish', 'content.publish.duplicate_reused')
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if (v_previous_audit.after_json ->> 'content_post_id')::uuid <> p_content_post_id then
      raise exception 'Idempotency key conflicts with existing content publish request'
        using errcode = '22023';
    end if;

    content_post_id := (v_previous_audit.after_json ->> 'content_post_id')::uuid;
    status := v_previous_audit.after_json ->> 'status';
    published_at := (v_previous_audit.after_json ->> 'published_at')::timestamptz;
    usage_id := (v_previous_audit.after_json ->> 'usage_id')::uuid;
    usage_quota_status := v_previous_audit.after_json ->> 'usage_quota_status';
    idempotency_reused := true;
    audit_log_id := v_previous_audit.id;
    return next;
    return;
  end if;

  select cp.id, cp.status, cp.visibility, cp.scheduled_at, cp.deleted_at
  into v_post
  from public.content_posts cp
  where cp.organization_id = p_organization_id
    and cp.id = p_content_post_id
  for update;

  if v_post.id is null then
    raise exception 'Content post is not available for publishing' using errcode = '22023';
  end if;

  if v_post.deleted_at is not null or v_post.status not in ('DRAFT', 'SCHEDULED') then
    raise exception 'Content post is not publishable from its current state'
      using errcode = '22023';
  end if;

  if v_post.status = 'SCHEDULED'
     and v_post.scheduled_at is not null
     and v_post.scheduled_at > now() then
    raise exception 'Scheduled content cannot publish before its scheduled time'
      using errcode = '22023';
  end if;

  v_published_at := now();
  v_period_start := date_trunc('month', v_published_at at time zone 'UTC') at time zone 'UTC';
  v_period_end := v_period_start + interval '1 month';

  update public.content_posts
  set status = 'PUBLISHED',
      published_at = v_published_at,
      updated_at = v_published_at
  where organization_id = p_organization_id
    and id = p_content_post_id;

  select *
  into v_usage
  from public.api_record_usage_meter(
    p_organization_id,
    'POSTS',
    1,
    'posts',
    v_period_start,
    v_period_end,
    p_client_request_id,
    'CONTENT_PUBLISH',
    p_content_post_id
  );

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    request_id
  ) values (
    p_organization_id,
    null,
    'SYSTEM',
    'content_post',
    p_content_post_id,
    'content.publish',
    jsonb_build_object(
      'content_post_id', p_content_post_id,
      'organization_id', p_organization_id,
      'status', v_post.status,
      'client_request_id', p_client_request_id
    ),
    jsonb_build_object(
      'content_post_id', p_content_post_id,
      'status', 'PUBLISHED',
      'published_at', v_published_at,
      'usage_id', v_usage.usage_id,
      'usage_quota_status', v_usage.quota_status
    ),
    'content_published_and_metered',
    p_client_request_id
  )
  returning id into v_audit_log_id;

  content_post_id := p_content_post_id;
  status := 'PUBLISHED';
  published_at := v_published_at;
  usage_id := v_usage.usage_id;
  usage_quota_status := v_usage.quota_status;
  idempotency_reused := false;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

revoke execute on function public.api_publish_content_post(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.api_publish_content_post(uuid, uuid, uuid)
  to service_role;
