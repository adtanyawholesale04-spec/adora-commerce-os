-- Customer Portal consent mutation.
-- This changes consent state and append-only history only; it never dispatches messages.

create or replace function public.api_update_customer_portal_consent(
  p_organization_id uuid,
  p_channel text,
  p_purpose text,
  p_status text,
  p_destination text default null,
  p_policy_version text default null,
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_consent_id uuid;
  v_previous_status text;
  v_destination text;
  v_granted_at timestamptz;
  v_revoked_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_channel not in ('LINE', 'SMS', 'EMAIL', 'PHONE') then raise exception 'Unsupported consent channel' using errcode = '22023'; end if;
  if p_purpose not in ('ORDER_UPDATE', 'LIVE_NOTIFICATION', 'PROMOTION', 'NEW_PRODUCT', 'LOYALTY', 'CONTENT_UPDATE') then raise exception 'Unsupported consent purpose' using errcode = '22023'; end if;
  if p_status not in ('GRANTED', 'REVOKED', 'UNKNOWN') then raise exception 'Unsupported consent status' using errcode = '22023'; end if;

  v_destination := case
    when p_destination is null then null
    when p_channel = 'EMAIL' then lower(trim(p_destination))
    when p_channel = 'PHONE' then regexp_replace(trim(p_destination), '[^0-9+]', '', 'g')
    else trim(p_destination)
  end;
  if p_channel in ('EMAIL', 'PHONE') and nullif(v_destination, '') is null then
    raise exception 'Destination is required for email and phone consent' using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();
  select l.customer_id into v_customer_id
  from public.customer_profile_links l
  join public.organization_memberships om on om.organization_id = l.organization_id and om.profile_id = l.profile_id and om.status = 'ACTIVE'
  where l.organization_id = p_organization_id and l.profile_id = v_profile_id and l.link_status = 'ACTIVE'
  limit 1;
  if v_customer_id is null then raise exception 'Active customer link required' using errcode = '42501'; end if;

  if p_client_request_id is not null and exists (
    select 1 from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_PORTAL_CONSENT_UPDATE'
  ) then
    select entity_id into v_consent_id from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_PORTAL_CONSENT_UPDATE' order by created_at desc limit 1;
    return jsonb_build_object('consent_id', v_consent_id, 'reused_existing', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || v_customer_id::text || ':' || p_channel || ':' || p_purpose || ':' || coalesce(v_destination, ''), 0
  ));

  select id, status into v_consent_id, v_previous_status
  from public.customer_consents
  where organization_id = p_organization_id and customer_id = v_customer_id
    and channel = p_channel and purpose = p_purpose and destination is not distinct from v_destination
  for update;

  v_granted_at := case when p_status = 'GRANTED' then now() else null end;
  v_revoked_at := case when p_status = 'REVOKED' then now() else null end;

  if v_consent_id is null then
    insert into public.customer_consents (
      organization_id, customer_id, channel, purpose, status, destination, source, policy_version, granted_at, revoked_at
    ) values (
      p_organization_id, v_customer_id, p_channel, p_purpose, p_status, v_destination, 'PORTAL', p_policy_version, v_granted_at, v_revoked_at
    ) returning id into v_consent_id;
  else
    update public.customer_consents set
      status = p_status,
      source = 'PORTAL',
      policy_version = coalesce(p_policy_version, policy_version),
      granted_at = v_granted_at,
      revoked_at = v_revoked_at
    where id = v_consent_id and organization_id = p_organization_id and customer_id = v_customer_id;
  end if;

  insert into public.customer_consent_events (
    organization_id, customer_id, consent_id, channel, purpose, previous_status, new_status, destination,
    source, policy_version, actor_type, actor_user_id, metadata
  ) values (
    p_organization_id, v_customer_id, v_consent_id, p_channel, p_purpose, v_previous_status, p_status, v_destination,
    'PORTAL', p_policy_version, 'CUSTOMER', v_profile_id,
    jsonb_build_object('dispatch_recheck_required', true, 'message_dispatch_triggered', false)
  );

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, after_json, reason, request_id
  ) values (
    p_organization_id, v_profile_id, 'USER', 'CUSTOMER_CONSENT', v_consent_id, 'CUSTOMER_PORTAL_CONSENT_UPDATE',
    jsonb_build_object('customer_id', v_customer_id, 'channel', p_channel, 'purpose', p_purpose, 'status', p_status, 'dispatch_triggered', false),
    'Customer Portal consent update', p_client_request_id
  );

  return jsonb_build_object('consent_id', v_consent_id, 'status', p_status, 'reused_existing', false, 'message_dispatch_triggered', false);
end;
$$;

revoke all on function public.api_update_customer_portal_consent(uuid, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.api_update_customer_portal_consent(uuid, text, text, text, text, text, uuid) to authenticated;
