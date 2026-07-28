-- ADORA Commerce OS (ACOS)
-- Track B: Guarded append-only message delivery-attempt persistence boundary
--
-- Owner-approved decisions:
-- - delivery attempts are append-only provider evidence;
-- - provider failure after reservation remains attempted spend;
-- - provider errors are sanitized before persistence;
-- - direct browser writes remain disabled.

create or replace function public.api_record_message_delivery_attempt(
  p_organization_id uuid,
  p_message_job_id uuid,
  p_provider text,
  p_attempt_status text,
  p_provider_message_id text,
  p_provider_error_code text,
  p_provider_error_message text,
  p_response_metadata jsonb,
  p_client_request_id uuid
)
returns table (
  attempt_id uuid,
  attempt_no integer,
  message_job_status text,
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
  v_job record;
  v_attempt_id uuid;
  v_attempt_no integer;
  v_audit_log_id uuid;
  v_job_status text;
  v_now timestamptz := now();
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Delivery attempt recording requires server service boundary'
      using errcode = '42501';
  end if;

  if p_organization_id is null or p_message_job_id is null or p_client_request_id is null then
    raise exception 'Organization, message job, and idempotency key are required' using errcode = '22023';
  end if;

  if nullif(trim(p_provider), '') is null then
    raise exception 'Provider is required' using errcode = '22023';
  end if;

  if p_attempt_status not in ('SENT', 'DELIVERED', 'FAILED', 'CANCELLED') then
    raise exception 'Unsupported delivery attempt status' using errcode = '22023';
  end if;

  if p_response_metadata is not null and jsonb_typeof(p_response_metadata) <> 'object' then
    raise exception 'Response metadata must be a JSON object' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_client_request_id::text,
    0
  ));

  select al.id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'message_delivery_attempt'
    and al.request_id = p_client_request_id
    and al.action in ('messaging.delivery_attempt.record', 'messaging.delivery_attempt.duplicate_reused')
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if (v_previous_audit.after_json ->> 'message_job_id')::uuid <> p_message_job_id then
      raise exception 'Idempotency key conflicts with existing delivery attempt request'
        using errcode = '22023';
    end if;

    attempt_id := (v_previous_audit.after_json ->> 'attempt_id')::uuid;
    attempt_no := (v_previous_audit.after_json ->> 'attempt_no')::integer;
    message_job_status := v_previous_audit.after_json ->> 'message_job_status';
    idempotency_reused := true;
    audit_log_id := v_previous_audit.id;
    return next;
    return;
  end if;

  select mj.id, mj.status
  into v_job
  from public.message_jobs mj
  where mj.organization_id = p_organization_id
    and mj.id = p_message_job_id
  for update;

  if v_job.id is null then
    raise exception 'Message job is not available' using errcode = '22023';
  end if;

  if v_job.status <> 'SENDING' then
    raise exception 'Delivery attempt requires a message job in SENDING state'
      using errcode = '22023';
  end if;

  select coalesce(max(mda.attempt_no), 0) + 1
  into v_attempt_no
  from public.message_delivery_attempts mda
  where mda.organization_id = p_organization_id
    and mda.message_job_id = p_message_job_id;

  insert into public.message_delivery_attempts (
    organization_id,
    message_job_id,
    provider,
    attempt_no,
    status,
    provider_message_id,
    provider_error_code,
    provider_error_message,
    attempted_at,
    response_metadata
  ) values (
    p_organization_id,
    p_message_job_id,
    trim(p_provider),
    v_attempt_no,
    p_attempt_status,
    nullif(trim(p_provider_message_id), ''),
    nullif(trim(p_provider_error_code), ''),
    left(nullif(trim(p_provider_error_message), ''), 160),
    v_now,
    p_response_metadata
  )
  returning id into v_attempt_id;

  v_job_status := case p_attempt_status
    when 'SENT' then 'SENT'
    when 'DELIVERED' then 'DELIVERED'
    when 'FAILED' then 'FAILED'
    else 'CANCELLED'
  end;

  update public.message_jobs
  set status = v_job_status,
      sent_at = case when p_attempt_status in ('SENT', 'DELIVERED') then coalesce(sent_at, v_now) else sent_at end,
      delivered_at = case when p_attempt_status = 'DELIVERED' then v_now else delivered_at end,
      failed_at = case when p_attempt_status = 'FAILED' then v_now else failed_at end,
      cancelled_at = case when p_attempt_status = 'CANCELLED' then v_now else cancelled_at end,
      failure_code = case when p_attempt_status = 'FAILED' then nullif(trim(p_provider_error_code), '') else failure_code end,
      failure_reason = case when p_attempt_status = 'FAILED' then left(nullif(trim(p_provider_error_message), ''), 160) else failure_reason end,
      updated_at = v_now
  where organization_id = p_organization_id
    and id = p_message_job_id;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'message_delivery_attempt', v_attempt_id,
    'messaging.delivery_attempt.record',
    jsonb_build_object(
      'message_job_id', p_message_job_id,
      'provider', trim(p_provider),
      'status', p_attempt_status,
      'attempt_no', v_attempt_no
    ),
    jsonb_build_object(
      'attempt_id', v_attempt_id,
      'message_job_id', p_message_job_id,
      'attempt_no', v_attempt_no,
      'message_job_status', v_job_status,
      'status', p_attempt_status
    ),
    'message_delivery_attempt_recorded', p_client_request_id
  )
  returning id into v_audit_log_id;

  attempt_id := v_attempt_id;
  attempt_no := v_attempt_no;
  message_job_status := v_job_status;
  idempotency_reused := false;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

revoke execute on function public.api_record_message_delivery_attempt(
  uuid, uuid, text, text, text, text, text, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.api_record_message_delivery_attempt(
  uuid, uuid, text, text, text, text, text, jsonb, uuid
) to service_role;
