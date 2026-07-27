-- ADORA Commerce OS (ACOS)
-- 045_carrier_webhook_tracking_rpc.sql
--
-- Purpose:
-- - Keep the authenticated carrier tracking RPC user-bound.
-- - Add a service-role-only wrapper for the verified carrier webhook Edge Function.

create or replace function public.api_record_carrier_tracking_event_from_webhook(
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
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  return public.api_record_carrier_tracking_event(
    p_organization_id,
    p_shipment_id,
    p_event_code,
    p_event_description,
    p_event_at,
    p_shipment_status,
    p_external_event_id,
    coalesce(p_raw_payload_json, '{}'::jsonb) || jsonb_build_object(
      'source', 'carrier_webhook'
    )
  );
end;
$$;

revoke execute on function public.api_record_carrier_tracking_event(
  uuid,
  uuid,
  varchar,
  text,
  timestamptz,
  varchar,
  varchar,
  jsonb
) from service_role;

revoke execute on function public.api_record_carrier_tracking_event_from_webhook(
  uuid,
  uuid,
  varchar,
  text,
  timestamptz,
  varchar,
  varchar,
  jsonb
) from public, anon, authenticated;

grant execute on function public.api_record_carrier_tracking_event_from_webhook(
  uuid,
  uuid,
  varchar,
  text,
  timestamptz,
  varchar,
  varchar,
  jsonb
) to service_role;
