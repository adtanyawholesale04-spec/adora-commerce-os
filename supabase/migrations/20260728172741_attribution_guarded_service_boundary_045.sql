-- ADORA Commerce OS (ACOS)
-- Track B: Guarded Attribution Record Service Boundary
--
-- Purpose:
-- - Keep attribution event ingestion behind a server/service-role boundary.
-- - Validate event identity/source semantics before inserting append-only history.
-- - Use audit request_id as the idempotency record without changing Migration 044 tables.
-- - Do not enable customer reminder scheduling, provider calls, or new permissions.

create or replace function public.api_record_attribution_event(
  p_organization_id uuid,
  p_event_type text,
  p_client_request_id uuid,
  p_customer_id uuid default null,
  p_anonymous_id text default null,
  p_content_post_id uuid default null,
  p_marketing_campaign_id uuid default null,
  p_campaign_run_id uuid default null,
  p_message_job_id uuid default null,
  p_order_id uuid default null,
  p_attributed_revenue numeric default null,
  p_attribution_model text default null,
  p_occurred_at timestamptz default null,
  p_metadata jsonb default null
)
returns table (
  event_id uuid,
  idempotency_reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_service_role boolean;
  v_previous_audit record;
  v_event_id uuid;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Attribution event recording requires server service boundary'
      using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'Organization is required' using errcode = '22023';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if p_event_type not in (
    'CONTENT_VIEW', 'CAMPAIGN_CLICK', 'MESSAGE_CLICK',
    'ORDER_PLACED', 'ORDER_PAID', 'ATTRIBUTED_REVENUE'
  ) then
    raise exception 'Unsupported attribution event type' using errcode = '22023';
  end if;

  if p_customer_id is null and nullif(trim(coalesce(p_anonymous_id, '')), '') is null then
    raise exception 'Customer or anonymous identity is required' using errcode = '22023';
  end if;

  if p_attribution_model is not null and p_attribution_model <> 'LAST_CLICK_7D' then
    raise exception 'Unsupported attribution model' using errcode = '22023';
  end if;

  if p_attributed_revenue is not null and p_attributed_revenue < 0 then
    raise exception 'Attributed revenue cannot be negative' using errcode = '22023';
  end if;

  if p_event_type = 'CONTENT_VIEW' and p_content_post_id is null then
    raise exception 'Content view requires content post' using errcode = '22023';
  elsif p_event_type = 'CAMPAIGN_CLICK' and p_marketing_campaign_id is null then
    raise exception 'Campaign click requires marketing campaign' using errcode = '22023';
  elsif p_event_type = 'MESSAGE_CLICK' and p_message_job_id is null then
    raise exception 'Message click requires message job' using errcode = '22023';
  elsif p_event_type in ('ORDER_PLACED', 'ORDER_PAID') and p_order_id is null then
    raise exception 'Order event requires order' using errcode = '22023';
  elsif p_event_type = 'ATTRIBUTED_REVENUE'
    and (p_order_id is null or p_attributed_revenue is null or p_attribution_model is null) then
    raise exception 'Attributed revenue requires order, revenue, and model' using errcode = '22023';
  end if;

  if p_metadata is not null and jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Attribution metadata must be a JSON object' using errcode = '22023';
  end if;

  select al.id, al.after_json, al.before_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'attribution_event'
    and al.request_id = p_client_request_id
    and al.action in (
      'engagement.attribution.record',
      'engagement.attribution.record.duplicate_reused'
    )
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'event_type' <> p_event_type
       or v_previous_audit.before_json ->> 'organization_id' <> p_organization_id::text
       or coalesce(v_previous_audit.before_json ->> 'customer_id', '')
          <> coalesce(p_customer_id::text, '')
       or coalesce(v_previous_audit.before_json ->> 'content_post_id', '')
          <> coalesce(p_content_post_id::text, '') then
      raise exception 'Idempotency key conflicts with existing attribution request'
        using errcode = '22023';
    end if;

    event_id := (v_previous_audit.after_json ->> 'event_id')::uuid;
    idempotency_reused := true;
    return next;
    return;
  end if;

  insert into public.attribution_events (
    organization_id,
    event_type,
    customer_id,
    anonymous_id,
    content_post_id,
    marketing_campaign_id,
    campaign_run_id,
    message_job_id,
    order_id,
    attributed_revenue,
    attribution_model,
    occurred_at,
    metadata
  ) values (
    p_organization_id,
    p_event_type,
    p_customer_id,
    nullif(trim(p_anonymous_id), ''),
    p_content_post_id,
    p_marketing_campaign_id,
    p_campaign_run_id,
    p_message_job_id,
    p_order_id,
    p_attributed_revenue,
    p_attribution_model,
    coalesce(p_occurred_at, now()),
    p_metadata
  )
  returning id into v_event_id;

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
    'attribution_event',
    v_event_id,
    'engagement.attribution.record',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'event_type', p_event_type,
      'customer_id', p_customer_id,
      'content_post_id', p_content_post_id,
      'client_request_id', p_client_request_id
    ),
    jsonb_build_object(
      'event_id', v_event_id,
      'event_type', p_event_type,
      'source', 'server_service_boundary'
    ),
    'attribution_event_recorded',
    p_client_request_id
  );

  event_id := v_event_id;
  idempotency_reused := false;
  return next;
end;
$$;

revoke execute on function public.api_record_attribution_event(
  uuid, text, uuid, uuid, text, uuid, uuid, uuid, uuid, uuid,
  numeric, text, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.api_record_attribution_event(
  uuid, text, uuid, uuid, text, uuid, uuid, uuid, uuid, uuid,
  numeric, text, timestamptz, jsonb
) to service_role;
