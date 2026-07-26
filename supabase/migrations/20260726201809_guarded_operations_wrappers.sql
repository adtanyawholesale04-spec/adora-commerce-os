-- ADORA Commerce OS (ACOS)
-- 042_guarded_operations_wrappers.sql
--
-- Purpose:
-- - Move high-risk operations behind guarded RPC functions.
-- - Keep direct table writes for refund processing, QC override, and label state
--   changes unavailable to browser/API roles.

revoke insert, update on table public.refunds from authenticated;
revoke insert, update on table public.refund_transactions from authenticated;
revoke update on table public.fulfillment_qc_sessions from authenticated;
revoke update on table public.shipments from authenticated;

create or replace function public.api_process_refund(
  p_organization_id uuid,
  p_order_id uuid,
  p_refund_number varchar,
  p_amount numeric,
  p_refund_method varchar,
  p_reason text default null,
  p_return_id uuid default null,
  p_payment_transaction_id uuid default null,
  p_provider varchar default null,
  p_provider_reference varchar default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_refund_id uuid;
  v_paid_amount numeric(14,2);
  v_existing_refunds numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'payment.refund') then
    raise exception 'Missing permission: payment.refund' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Refund amount must be positive' using errcode = '22023';
  end if;

  if nullif(trim(p_refund_number), '') is null then
    raise exception 'Refund number is required' using errcode = '22023';
  end if;

  if nullif(trim(p_refund_method), '') is null then
    raise exception 'Refund method is required' using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.orders o
    where o.organization_id = p_organization_id
      and o.id = p_order_id
  ) then
    raise exception 'Order does not belong to organization' using errcode = '42501';
  end if;

  if p_return_id is not null and not exists (
    select 1
    from public.returns r
    where r.organization_id = p_organization_id
      and r.id = p_return_id
      and r.order_id = p_order_id
  ) then
    raise exception 'Return does not belong to order' using errcode = '42501';
  end if;

  if p_payment_transaction_id is not null and not exists (
    select 1
    from public.payment_transactions pt
    join public.payments p
      on p.organization_id = pt.organization_id
     and p.id = pt.payment_id
    where pt.organization_id = p_organization_id
      and pt.id = p_payment_transaction_id
      and pt.status = 'SUCCEEDED'
      and p.order_id = p_order_id
  ) then
    raise exception 'Payment transaction is not refundable for this order' using errcode = '42501';
  end if;

  select coalesce(sum(pt.amount), 0)
  into v_paid_amount
  from public.payment_transactions pt
  join public.payments p
    on p.organization_id = pt.organization_id
   and p.id = pt.payment_id
  where pt.organization_id = p_organization_id
    and p.order_id = p_order_id
    and pt.status = 'SUCCEEDED'
    and pt.transaction_type in ('PAYMENT', 'ADDITIONAL_PAYMENT', 'STORE_CREDIT', 'COD_COLLECTION')
    and (p_payment_transaction_id is null or pt.id = p_payment_transaction_id);

  if v_paid_amount <= 0 then
    raise exception 'No refundable payment found' using errcode = '22023';
  end if;

  select coalesce(sum(r.amount), 0)
  into v_existing_refunds
  from public.refunds r
  where r.organization_id = p_organization_id
    and r.order_id = p_order_id
    and r.status not in ('FAILED', 'CANCELLED')
    and (
      p_payment_transaction_id is null
      or r.payment_transaction_id = p_payment_transaction_id
    );

  if v_existing_refunds + p_amount > v_paid_amount then
    raise exception 'Refund exceeds refundable amount' using errcode = '22023';
  end if;

  insert into public.refunds (
    organization_id,
    order_id,
    return_id,
    payment_transaction_id,
    refund_number,
    amount,
    refund_method,
    status,
    reason,
    created_by
  ) values (
    p_organization_id,
    p_order_id,
    p_return_id,
    p_payment_transaction_id,
    p_refund_number,
    p_amount,
    p_refund_method,
    'PROCESSING',
    p_reason,
    v_profile_id
  )
  returning id into v_refund_id;

  insert into public.refund_transactions (
    organization_id,
    refund_id,
    amount,
    provider,
    provider_reference,
    status
  ) values (
    p_organization_id,
    v_refund_id,
    p_amount,
    p_provider,
    p_provider_reference,
    'PENDING'
  );

  return v_refund_id;
