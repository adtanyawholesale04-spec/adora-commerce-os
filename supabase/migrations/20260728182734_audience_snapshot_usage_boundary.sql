-- ADORA Commerce OS (ACOS)
-- Track B: Audience snapshot + AUDIENCE_SNAPSHOTS usage guarded service boundary
--
-- Owner-approved integration decisions:
-- - count one AUDIENCE_SNAPSHOTS unit per successful immutable snapshot;
-- - materialize snapshot members in the same guarded transaction;
-- - use service-generated idempotency and no database trigger;
-- - keep direct browser writes disabled.

create or replace function public.api_create_audience_snapshot(
  p_organization_id uuid,
  p_created_by_user_id uuid,
  p_audience_segment_id uuid,
  p_name text,
  p_source_type text,
  p_criteria_hash text,
  p_criteria_json jsonb,
  p_members jsonb,
  p_client_request_id uuid
)
returns table (
  snapshot_id uuid,
  member_count integer,
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
  v_snapshot_id uuid;
  v_usage record;
  v_audit_log_id uuid;
  v_member_count integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_now timestamptz := now();
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Audience snapshot creation requires server service boundary'
      using errcode = '42501';
  end if;

  if p_organization_id is null or p_created_by_user_id is null or p_client_request_id is null then
    raise exception 'Organization, creator, and idempotency key are required' using errcode = '22023';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Audience snapshot name is required' using errcode = '22023';
  end if;

  if p_source_type not in ('SEGMENT', 'RULE', 'MANUAL') then
    raise exception 'Unsupported audience snapshot source type' using errcode = '22023';
  end if;

  if p_members is null or jsonb_typeof(p_members) <> 'array' then
    raise exception 'Audience snapshot members must be a JSON array' using errcode = '22023';
  end if;

  if p_criteria_json is not null and jsonb_typeof(p_criteria_json) <> 'object' then
    raise exception 'Audience snapshot criteria must be a JSON object' using errcode = '22023';
  end if;

  if p_audience_segment_id is not null then
    perform 1
    from public.audience_segments s
    where s.organization_id = p_organization_id
      and s.id = p_audience_segment_id
      and s.status = 'ACTIVE';

    if not found then
      raise exception 'Audience segment is not active or does not belong to organization'
        using errcode = '22023';
    end if;
  end if;

  v_member_count := jsonb_array_length(p_members);

  if exists (
    select 1
    from jsonb_array_elements(p_members) as member(value)
    where jsonb_typeof(member.value) <> 'object'
      or nullif(trim(member.value ->> 'customer_id'), '') is null
  ) then
    raise exception 'Every audience snapshot member requires a customer_id'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_members) as member(value)
    where member.value ? 'eligibility_reason'
      and member.value -> 'eligibility_reason' is not null
      and jsonb_typeof(member.value -> 'eligibility_reason') <> 'object'
  ) then
    raise exception 'Audience member eligibility_reason must be a JSON object'
      using errcode = '22023';
  end if;

  if (
    select count(distinct (member.value ->> 'customer_id')::uuid)
    from jsonb_array_elements(p_members) as member(value)
  ) <> v_member_count then
    raise exception 'Audience snapshot members cannot contain duplicate customers'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_client_request_id::text,
    0
  ));

  select al.id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'audience_snapshot'
    and al.request_id = p_client_request_id
    and al.action in ('audience.snapshot.create', 'audience.snapshot.create.duplicate_reused')
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if (v_previous_audit.after_json ->> 'name') <> trim(p_name)
       or (v_previous_audit.after_json ->> 'source_type') <> p_source_type
       or (v_previous_audit.after_json ->> 'member_count')::integer <> v_member_count then
      raise exception 'Idempotency key conflicts with existing audience snapshot request'
        using errcode = '22023';
    end if;

    snapshot_id := (v_previous_audit.after_json ->> 'snapshot_id')::uuid;
    member_count := (v_previous_audit.after_json ->> 'member_count')::integer;
    usage_id := (v_previous_audit.after_json ->> 'usage_id')::uuid;
    usage_quota_status := v_previous_audit.after_json ->> 'usage_quota_status';
    idempotency_reused := true;
    audit_log_id := v_previous_audit.id;
    return next;
    return;
  end if;

  insert into public.audience_snapshots (
    organization_id,
    audience_segment_id,
    name,
    source_type,
    criteria_hash,
    criteria_json,
    member_count,
    created_by_user_id,
    created_at
  ) values (
    p_organization_id,
    p_audience_segment_id,
    trim(p_name),
    p_source_type,
    nullif(trim(p_criteria_hash), ''),
    p_criteria_json,
    v_member_count,
    p_created_by_user_id,
    v_now
  )
  returning id into v_snapshot_id;

  insert into public.audience_snapshot_members (
    organization_id,
    audience_snapshot_id,
    customer_id,
    eligibility_reason,
    created_at
  )
  select
    p_organization_id,
    v_snapshot_id,
    (member.value ->> 'customer_id')::uuid,
    case
      when member.value ? 'eligibility_reason'
        then member.value -> 'eligibility_reason'
      else null
    end,
    v_now
  from jsonb_array_elements(p_members) as member(value);

  v_period_start := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';
  v_period_end := v_period_start + interval '1 month';

  select *
  into v_usage
  from public.api_record_usage_meter(
    p_organization_id,
    'AUDIENCE_SNAPSHOTS',
    1,
    'snapshots',
    v_period_start,
    v_period_end,
    p_client_request_id,
    'AUDIENCE_SNAPSHOT',
    v_snapshot_id
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
    'audience_snapshot',
    v_snapshot_id,
    'audience.snapshot.create',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'name', trim(p_name),
      'source_type', p_source_type,
      'member_count', v_member_count,
      'client_request_id', p_client_request_id
    ),
    jsonb_build_object(
      'snapshot_id', v_snapshot_id,
      'name', trim(p_name),
      'source_type', p_source_type,
      'member_count', v_member_count,
      'usage_id', v_usage.usage_id,
      'usage_quota_status', v_usage.quota_status
    ),
    'audience_snapshot_created_and_metered',
    p_client_request_id
  )
  returning id into v_audit_log_id;

  snapshot_id := v_snapshot_id;
  member_count := v_member_count;
  usage_id := v_usage.usage_id;
  usage_quota_status := v_usage.quota_status;
  idempotency_reused := false;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

revoke execute on function public.api_create_audience_snapshot(uuid, uuid, uuid, text, text, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.api_create_audience_snapshot(uuid, uuid, uuid, text, text, text, jsonb, jsonb, uuid)
  to service_role;
