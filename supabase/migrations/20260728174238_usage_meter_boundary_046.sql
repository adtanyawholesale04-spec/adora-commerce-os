-- ADORA Commerce OS (ACOS)
-- Track B: V1 aggregate usage meter boundary 046
--
-- Owner-approved decisions:
-- - reuse subscription_usage as the aggregate store;
-- - add idempotent Track B METERED feature seeds;
-- - use service-role-only atomic upsert with audit-backed retry protection;
-- - fail closed for high-cost usage without an entitlement or over limit;
-- - defer usage_meter_events and commercial billing behavior.

insert into public.features (code, name, description, feature_type, unit, status)
values
  ('CUSTOMERS', 'Customers', 'Track B customer usage', 'METERED', 'customers', 'ACTIVE'),
  ('POSTS', 'Posts', 'Track B content post usage', 'METERED', 'posts', 'ACTIVE'),
  ('MEDIA_STORAGE_BYTES', 'Media storage', 'Track B media storage usage', 'METERED', 'bytes', 'ACTIVE'),
  ('MEDIA_UPLOADS', 'Media uploads', 'Track B media upload usage', 'METERED', 'uploads', 'ACTIVE'),
  ('FEED_EVENTS', 'Feed events', 'Track B feed event usage', 'METERED', 'events', 'ACTIVE'),
  ('CAMPAIGN_RECIPIENTS', 'Campaign recipients', 'Track B campaign recipient usage', 'METERED', 'recipients', 'ACTIVE'),
  ('LINE_MESSAGES', 'LINE messages', 'Track B LINE message usage', 'METERED', 'messages', 'ACTIVE'),
  ('SMS_MESSAGES', 'SMS messages', 'Track B SMS message usage', 'METERED', 'messages', 'ACTIVE'),
  ('EMAIL_MESSAGES', 'Email messages', 'Track B email message usage', 'METERED', 'messages', 'ACTIVE'),
  ('AUDIENCE_SNAPSHOTS', 'Audience snapshots', 'Track B audience snapshot usage', 'METERED', 'snapshots', 'ACTIVE'),
  ('RETENTION_REFRESHES', 'Retention refreshes', 'Track B retention refresh usage', 'METERED', 'refreshes', 'ACTIVE')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    feature_type = excluded.feature_type,
    unit = excluded.unit,
    status = excluded.status;

alter table public.subscription_usage
  rename constraint subscription_usage_organization_id_feature_id_usage_period__key
  to subscription_usage_period_unique;