end;
$$;

create or replace function public.api_override_qc_session(
  p_organization_id uuid,
  p_qc_session_id uuid,
  p_reason text,
  p_payload_json jsonb default '{}'::jsonb
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'warehouse.qc.override') then
    raise exception 'Missing permission: warehouse.qc.override' using errcode = '42501';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'QC override reason is required' using errcode = '22023';
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

  if v_status in ('PASSED', 'CANCELLED') then
    raise exception 'QC session cannot be overridden from status %', v_status using errcode = '22023';
  end if;

  update public.fulfillment_qc_sessions
  set status = 'PASSED',
      completed_by = v_profile_id,
      completed_at = now(),
      failure_reason = p_reason,
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_qc_session_id;

  update public.fulfillments
  set status = 'QC_PASSED',
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
    'QC_OVERRIDE_PASSED',
    v_profile_id,
    coalesce(p_payload_json, '{}'::jsonb) || jsonb_build_object('reason', p_reason)
  );

  return p_qc_session_id;
end;
$$;

create or replace function public.api_create_shipment_label(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_label_storage_path text,
  p_tracking_number varchar default null,
  p_provider_shipment_id varchar default null,
  p_shipping_cost numeric default null
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'shipping.print_label') then
    raise exception 'Missing permission: shipping.print_label' using errcode = '42501';
  end if;

  if nullif(trim(p_label_storage_path), '') is null then
    raise exception 'Label storage path is required' using errcode = '22023';
  end if;

  if p_shipping_cost is not null and p_shipping_cost < 0 then
    raise exception 'Shipping cost cannot be negative' using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select s.fulfillment_id, s.status
  into v_fulfillment_id, v_status
  from public.shipments s
  where s.organization_id = p_organization_id
    and s.id = p_shipment_id;

  if v_fulfillment_id is null then
    raise exception 'Shipment does not belong to organization' using errcode = '42501';
  end if;

  if v_status not in ('DRAFT', 'LABEL_CREATED') then
    raise exception 'Shipment label cannot be created from status %', v_status using errcode = '22023';
  end if;

  update public.shipments
  set tracking_number = coalesce(p_tracking_number, tracking_number),
      label_storage_path = p_label_storage_path,
      provider_shipment_id = coalesce(p_provider_shipment_id, provider_shipment_id),
      shipping_cost = coalesce(p_shipping_cost, shipping_cost),
      status = 'LABEL_CREATED'
  where organization_id = p_organization_id
    and id = p_shipment_id;

  insert into public.fulfillment_events (
    organization_id,
    fulfillment_id,
    event_type,
    actor_profile_id,
    payload_json
  ) values (
    p_organization_id,
    v_fulfillment_id,
    'SHIPMENT_LABEL_CREATED',
    v_profile_id,
    jsonb_build_object(
      'shipment_id', p_shipment_id,
      'tracking_number', p_tracking_number,
      'label_storage_path', p_label_storage_path
    )
  );

  return p_shipment_id;
end;
$$;

revoke execute on function public.api_process_refund(uuid, uuid, varchar, numeric, varchar, text, uuid, uuid, varchar, varchar)
  from public, anon;
revoke execute on function public.api_override_qc_session(uuid, uuid, text, jsonb)
  from public, anon;
revoke execute on function public.api_create_shipment_label(uuid, uuid, text, varchar, varchar, numeric)
  from public, anon;

grant execute on function public.api_process_refund(uuid, uuid, varchar, numeric, varchar, text, uuid, uuid, varchar, varchar)
  to authenticated;
grant execute on function public.api_override_qc_session(uuid, uuid, text, jsonb)
  to authenticated;
grant execute on function public.api_create_shipment_label(uuid, uuid, text, varchar, varchar, numeric)
  to authenticated;
