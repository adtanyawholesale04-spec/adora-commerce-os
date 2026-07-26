-- ADORA Commerce OS (ACOS)
-- 044_carrier_webhook_boundary.sql
--
-- Purpose:
-- - Add persistent idempotency/audit storage for carrier webhooks.
-- - Allow the verified Edge Function service-role boundary to route events into
--   api_record_carrier_tracking_event.

create table if not exists public.carrier_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider_code varchar(80) not null,
  idempotency_key text not null,
  shipment_id uuid,
  external_event_id varchar(255),
  event_code varchar(100),
  mapped_shipment_status varchar(30),
  payload_hash text not null,
  signature_header text,
  processing_status varchar(30) not null default 'PROCESSING'
    check (processing_status in ('PROCESSING','PROCESSED','DUPLICATE','FAILED')),
  tracking_event_id uuid,
  raw_payload_json jsonb not null,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (organization_id, provider_code, idempotency_key),
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete restrict,
  foreign key (tracking_event_id)
    references public.tracking_events(id) on delete restrict
);

alter table public.carrier_webhook_events enable row level security;

revoke all on table public.carrier_webhook_events from anon, authenticated;
grant select, insert, update on table public.carrier_webhook_events to service_role;

create index if not exists carrier_webhook_events_received_at_idx
on public.carrier_webhook_events(received_at desc);

create index if not exists carrier_webhook_events_shipment_idx
on public.carrier_webhook_events(organization_id, shipment_id);

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
  v_is_service_role boolean;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  if auth.uid() is null and not v_is_service_role then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not v_is_service_role and not public.has_org_permission(p_organization_id, 'shipping.create') then
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

  if v_is_service_role then
    v_profile_id := null;
  else
    v_profile_id := public.current_profile_id();

    if v_profile_id is null then
      raise exception 'Active profile not found' using errcode = '42501';
    end if;
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
      'shipment_status', v_next_status,
      'source', case when v_is_service_role then 'carrier_webhook' else 'authenticated_user' end
    )
  );

  return v_tracking_event_id;
end;
$$;

revoke execute on function public.api_record_carrier_tracking_event(uuid, uuid, varchar, text, timestamptz, varchar, varchar, jsonb)
  from public, anon;
grant execute on function public.api_record_carrier_tracking_event(uuid, uuid, varchar, text, timestamptz, varchar, varchar, jsonb)
  to authenticated, service_role;
