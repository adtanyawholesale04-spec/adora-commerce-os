-- ADORA Commerce OS (ACOS)
-- 043_shipping_workflow_wrappers.sql
--
-- Purpose:
-- - Complete the post-label fulfillment flow through guarded RPC functions.
-- - Keep QC completion, shipment handoff, and carrier tracking updates auditable.

revoke insert on table public.tracking_events from authenticated;

create or replace function public.api_complete_qc_session(
  p_organization_id uuid,
  p_qc_session_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_fulfillment_id uuid;
  v_status varchar;
  v_total_count integer;
  v_blocking_count integer;
  v_completed_status varchar;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'warehouse.qc') then
    raise exception 'Missing permission: warehouse.qc' using errcode = '42501';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select q.fulfillment_id, q.status
  into v_fulfillment_id, v_status
  from public.fulfillment_qc_sessions q
  where q.organization_id = p_organization_id
    and q.id = p_qc_session_id;

  if v_fulfillment_id is null then
    raise exception 'QC session does not belong to organization' using errcode = '42501';
  end if;

  if v_status not in ('PENDING', 'IN_PROGRESS') then
    raise exception 'QC session cannot be completed from status %', v_status using errcode = '22023';
  end if;

  select count(*),
         count(*) filter (where status <> 'PASSED')
  into v_total_count, v_blocking_count
  from public.fulfillment_qc_item_totals
  where organization_id = p_organization_id
    and qc_session_id = p_qc_session_id;

  if v_total_count = 0 then
    raise exception 'QC session has no item totals' using errcode = '22023';
  end if;

  if v_blocking_count = 0 then
    v_completed_status := 'PASSED';
  else
    v_completed_status := 'FAILED';
  end if;

  update public.fulfillment_qc_sessions
  set status = v_completed_status,
      completed_by = v_profile_id,
      completed_at = now(),
      failure_reason = case
        when v_completed_status = 'FAILED' then coalesce(nullif(trim(p_notes), ''), 'QC item totals did not all pass')
        else null
      end,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_qc_session_id;

  update public.fulfillments
  set status = case
        when v_completed_status = 'PASSED' then 'QC_PASSED'
        else 'QC_PENDING'
      end,
      updated_at = now()
  where organization_id = p_organization_id
    and id = v_fulfillment_id
    and status not in ('SHIPPED', 'COMPLETED', 'CANCELLED');

  insert into public.fulfillment_events (
    organization_id,
    fulfillment_id,
    event_type,
    actor_profile_id,
    payload_json
  ) values (
    p_organization_id,
    v_fulfillment_id,
    'QC_COMPLETED',
    v_profile_id,
    jsonb_build_object(
      'qc_session_id', p_qc_session_id,
      'status', v_completed_status,
      'notes', p_notes
    )
  );

  return p_qc_session_id;
end;
$$;

create or replace function public.api_mark_shipment_ready_for_handoff(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_fulfillment_id uuid;
  v_status varchar;
  v_label_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'shipping.create') then
    raise exception 'Missing permission: shipping.create' using errcode = '42501';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select s.fulfillment_id, s.status, s.label_storage_path
  into v_fulfillment_id, v_status, v_label_storage_path
  from public.shipments s
  where s.organization_id = p_organization_id
    and s.id = p_shipment_id;

  if v_fulfillment_id is null then
    raise exception 'Shipment does not belong to organization' using errcode = '42501';
  end if;

  if v_status <> 'LABEL_CREATED' then
    raise exception 'Shipment cannot be handed off from status %', v_status using errcode = '22023';
  end if;

  if nullif(trim(v_label_storage_path), '') is null then
    raise exception 'Shipment label is required before handoff' using errcode = '22023';
  end if;

  update public.shipments
  set status = 'READY_FOR_HANDOFF'
  where organization_id = p_organization_id
    and id = p_shipment_id;

  update public.fulfillments
  set status = 'READY_TO_SHIP',
      updated_at = now()
  where organization_id = p_organization_id
    and id = v_fulfillment_id
    and status not in ('SHIPPED', 'COMPLETED', 'CANCELLED');

  insert into public.fulfillment_events (
    organization_id,
    fulfillment_id,
    event_type,
    actor_profile_id,
    payload_json
  ) values (
    p_organization_id,
    v_fulfillment_id,
    'SHIPMENT_READY_FOR_HANDOFF',
    v_profile_id,
    jsonb_build_object(
      'shipment_id', p_shipment_id,
      'notes', p_notes
    )
  );

  return p_shipment_id;
end;
$$;

