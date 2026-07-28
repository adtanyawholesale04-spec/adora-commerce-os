-- ADORA Commerce OS (ACOS)
-- Track B: Messaging usage reservation guarded service boundary
--
-- Owner-approved decisions:
-- - reserve recipient/channel quota before provider dispatch;
-- - provider failure after reservation is attempted spend and is not refunded;
-- - re-check consent and suppression immediately before reservation;
-- - do not call providers from PostgreSQL.

create or replace function public.api_reserve_message_job_usage(
  p_organization_id uuid,
  p_message_job_id uuid,
  p_provider_ready boolean,
  p_client_request_id uuid
)
returns table (
  message_job_id uuid,
  status text,
  channel text,
  recipient_usage_id uuid,
  channel_usage_id uuid,
  recipient_quota_status text,
  channel_quota_status text,
  reservation_reused boolean,
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
  v_consent record;
  v_recipient_usage record;
  v_channel_usage record;
  v_audit_log_id uuid;
  v_now timestamptz := now();
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if not v_is_service_role then
    raise exception 'Message reservation requires server service boundary' using errcode = '42501';
  end if;

  if p_organization_id is null or p_message_job_id is null or p_client_request_id is null then
    raise exception 'Organization, message job, and idempotency key are required' using errcode = '22023';
  end if;

  if not coalesce(p_provider_ready, false) then
    raise exception 'Provider readiness is required before message reservation' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_client_request_id::text,
    0
  ));

  select al.id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'message_job'
    and al.request_id = p_client_request_id
    and al.action in (
      'messaging.reserve',
      'messaging.reserve.duplicate_reused',
      'messaging.reserve.suppressed',
      'messaging.reserve.no_consent'
    )
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if (v_previous_audit.after_json ->> 'message_job_id')::uuid <> p_message_job_id then
      raise exception 'Idempotency key conflicts with existing message reservation request'
        using errcode = '22023';
    end if;

    message_job_id := p_message_job_id;
    status := v_previous_audit.after_json ->> 'status';
    channel := v_previous_audit.after_json ->> 'channel';
    recipient_usage_id := nullif(v_previous_audit.after_json ->> 'recipient_usage_id', '')::uuid;
    channel_usage_id := nullif(v_previous_audit.after_json ->> 'channel_usage_id', '')::uuid;
    recipient_quota_status := v_previous_audit.after_json ->> 'recipient_quota_status';
    channel_quota_status := v_previous_audit.after_json ->> 'channel_quota_status';
    reservation_reused := true;
    audit_log_id := v_previous_audit.id;
    return next;
    return;
  end if;

  select mj.*
  into v_job
  from public.message_jobs mj
  where mj.organization_id = p_organization_id
    and mj.id = p_message_job_id
  for update;

  if v_job.id is null then
    raise exception 'Message job is not available' using errcode = '22023';
  end if;

  if v_job.status not in ('PENDING', 'QUEUED') then
    raise exception 'Message job is not reservable from its current state' using errcode = '22023';
  end if;

  select cc.status, cc.destination
  into v_consent
  from public.customer_consents cc
  where cc.organization_id = p_organization_id
    and cc.customer_id = v_job.customer_id
    and cc.channel = v_job.channel
    and cc.purpose = v_job.purpose
    and cc.status = 'GRANTED'
    and (cc.destination is null or cc.destination = v_job.destination)
  order by cc.updated_at desc
  limit 1;

  if v_consent.status is null then
    update public.message_jobs
    set status = 'SKIPPED_NO_CONSENT',
        updated_at = v_now
    where organization_id = p_organization_id and id = p_message_job_id;

    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, null, 'SYSTEM', 'message_job', p_message_job_id,
      'messaging.reserve.no_consent',
      jsonb_build_object('message_job_id', p_message_job_id, 'status', v_job.status),
      jsonb_build_object('message_job_id', p_message_job_id, 'status', 'SKIPPED_NO_CONSENT', 'channel', v_job.channel),
      'message_reservation_blocked_no_consent', p_client_request_id
    ) returning id into v_audit_log_id;

    message_job_id := p_message_job_id;
    status := 'SKIPPED_NO_CONSENT';
    channel := v_job.channel;
    reservation_reused := false;
    audit_log_id := v_audit_log_id;
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.customer_suppressions cs
    where cs.organization_id = p_organization_id
      and (cs.customer_id is null or cs.customer_id = v_job.customer_id)
      and cs.channel = v_job.channel
      and (cs.purpose is null or cs.purpose = v_job.purpose)
      and (cs.destination is null or cs.destination = v_job.destination)
      and cs.starts_at <= v_now
      and (cs.ends_at is null or cs.ends_at > v_now)
  ) then
    update public.message_jobs
    set status = 'SUPPRESSED', updated_at = v_now
    where organization_id = p_organization_id and id = p_message_job_id;

    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, null, 'SYSTEM', 'message_job', p_message_job_id,
      'messaging.reserve.suppressed',
      jsonb_build_object('message_job_id', p_message_job_id, 'status', v_job.status),
      jsonb_build_object('message_job_id', p_message_job_id, 'status', 'SUPPRESSED', 'channel', v_job.channel),
      'message_reservation_blocked_suppression', p_client_request_id
    ) returning id into v_audit_log_id;

    message_job_id := p_message_job_id;
    status := 'SUPPRESSED';
    channel := v_job.channel;
    reservation_reused := false;
    audit_log_id := v_audit_log_id;
    return next;
    return;
  end if;

  v_period_start := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';
  v_period_end := v_period_start + interval '1 month';

  select null::uuid as usage_id, null::text as quota_status into v_recipient_usage;

  if v_job.marketing_campaign_id is not null or v_job.campaign_run_id is not null then
    select * into v_recipient_usage
    from public.api_record_usage_meter(
      p_organization_id, 'CAMPAIGN_RECIPIENTS', 1, 'recipients',
      v_period_start, v_period_end, gen_random_uuid(),
      'MESSAGE_RESERVATION', p_message_job_id
    );
  end if;

  select * into v_channel_usage
  from public.api_record_usage_meter(
    p_organization_id,
    case v_job.channel
      when 'LINE' then 'LINE_MESSAGES'
      when 'SMS' then 'SMS_MESSAGES'
      when 'EMAIL' then 'EMAIL_MESSAGES'
    end,
    1,
    'messages',
    v_period_start,
    v_period_end,
    p_client_request_id,
    'MESSAGE_RESERVATION',
    p_message_job_id
  );

  update public.message_jobs
  set status = 'SENDING',
      queued_at = coalesce(queued_at, v_now),
      updated_at = v_now
  where organization_id = p_organization_id and id = p_message_job_id;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'message_job', p_message_job_id,
    'messaging.reserve',
    jsonb_build_object('message_job_id', p_message_job_id, 'status', v_job.status),
    jsonb_build_object(
      'message_job_id', p_message_job_id,
      'status', 'SENDING',
      'channel', v_job.channel,
      'recipient_usage_id', v_recipient_usage.usage_id,
      'channel_usage_id', v_channel_usage.usage_id,
      'recipient_quota_status', v_recipient_usage.quota_status,
      'channel_quota_status', v_channel_usage.quota_status
    ),
    'message_usage_reserved_attempted_spend', p_client_request_id
  ) returning id into v_audit_log_id;

  message_job_id := p_message_job_id;
  status := 'SENDING';
  channel := v_job.channel;
  recipient_usage_id := v_recipient_usage.usage_id;
  channel_usage_id := v_channel_usage.usage_id;
  recipient_quota_status := v_recipient_usage.quota_status;
  channel_quota_status := v_channel_usage.quota_status;
  reservation_reused := false;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

revoke execute on function public.api_reserve_message_job_usage(uuid, uuid, boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.api_reserve_message_job_usage(uuid, uuid, boolean, uuid)
  to service_role;