create or replace function public.api_record_usage_meter(
  p_organization_id uuid,
  p_feature_code text,
  p_quantity numeric,
  p_unit text,
  p_usage_period_start timestamptz,
  p_usage_period_end timestamptz,
  p_client_request_id uuid,
  p_source_module text,
  p_source_id uuid default null
)
returns table (
  usage_id uuid,
  feature_code text,
  usage_period_start timestamptz,
  usage_period_end timestamptz,
  used_quantity numeric,
  limit_value numeric,
  quota_status text,
  idempotency_reused boolean,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_service_role boolean;
  v_feature record;
  v_previous_audit record;
  v_usage record;
  v_limit numeric;
  v_high_cost boolean;
  v_quota_status text;
  v_audit_log_id uuid;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Usage metering requires server service boundary' using errcode = '42501';
  end if;

  if p_organization_id is null or nullif(trim(p_feature_code), '') is null then
    raise exception 'Organization and feature code are required' using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Usage quantity must be non-negative' using errcode = '22023';
  end if;

  if p_usage_period_start is null or p_usage_period_end is null
     or p_usage_period_end <= p_usage_period_start then
    raise exception 'Usage period must have a positive duration' using errcode = '22023';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if nullif(trim(p_unit), '') is null or nullif(trim(p_source_module), '') is null then
    raise exception 'Usage unit and source module are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_client_request_id::text,
    0
  ));

  select f.id, f.code, f.feature_type, f.unit, f.status
  into v_feature
  from public.features f
  where f.code = trim(p_feature_code)
  limit 1;

  if v_feature.id is null or v_feature.status <> 'ACTIVE' or v_feature.feature_type <> 'METERED' then
    raise exception 'Feature is not an active metered feature' using errcode = '22023';
  end if;

  if v_feature.unit <> trim(p_unit) then
    raise exception 'Usage unit does not match feature catalog' using errcode = '22023';
  end if;

  select al.id, al.after_json, al.before_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'subscription_usage'
    and al.request_id = p_client_request_id
    and al.action in (
      'usage.meter.increment',
      'usage.meter.increment.duplicate_reused'
    )
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'feature_code' <> trim(p_feature_code)
       or v_previous_audit.before_json ->> 'unit' <> trim(p_unit)
       or (v_previous_audit.before_json ->> 'quantity')::numeric <> p_quantity
       or (v_previous_audit.before_json ->> 'usage_period_start')::timestamptz <> p_usage_period_start
       or (v_previous_audit.before_json ->> 'usage_period_end')::timestamptz <> p_usage_period_end then
      raise exception 'Idempotency key conflicts with existing usage request' using errcode = '22023';
    end if;

    usage_id := (v_previous_audit.after_json ->> 'usage_id')::uuid;
    feature_code := v_previous_audit.after_json ->> 'feature_code';
    usage_period_start := (v_previous_audit.after_json ->> 'usage_period_start')::timestamptz;
    usage_period_end := (v_previous_audit.after_json ->> 'usage_period_end')::timestamptz;
    used_quantity := (v_previous_audit.after_json ->> 'used_quantity')::numeric;
    limit_value := nullif(v_previous_audit.after_json ->> 'limit_value', '')::numeric;
    quota_status := v_previous_audit.after_json ->> 'quota_status';
    idempotency_reused := true;
    audit_log_id := v_previous_audit.id;
    return next;
    return;
  end if;

  v_high_cost := trim(p_feature_code) in (
    'MEDIA_STORAGE_BYTES', 'LINE_MESSAGES', 'SMS_MESSAGES', 'EMAIL_MESSAGES'
  );

  select oe.limit_value
  into v_limit
  from public.organization_entitlements oe
  where oe.organization_id = p_organization_id
    and oe.feature_id = v_feature.id
    and oe.enabled
    and (oe.valid_from is null or oe.valid_from <= now())
    and (oe.valid_until is null or oe.valid_until > now())
  order by oe.updated_at desc
  limit 1;

  select su.id, su.used_quantity
  into v_usage
  from public.subscription_usage su
  where su.organization_id = p_organization_id
    and su.feature_id = v_feature.id
    and su.usage_period_start = p_usage_period_start
    and su.usage_period_end = p_usage_period_end
  for update;

  if v_high_cost and v_limit is null then
    raise exception 'Entitlement limit is required for high-cost usage' using errcode = '42501';
  end if;

  if v_limit is not null and coalesce(v_usage.used_quantity, 0) + p_quantity > v_limit then
    if v_high_cost then
      raise exception 'Usage quota exceeded' using errcode = '22023';
    end if;
    v_quota_status := 'SOFT_WARNING';
  else
    v_quota_status := 'OK';
  end if;

  insert into public.subscription_usage (
    organization_id,
    feature_id,
    usage_period_start,
    usage_period_end,
    used_quantity,
    updated_at
  ) values (
    p_organization_id,
    v_feature.id,
    p_usage_period_start,
    p_usage_period_end,
    p_quantity,
    now()
  )
  on conflict on constraint subscription_usage_period_unique
  do update set
    used_quantity = public.subscription_usage.used_quantity + excluded.used_quantity,
    updated_at = now()
  returning public.subscription_usage.id, public.subscription_usage.used_quantity into v_usage;

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
    'subscription_usage',
    v_usage.id,
    'usage.meter.increment',
    jsonb_build_object(
      'feature_code', trim(p_feature_code),
      'quantity', p_quantity,
      'unit', trim(p_unit),
      'usage_period_start', p_usage_period_start,
      'usage_period_end', p_usage_period_end,
      'source_module', trim(p_source_module),
      'source_id', p_source_id
    ),
    jsonb_build_object(
      'usage_id', v_usage.id,
      'feature_code', trim(p_feature_code),
      'usage_period_start', p_usage_period_start,
      'usage_period_end', p_usage_period_end,
      'used_quantity', v_usage.used_quantity,
      'limit_value', v_limit,
      'quota_status', v_quota_status
    ),
    'usage_meter_incremented',
    p_client_request_id
  )
  returning id into v_audit_log_id;

  usage_id := v_usage.id;
  feature_code := trim(p_feature_code);
  usage_period_start := p_usage_period_start;
  usage_period_end := p_usage_period_end;
  used_quantity := v_usage.used_quantity;
  limit_value := v_limit;
  quota_status := v_quota_status;
  idempotency_reused := false;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

alter table public.subscription_usage enable row level security;
alter table public.organization_entitlements enable row level security;

revoke insert, update, delete on table public.subscription_usage from public, anon, authenticated;
revoke insert, update, delete on table public.organization_entitlements from public, anon, authenticated;

revoke execute on function public.api_record_usage_meter(
  uuid, text, numeric, text, timestamptz, timestamptz, uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.api_record_usage_meter(
  uuid, text, numeric, text, timestamptz, timestamptz, uuid, text, uuid
) to service_role;