create or replace function public.api_record_carrier_tracking_event(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_event_code varchar,
  p_event_description text,
  p_event_at timestamptz,
  p_shipment_status varchar default null,
  p_external_event_id varchar default null,
  p_raw_payload_json jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_tracking_event_id uuid;
  v_fulfillment_id uuid;
  v_current_status varchar;
  v_next_status varchar;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'shipping.create') then
    raise exception 'Missing permission: shipping.create' using errcode = '42501';
  end if;

  if nullif(trim(p_event_code), '') is null then
    raise exception 'Tracking event code is required' using errcode = '22023';
  end if;

  if p_event_at is null then
    raise exception 'Tracking event timestamp is required' using errcode = '22023';
  end if;

  v_next_status := nullif(trim(p_shipment_status), '');

  if v_next_status is not null and v_next_status not in (
    'IN_TRANSIT',
    'DELIVERED',
    'EXCEPTION',
    'RTO',
    'CANCELLED'
  ) then
    raise exception 'Unsupported carrier shipment status %', v_next_status using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select s.fulfillment_id, s.status
  into v_fulfillment_id, v_current_status
  from public.shipments s
  where s.organization_id = p_organization_id
    and s.id = p_shipment_id;

  if v_fulfillment_id is null then
    raise exception 'Shipment does not belong to organization' using errcode = '42501';
  end if;

  if v_current_status in ('DELIVERED', 'RTO', 'CANCELLED') then
    raise exception 'Shipment tracking cannot be updated from terminal status %', v_current_status using errcode = '22023';
  end if;

  insert into public.tracking_events (
    organization_id,
    shipment_id,
    external_event_id,
    event_code,
    event_description,
    event_at,
    raw_payload_json
  ) values (
    p_organization_id,
    p_shipment_id,
    p_external_event_id,
    p_event_code,
    p_event_description,
    p_event_at,
    coalesce(p_raw_payload_json, '{}'::jsonb)
  )
  returning id into v_tracking_event_id;

  if v_next_status is not null then
    update public.shipments
    set status = v_next_status,
        shipped_at = case
          when v_next_status in ('IN_TRANSIT', 'DELIVERED') then coalesce(shipped_at, p_event_at)
          else shipped_at
        end,
        delivered_at = case
          when v_next_status = 'DELIVERED' then coalesce(delivered_at, p_event_at)
          else delivered_at
        end,
        cancelled_at = case
          when v_next_status = 'CANCELLED' then coalesce(cancelled_at, p_event_at)
          else cancelled_at
        end
    where organization_id = p_organization_id
      and id = p_shipment_id;

    update public.fulfillments
    set status = case
          when v_next_status = 'DELIVERED' then 'COMPLETED'
          when v_next_status in ('IN_TRANSIT', 'EXCEPTION', 'RTO') then 'SHIPPED'
          when v_next_status = 'CANCELLED' then 'CANCELLED'
          else status
        end,
        fulfilled_at = case
          when v_next_status = 'DELIVERED' then coalesce(fulfilled_at, p_event_at)
          else fulfilled_at
        end,
        cancelled_at = case
          when v_next_status = 'CANCELLED' then coalesce(cancelled_at, p_event_at)
          else cancelled_at
        end,
        updated_at = now()
    where organization_id = p_organization_id
      and id = v_fulfillment_id;
  end if;

  insert into public.fulfillment_events (
    organization_id,
    fulfillment_id,
    event_type,
    actor_profile_id,
    payload_json
  ) values (
    p_organization_id,
    v_fulfillment_id,
    'CARRIER_TRACKING_EVENT',
    v_profile_id,
    jsonb_build_object(
      'shipment_id', p_shipment_id,
      'tracking_event_id', v_tracking_event_id,
      'event_code', p_event_code,
      'shipment_status', v_next_status
    )
  );

  return v_tracking_event_id;
end;
$$;

revoke execute on function public.api_complete_qc_session(uuid, uuid, text)
  from public, anon;
revoke execute on function public.api_mark_shipment_ready_for_handoff(uuid, uuid, text)
  from public, anon;
revoke execute on function public.api_record_carrier_tracking_event(uuid, uuid, varchar, text, timestamptz, varchar, varchar, jsonb)
  from public, anon;

grant execute on function public.api_complete_qc_session(uuid, uuid, text)
  to authenticated;
grant execute on function public.api_mark_shipment_ready_for_handoff(uuid, uuid, text)
  to authenticated;
grant execute on function public.api_record_carrier_tracking_event(uuid, uuid, varchar, text, timestamptz, varchar, varchar, jsonb)
  to authenticated;
