-- Customer Portal read-only service boundary.
-- The customer master remains canonical; the active profile link is the only
-- browser-facing ownership proof. Source tables stay closed to authenticated clients.

create or replace function public.api_get_customer_portal_snapshot(
  p_organization_id uuid,
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
  v_customer jsonb;
  v_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'Organization is required' using errcode = '22004';
  end if;

  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.profile_id = v_profile_id
      and om.status = 'ACTIVE'
  ) then
    raise exception 'Active organization membership required' using errcode = '42501';
  end if;

  select c.id, jsonb_build_object(
    'id', c.id,
    'customer_code', c.customer_code,
    'display_name', c.display_name,
    'first_name', c.first_name,
    'last_name', c.last_name,
    'phone', c.phone,
    'email', c.email,
    'status', c.status
  )
  into v_customer_id, v_customer
  from public.customer_profile_links l
  join public.customers c
    on c.organization_id = l.organization_id
   and c.id = l.customer_id
  where l.organization_id = p_organization_id
    and l.profile_id = v_profile_id
    and l.link_status = 'ACTIVE'
    and c.status = 'ACTIVE'
  order by l.verified_at desc, l.created_at desc
  limit 1;

  if v_customer_id is null then
    return jsonb_build_object(
      'available', false,
      'organization_id', p_organization_id,
      'reason', 'CUSTOMER_LINK_NOT_ACTIVE'
    );
  end if;

  v_snapshot := jsonb_build_object(
    'available', true,
    'organization_id', p_organization_id,
    'customer', v_customer,
    'addresses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'label', a.label,
        'recipient_name', a.recipient_name,
        'phone', a.phone,
        'address_line1', a.address_line1,
        'address_line2', a.address_line2,
        'subdistrict', a.subdistrict,
        'district', a.district,
        'province', a.province,
        'postal_code', a.postal_code,
        'country_code', a.country_code,
        'is_default', a.is_default
      ) order by a.is_default desc, a.created_at desc)
      from public.customer_addresses a
      where a.organization_id = p_organization_id
        and a.customer_id = v_customer_id
        and a.status = 'ACTIVE'
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'source', o.source,
        'currency_code', o.currency_code,
        'order_status', o.order_status,
        'payment_status', o.payment_status,
        'fulfillment_status', o.fulfillment_status,
        'grand_total', o.grand_total,
        'amount_paid', o.amount_paid,
        'amount_due', o.amount_due,
        'created_at', o.created_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', oi.id,
            'sku', oi.sku_snapshot,
            'product_name', oi.product_name_snapshot,
            'variant_name', oi.variant_name_snapshot,
            'quantity', oi.quantity,
            'unit_price', oi.applied_unit_price,
            'line_total', oi.line_total
          ) order by oi.created_at)
          from public.order_items oi
          where oi.organization_id = o.organization_id
            and oi.order_id = o.id
        ), '[]'::jsonb)
      ) order by o.created_at desc)
      from public.orders o
      where o.organization_id = p_organization_id
        and o.customer_id = v_customer_id
        and o.order_status <> 'DRAFT'
    ), '[]'::jsonb),
    'loyalty', coalesce((
      select jsonb_agg(jsonb_build_object(
        'account_id', la.id,
        'program_id', la.program_id,
        'points_balance', la.points_balance,
        'status', la.status,
        'transactions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', lt.id,
            'transaction_type', lt.transaction_type,
            'points_delta', lt.points_delta,
            'order_id', lt.order_id,
            'expires_at', lt.expires_at,
            'created_at', lt.created_at
          ) order by lt.created_at desc)
          from public.loyalty_transactions lt
          where lt.organization_id = la.organization_id
            and lt.loyalty_account_id = la.id
        ), '[]'::jsonb)
      ) order by la.created_at)
      from public.loyalty_accounts la
      where la.organization_id = p_organization_id
        and la.customer_id = v_customer_id
        and la.status <> 'CLOSED'
    ), '[]'::jsonb),
    'coupons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cp.id,
        'code', cp.code,
        'status', cp.status,
        'starts_at', cp.starts_at,
        'ends_at', cp.ends_at
      ) order by cp.created_at desc)
      from public.coupons cp
      where cp.organization_id = p_organization_id
        and cp.customer_id = v_customer_id
        and cp.status = 'ACTIVE'
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cc.id,
        'channel', cc.channel,
        'purpose', cc.purpose,
        'status', cc.status,
        'destination', cc.destination,
        'policy_version', cc.policy_version,
        'granted_at', cc.granted_at,
        'revoked_at', cc.revoked_at
      ) order by cc.channel, cc.purpose, cc.destination)
      from public.customer_consents cc
      where cc.organization_id = p_organization_id
        and cc.customer_id = v_customer_id
    ) , '[]'::jsonb)
  );

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_profile_id, 'USER', 'CUSTOMER', v_customer_id,
    'CUSTOMER_PORTAL_READ', null,
    jsonb_build_object('sections', jsonb_build_array('customer', 'addresses', 'orders', 'loyalty', 'coupons', 'consents')),
    'Customer Portal read-only snapshot', p_client_request_id
  );

  return v_snapshot;
end;
$$;

revoke all on function public.api_get_customer_portal_snapshot(uuid, uuid) from public, anon;
grant execute on function public.api_get_customer_portal_snapshot(uuid, uuid) to authenticated;
