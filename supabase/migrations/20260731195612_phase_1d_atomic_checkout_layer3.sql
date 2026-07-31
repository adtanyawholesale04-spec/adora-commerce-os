-- Phase 1D Part 3D atomic Storefront checkout boundary.
-- Local-first only. No provider call, payment transaction, proof, sample data,
-- entitlement grant, Production activation or historical migration edit.

do $$
declare
  v_missing text;
begin
  select string_agg(required_object, ', ' order by required_object)
  into v_missing
  from unnest(array[
    'public.coupons',
    'public.coupon_redemptions',
    'public.promotion_campaigns',
    'public.promotion_campaign_versions',
    'public.promotion_rules',
    'public.promotion_actions',
    'public.promotion_applied_benefits',
    'public.inventory_balances',
    'public.inventory_reservations',
    'public.orders',
    'public.order_items',
    'public.order_addresses',
    'public.order_status_history',
    'public.payments',
    'public.audit_logs',
    'public.commerce_idempotency_keys'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Phase 1D Layer 3 missing dependencies: %', v_missing;
  end if;

  if to_regprocedure('public.internal_storefront_checkout_context(uuid)') is null
     or to_regprocedure('public.internal_reprice_storefront_cart(uuid,uuid,numeric,timestamp with time zone)') is null
     or to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'Phase 1D Layer 3 missing guarded checkout helpers';
  end if;

  if to_regprocedure('public.api_submit_storefront_checkout(uuid,uuid,uuid,jsonb,text,uuid)') is not null
     or to_regprocedure('public.api_expire_storefront_checkout(uuid,uuid,uuid)') is not null
     or to_regprocedure('public.api_compensate_storefront_checkout(uuid,uuid,text,uuid)') is not null then
    raise exception 'Phase 1D Layer 3 target API already exists';
  end if;

  if exists (
    select 1
    from public.coupons c
    group by c.organization_id, upper(btrim(c.code))
    having count(*) > 1
  ) or exists (
    select 1 from public.coupons c
    where btrim(c.code) = '' or c.code ~ '[[:cntrl:]]'
  ) then
    raise exception 'Phase 1D Layer 3 normalized coupon preflight failed';
  end if;

  if exists (
    select 1
    from public.coupon_redemptions cr
    where cr.status in ('RESERVED', 'CONSUMED') and cr.cart_id is not null
    group by cr.organization_id, cr.cart_id
    having count(*) > 1
  ) or exists (
    select 1
    from public.coupon_redemptions cr
    where cr.status in ('RESERVED', 'CONSUMED') and cr.order_id is not null
    group by cr.organization_id, cr.order_id
    having count(*) > 1
  ) then
    raise exception 'Phase 1D Layer 3 active coupon-use preflight failed';
  end if;

  if exists (
    select 1
    from public.coupons cp
    join public.promotion_campaign_versions v
      on v.organization_id=cp.organization_id and v.id=cp.campaign_version_id
    join public.promotion_campaigns c
      on c.organization_id=v.organization_id and c.id=v.campaign_id
    where c.scope<>'ORDER'
  ) then
    raise exception 'Phase 1D Layer 3 coupon channel separation preflight failed';
  end if;
end;
$$;

create unique index coupons_normalized_code_uidx
on public.coupons (organization_id, upper(btrim(code)));

create unique index coupon_redemptions_one_active_cart_uidx
on public.coupon_redemptions (organization_id, cart_id)
where cart_id is not null and status in ('RESERVED', 'CONSUMED');

create unique index coupon_redemptions_one_active_order_uidx
on public.coupon_redemptions (organization_id, order_id)
where order_id is not null and status in ('RESERVED', 'CONSUMED');

create function public.protect_coupon_checkout_channel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.campaign_version_id is not null and not exists (
    select 1
    from public.promotion_campaign_versions v
    join public.promotion_campaigns c
      on c.organization_id = v.organization_id
     and c.id = v.campaign_id
    where v.organization_id = new.organization_id
      and v.id = new.campaign_version_id
      and c.scope = 'ORDER'
  ) then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger coupons_protect_checkout_channel
before insert or update of organization_id, campaign_version_id on public.coupons
for each row execute function public.protect_coupon_checkout_channel();

create function public.protect_coupon_linked_campaign_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.scope <> 'ORDER' and exists (
    select 1
    from public.promotion_campaign_versions v
    join public.coupons cp
      on cp.organization_id = v.organization_id
     and cp.campaign_version_id = v.id
    where v.organization_id = new.organization_id
      and v.campaign_id = new.id
  ) then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger promotion_campaigns_protect_coupon_scope
before update of scope on public.promotion_campaigns
for each row execute function public.protect_coupon_linked_campaign_scope();

create function public.protect_coupon_linked_version_campaign()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.coupons cp
    where cp.organization_id=new.organization_id and cp.campaign_version_id=new.id
  ) and not exists (
    select 1 from public.promotion_campaigns c
    where c.organization_id=new.organization_id and c.id=new.campaign_id and c.scope='ORDER'
  ) then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode='P0001';
  end if;
  return new;
end;
$$;

create trigger promotion_versions_protect_coupon_campaign
before update of organization_id,campaign_id on public.promotion_campaign_versions
for each row execute function public.protect_coupon_linked_version_campaign();

create function public.internal_begin_checkout_idempotency(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_customer_id uuid,
  p_request_hash bytea
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_existing public.commerce_idempotency_keys%rowtype;
  v_inserted bigint := 0;
begin
  if p_request_id is null or p_operation not in (
    'CHECKOUT_SUBMIT', 'CHECKOUT_EXPIRE', 'CHECKOUT_COMPENSATE'
  ) then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  insert into public.commerce_idempotency_keys (
    organization_id, operation, request_id, actor_profile_id, customer_id,
    request_hash, expires_at
  ) values (
    p_organization_id, p_operation, p_request_id, p_actor_profile_id,
    p_customer_id, p_request_hash, statement_timestamp() + interval '30 days'
  ) on conflict (organization_id, operation, request_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return jsonb_build_object('is_new', true, 'idempotency_reused', false);
  end if;

  select k.* into v_existing
  from public.commerce_idempotency_keys k
  where k.organization_id = p_organization_id
    and k.operation = p_operation
    and k.request_id = p_request_id
  for update;

  if v_existing.request_hash is distinct from p_request_hash
     or v_existing.actor_profile_id is distinct from p_actor_profile_id
     or v_existing.customer_id is distinct from p_customer_id then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
  if v_existing.state = 'IN_PROGRESS' then
    raise exception 'REQUEST_IN_PROGRESS' using errcode = 'P0001';
  end if;
  if v_existing.state = 'FAILED' then
    raise exception '%', coalesce(v_existing.failure_code, 'IDEMPOTENCY_CONFLICT')
      using errcode = 'P0001';
  end if;
  if v_existing.result_entity_type not in ('cart', 'order')
     or v_existing.result_entity_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'is_new', false,
    'idempotency_reused', true,
    'result_entity_type', v_existing.result_entity_type,
    'result_entity_id', v_existing.result_entity_id
  );
end;
$$;

create function public.internal_complete_checkout_idempotency(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_result_entity_type text,
  p_result_entity_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  if p_result_entity_type not in ('cart', 'order') then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
  update public.commerce_idempotency_keys k
  set state = 'SUCCEEDED',
      result_entity_type = p_result_entity_type,
      result_entity_id = p_result_entity_id,
      completed_at = statement_timestamp()
  where k.organization_id = p_organization_id
    and k.operation = p_operation
    and k.request_id = p_request_id
    and k.state = 'IN_PROGRESS';
  if not found then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
end;
$$;

create function public.internal_checkout_order_response(
  p_organization_id uuid,
  p_order_id uuid,
  p_operation text,
  p_idempotency_reused boolean
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_payment_id uuid;
  v_reserved_until timestamptz;
begin
  select o.* into v_order
  from public.orders o
  where o.organization_id = p_organization_id and o.id = p_order_id;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  select p.id into v_payment_id
  from public.payments p
  where p.organization_id = p_organization_id and p.order_id = p_order_id;
  select max(ir.expires_at) into v_reserved_until
  from public.inventory_reservations ir
  where ir.organization_id = p_organization_id and ir.order_id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'operation', p_operation,
    'cart_id', v_order.source_cart_id,
    'order_id', v_order.id,
    'payment_id', v_payment_id,
    'order_number', v_order.order_number,
    'order_status', v_order.order_status,
    'currency_code', v_order.currency_code,
    'subtotal', to_char(v_order.subtotal, 'FM9999999999990.00'),
    'item_discount_total', to_char(v_order.item_discount_total, 'FM9999999999990.00'),
    'order_discount_total', to_char(v_order.order_discount_total, 'FM9999999999990.00'),
    'shipping_charge', to_char(v_order.shipping_charge, 'FM9999999999990.00'),
    'grand_total', to_char(v_order.grand_total, 'FM9999999999990.00'),
    'reserved_until', v_reserved_until,
    'payment_due_at', v_order.payment_due_at,
    'idempotency_reused', p_idempotency_reused
  );
end;
$$;

create function public.internal_evaluate_storefront_coupon(
  p_organization_id uuid,
  p_customer_id uuid,
  p_cart_id uuid,
  p_normalized_code text,
  p_eligible_base numeric,
  p_floor_headroom numeric,
  p_evaluated_at timestamptz
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_campaign public.promotion_campaigns%rowtype;
  v_version public.promotion_campaign_versions%rowtype;
  v_rule public.promotion_rules%rowtype;
  v_action public.promotion_actions%rowtype;
  v_benefit numeric(14,2);
  v_group text;
  v_global bigint;
  v_customer bigint;
begin
  if p_normalized_code is null then
    return jsonb_build_object('applied', false, 'benefit_amount', '0.00');
  end if;

  select cp.* into v_coupon
  from public.coupons cp
  where cp.organization_id = p_organization_id
    and upper(btrim(cp.code)) = p_normalized_code;
  if v_coupon.id is null then
    raise exception 'COUPON_INVALID' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'acos:checkout-coupon:' || p_organization_id::text || ':' || v_coupon.id::text,
    0
  ));

  select c.* into v_campaign
  from public.promotion_campaign_versions v
  join public.promotion_campaigns c
    on c.organization_id = v.organization_id and c.id = v.campaign_id
  where v.organization_id = p_organization_id
    and v.id = v_coupon.campaign_version_id
  for update of c;
  select v.* into v_version
  from public.promotion_campaign_versions v
  where v.organization_id = p_organization_id and v.id = v_coupon.campaign_version_id
  for update;
  select cp.* into v_coupon
  from public.coupons cp
  where cp.organization_id = p_organization_id and cp.id = v_coupon.id
  for update;

  if v_coupon.id is null or v_campaign.id is null or v_version.id is null then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
  end if;
  if v_coupon.status <> 'ACTIVE'
     or (v_coupon.starts_at is not null and v_coupon.starts_at > p_evaluated_at)
     or (v_coupon.ends_at is not null and v_coupon.ends_at <= p_evaluated_at)
     or (v_coupon.customer_id is not null and v_coupon.customer_id <> p_customer_id) then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if v_campaign.status <> 'ACTIVE' or v_campaign.scope <> 'ORDER'
     or (v_campaign.currency_code is not null and v_campaign.currency_code <> 'THB')
     or (v_campaign.exclusive_group is not null and btrim(v_campaign.exclusive_group) = '')
     or v_version.status <> 'ACTIVE'
     or (v_version.effective_from is not null and v_version.effective_from > p_evaluated_at)
     or (v_version.effective_until is not null and v_version.effective_until <= p_evaluated_at) then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.promotion_condition_groups x where x.organization_id = p_organization_id and x.campaign_version_id = v_version.id)
     or exists (select 1 from public.promotion_target_scopes x where x.organization_id = p_organization_id and x.campaign_version_id = v_version.id)
     or exists (select 1 from public.promotion_bundles x where x.organization_id = p_organization_id and x.campaign_version_id = v_version.id)
     or (select count(*) from public.promotion_rules r where r.organization_id = p_organization_id and r.campaign_version_id = v_version.id) <> 1
     or (select count(*) from public.promotion_actions a where a.organization_id = p_organization_id and a.campaign_version_id = v_version.id) <> 1 then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
  end if;

  select r.* into v_rule
  from public.promotion_rules r
  where r.organization_id = p_organization_id and r.campaign_version_id = v_version.id;
  select a.* into v_action
  from public.promotion_actions a
  where a.organization_id = p_organization_id and a.campaign_version_id = v_version.id;

  if v_rule.rule_type <> 'MIN_SPEND' or v_rule.scope_type <> 'ORDER'
     or v_rule.min_quantity is not null or v_rule.max_quantity is not null
     or v_rule.repeatable or v_rule.max_repeat_count is not null
     or (v_rule.value_json is not null and v_rule.value_json <> '{}'::jsonb)
     or (v_rule.min_spend is not null and (v_rule.min_spend < 0 or v_rule.min_spend <> round(v_rule.min_spend, 2)))
     or (v_rule.max_spend is not null and (v_rule.max_spend < coalesce(v_rule.min_spend, 0) or v_rule.max_spend <> round(v_rule.max_spend, 2)))
     or v_action.rule_id is distinct from v_rule.id
     or v_action.action_type not in ('PERCENT_DISCOUNT', 'FIXED_DISCOUNT')
     or v_action.max_discount_amount is not null
     or (v_action.exclusive_group is not null and btrim(v_action.exclusive_group) = '')
     or exists (select 1 from public.promotion_tiers t where t.organization_id = p_organization_id and t.action_id = v_action.id)
     or exists (select 1 from public.promotion_reward_rules rr where rr.organization_id = p_organization_id and rr.action_id = v_action.id)
     or exists (select 1 from public.promotion_price_mappings pm where pm.organization_id = p_organization_id and pm.action_id = v_action.id) then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
  end if;

  if p_eligible_base < coalesce(v_rule.min_spend, 0)
     or (v_rule.max_spend is not null and p_eligible_base > v_rule.max_spend) then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if v_action.action_type = 'PERCENT_DISCOUNT' then
    if jsonb_typeof(v_action.value_json) <> 'object'
       or (select count(*) from jsonb_object_keys(v_action.value_json)) <> 1
       or jsonb_typeof(v_action.value_json -> 'percent') <> 'number'
       or (v_action.value_json ->> 'percent')::numeric <= 0
       or (v_action.value_json ->> 'percent')::numeric > 100
       or (v_action.value_json ->> 'percent')::numeric <> round((v_action.value_json ->> 'percent')::numeric, 4) then
      raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
    end if;
    v_benefit := round(p_eligible_base * (v_action.value_json ->> 'percent')::numeric / 100, 2);
  else
    if jsonb_typeof(v_action.value_json) <> 'object'
       or (select count(*) from jsonb_object_keys(v_action.value_json)) <> 1
       or jsonb_typeof(v_action.value_json -> 'amount') <> 'number'
       or (v_action.value_json ->> 'amount')::numeric <= 0
       or (v_action.value_json ->> 'amount')::numeric <> round((v_action.value_json ->> 'amount')::numeric, 2) then
      raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
    end if;
    v_benefit := least(p_eligible_base, (v_action.value_json ->> 'amount')::numeric);
  end if;

  if v_benefit <= 0 or v_benefit > p_eligible_base then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if v_benefit > p_floor_headroom then
    raise exception 'PROMOTION_PRICE_FLOOR_VIOLATION' using errcode = 'P0001';
  end if;
  if not v_campaign.stackable or not v_action.stackable then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;

  v_group := coalesce(btrim(v_action.exclusive_group), btrim(v_campaign.exclusive_group));
  if v_group is not null and exists (
    select 1
    from public.cart_items ci
    cross join lateral jsonb_array_elements(coalesce(ci.pricing_snapshot_json -> 'applied_actions', '[]'::jsonb)) aa
    join public.promotion_actions pa on pa.id = (aa ->> 'action_id')::uuid
    join public.promotion_campaigns pc on pc.id = (aa ->> 'campaign_id')::uuid
    where ci.organization_id = p_organization_id and ci.cart_id = p_cart_id
      and coalesce(btrim(pa.exclusive_group), btrim(pc.exclusive_group)) = v_group
  ) then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if (v_coupon.usage_limit is not null and v_coupon.usage_limit <= 0)
     or (v_coupon.usage_limit_per_customer is not null and v_coupon.usage_limit_per_customer <= 0)
     or (v_campaign.usage_limit is not null and v_campaign.usage_limit <= 0)
     or (v_campaign.usage_limit_per_customer is not null and v_campaign.usage_limit_per_customer <= 0) then
    raise exception 'COUPON_CONFIGURATION_UNSUPPORTED' using errcode = 'P0001';
  end if;

  perform cr.id from public.coupon_redemptions cr
  where cr.organization_id = p_organization_id and cr.status in ('RESERVED', 'CONSUMED')
  order by cr.id for update;
  select count(*), count(*) filter (where cr.customer_id = p_customer_id)
  into v_global, v_customer
  from public.coupon_redemptions cr
  where cr.organization_id = p_organization_id and cr.coupon_id = v_coupon.id
    and cr.status in ('RESERVED', 'CONSUMED');
  if (v_coupon.usage_limit is not null and v_global >= v_coupon.usage_limit)
     or (v_coupon.usage_limit_per_customer is not null and v_customer >= v_coupon.usage_limit_per_customer) then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;
  select count(*), count(*) filter (where cr.customer_id = p_customer_id)
  into v_global, v_customer
  from public.coupon_redemptions cr
  join public.coupons cp on cp.organization_id = cr.organization_id and cp.id = cr.coupon_id
  join public.promotion_campaign_versions pv on pv.organization_id = cp.organization_id and pv.id = cp.campaign_version_id
  where cr.organization_id = p_organization_id and pv.campaign_id = v_campaign.id
    and cr.status in ('RESERVED', 'CONSUMED');
  if (v_campaign.usage_limit is not null and v_global >= v_campaign.usage_limit)
     or (v_campaign.usage_limit_per_customer is not null and v_customer >= v_campaign.usage_limit_per_customer) then
    raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'applied', true,
    'coupon_id', v_coupon.id,
    'campaign_id', v_campaign.id,
    'promotion_version_id', v_version.id,
    'rule_id', v_rule.id,
    'action_id', v_action.id,
    'action_type', v_action.action_type,
    'eligible_base', to_char(p_eligible_base, 'FM9999999999990.00'),
    'benefit_amount', to_char(v_benefit, 'FM9999999999990.00')
  );
end;
$$;

create function public.api_submit_storefront_checkout(
  p_organization_id uuid,
  p_cart_id uuid,
  p_customer_address_id uuid,
  p_checkout_address jsonb,
  p_coupon_code text,
  p_request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_context record;
  v_settings public.organization_checkout_settings%rowtype;
  v_cart public.carts%rowtype;
  v_address jsonb;
  v_normalized_coupon text;
  v_hash bytea;
  v_idem jsonb;
  v_before jsonb;
  v_after jsonb;
  v_now timestamptz := statement_timestamp();
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_payment_id uuid;
  v_reserved_until timestamptz;
  v_payment_due_at timestamptz;
  v_eligible numeric(14,2);
  v_headroom numeric(14,2);
  v_coupon jsonb;
  v_coupon_benefit numeric(14,2) := 0;
  v_grand_total numeric(14,2);
  v_item record;
  v_balance record;
  v_remaining numeric(14,3);
  v_take numeric(14,3);
  v_order_item_id uuid;
  v_action jsonb;
begin
  if p_cart_id is null or p_request_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;
  if (p_customer_address_id is null) = (p_checkout_address is null) then
    raise exception 'ADDRESS_REQUIRED' using errcode = '22023';
  end if;
  if p_coupon_code is not null then
    v_normalized_coupon := upper(btrim(p_coupon_code));
    if v_normalized_coupon = '' then v_normalized_coupon := null; end if;
    if v_normalized_coupon is not null and (
      char_length(v_normalized_coupon) > 100 or v_normalized_coupon ~ '[[:cntrl:]]'
    ) then raise exception 'COUPON_INVALID' using errcode = '22023'; end if;
  end if;

  select * into strict v_context
  from public.internal_storefront_checkout_context(p_organization_id);
  select s.* into strict v_settings
  from public.organization_checkout_settings s
  where s.organization_id = p_organization_id and s.status = 'ACTIVE'
  for share;

  if p_customer_address_id is not null then
    select jsonb_build_object(
      'recipient_name', btrim(a.recipient_name), 'phone', btrim(a.phone),
      'address_line1', btrim(a.address_line1), 'address_line2', nullif(btrim(a.address_line2), ''),
      'subdistrict', nullif(btrim(a.subdistrict), ''), 'district', nullif(btrim(a.district), ''),
      'province', nullif(btrim(a.province), ''), 'postal_code', nullif(btrim(a.postal_code), ''),
      'country_code', upper(btrim(a.country_code))
    ) into v_address
    from public.customer_addresses a
    where a.organization_id = p_organization_id and a.customer_id = v_context.customer_id
      and a.id = p_customer_address_id and a.status = 'ACTIVE';
  else
    if jsonb_typeof(p_checkout_address) <> 'object'
       or exists (select 1 from jsonb_object_keys(p_checkout_address) k where k not in (
         'recipient_name','phone','address_line1','address_line2','subdistrict','district','province','postal_code','country_code'
       )) then raise exception 'ADDRESS_INVALID' using errcode = '22023'; end if;
    v_address := jsonb_build_object(
      'recipient_name', btrim(p_checkout_address ->> 'recipient_name'),
      'phone', btrim(p_checkout_address ->> 'phone'),
      'address_line1', btrim(p_checkout_address ->> 'address_line1'),
      'address_line2', nullif(btrim(p_checkout_address ->> 'address_line2'), ''),
      'subdistrict', nullif(btrim(p_checkout_address ->> 'subdistrict'), ''),
      'district', nullif(btrim(p_checkout_address ->> 'district'), ''),
      'province', nullif(btrim(p_checkout_address ->> 'province'), ''),
      'postal_code', nullif(btrim(p_checkout_address ->> 'postal_code'), ''),
      'country_code', upper(btrim(p_checkout_address ->> 'country_code'))
    );
  end if;
  if v_address is null
     or coalesce(v_address ->> 'recipient_name','') = ''
     or coalesce(v_address ->> 'phone','') = ''
     or coalesce(v_address ->> 'address_line1','') = ''
     or v_address ->> 'country_code' <> 'TH'
     or char_length(v_address ->> 'recipient_name') > 200
     or char_length(v_address ->> 'phone') > 50
     or char_length(v_address ->> 'address_line1') > 500
     or char_length(coalesce(v_address ->> 'address_line2','')) > 500
     or char_length(coalesce(v_address ->> 'subdistrict','')) > 150
     or char_length(coalesce(v_address ->> 'district','')) > 150
     or char_length(coalesce(v_address ->> 'province','')) > 150
     or char_length(coalesce(v_address ->> 'postal_code','')) > 20 then
    raise exception 'ADDRESS_INVALID' using errcode = '22023';
  end if;

  v_hash := extensions.digest(convert_to(concat_ws('|', 'v1', 'CHECKOUT_SUBMIT',
    p_organization_id::text, v_context.customer_id::text, p_cart_id::text,
    encode(extensions.digest(convert_to(v_address::text,'UTF8'),'sha256'),'hex'),
    coalesce(v_normalized_coupon, '-')), 'UTF8'), 'sha256');
  v_idem := public.internal_begin_checkout_idempotency(
    p_organization_id, 'CHECKOUT_SUBMIT', p_request_id, v_context.profile_id,
    v_context.customer_id, v_hash
  );
  if coalesce((v_idem ->> 'idempotency_reused')::boolean, false) then
    if v_idem ->> 'result_entity_type' = 'cart' then
      return jsonb_build_object('ok', false, 'operation', 'CHECKOUT_SUBMIT',
        'cart_id', (v_idem ->> 'result_entity_id')::uuid,
        'code', 'CHECKOUT_REPRICE_REQUIRED', 'idempotency_reused', true);
    end if;
    return public.internal_checkout_order_response(p_organization_id,
      (v_idem ->> 'result_entity_id')::uuid, 'CHECKOUT_SUBMIT', true);
  end if;

  select c.* into v_cart
  from public.carts c
  where c.organization_id = p_organization_id and c.customer_id = v_context.customer_id
    and c.id = p_cart_id and c.source = 'STOREFRONT'
  for update;
  if v_cart.id is null then raise exception 'CART_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_cart.status <> 'READY' then raise exception 'CART_NOT_READY' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.cart_items ci where ci.organization_id = p_organization_id and ci.cart_id = p_cart_id) then
    raise exception 'CART_NOT_READY' using errcode = 'P0001';
  end if;

  if v_normalized_coupon is not null then
    v_order_item_id:=null;
    select cp.id into v_order_item_id
    from public.coupons cp
    where cp.organization_id=p_organization_id
      and upper(btrim(cp.code))=v_normalized_coupon;
    if v_order_item_id is null then
      raise exception 'COUPON_INVALID' using errcode='P0001';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(
      'acos:checkout-coupon:' || p_organization_id::text || ':' || v_order_item_id::text,
      0
    ));
  end if;

  select jsonb_build_object('subtotal',c.subtotal,'discount',c.discount_total,'shipping',c.shipping_estimate,'grand',c.grand_total,
    'items',(select jsonb_agg(jsonb_build_object('id',ci.id,'original',ci.original_unit_price,'calculated',ci.calculated_unit_price,
      'discount',ci.line_discount_total,'total',ci.line_total,'snapshot',coalesce(ci.pricing_snapshot_json,'{}'::jsonb) - 'calculated_at') order by ci.variant_id)
      from public.cart_items ci where ci.organization_id=p_organization_id and ci.cart_id=p_cart_id)) into v_before
  from public.carts c where c.id=p_cart_id;
  perform public.internal_reprice_storefront_cart(p_organization_id,p_cart_id,v_settings.flat_shipping_charge,v_now);
  select jsonb_build_object('subtotal',c.subtotal,'discount',c.discount_total,'shipping',c.shipping_estimate,'grand',c.grand_total,
    'items',(select jsonb_agg(jsonb_build_object('id',ci.id,'original',ci.original_unit_price,'calculated',ci.calculated_unit_price,
      'discount',ci.line_discount_total,'total',ci.line_total,'snapshot',coalesce(ci.pricing_snapshot_json,'{}'::jsonb) - 'calculated_at') order by ci.variant_id)
      from public.cart_items ci where ci.organization_id=p_organization_id and ci.cart_id=p_cart_id)) into v_after
  from public.carts c where c.id=p_cart_id;
  if v_before is distinct from v_after then
    perform public.internal_complete_checkout_idempotency(p_organization_id,'CHECKOUT_SUBMIT',p_request_id,'cart',p_cart_id);
    return jsonb_build_object('ok',false,'operation','CHECKOUT_SUBMIT','cart_id',p_cart_id,
      'code','CHECKOUT_REPRICE_REQUIRED','idempotency_reused',false);
  end if;

  select round(sum(ci.line_total),2), round(sum(case when pv.minimum_selling_price is null then ci.line_total
    else greatest(ci.line_total-round(ci.requested_quantity*pv.minimum_selling_price,2),0) end),2)
  into v_eligible,v_headroom
  from public.cart_items ci join public.product_variants pv on pv.organization_id=ci.organization_id and pv.id=ci.variant_id
  where ci.organization_id=p_organization_id and ci.cart_id=p_cart_id;
  v_coupon := public.internal_evaluate_storefront_coupon(p_organization_id,v_context.customer_id,p_cart_id,
    v_normalized_coupon,v_eligible,v_headroom,v_now);
  v_coupon_benefit := (v_coupon ->> 'benefit_amount')::numeric;
  v_reserved_until := v_now + make_interval(mins => v_settings.reservation_minutes);
  v_payment_due_at := v_now + make_interval(mins => v_settings.payment_due_minutes);
  v_grand_total := round(v_eligible - v_coupon_benefit + v_settings.flat_shipping_charge,2);
  v_order_number := 'WEB-' || to_char(v_now,'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::text,'-',''),1,12));

  insert into public.orders (id,organization_id,customer_id,order_number,source,currency_code,order_status,payment_status,
    fulfillment_status,subtotal,item_discount_total,order_discount_total,shipping_charge,shipping_discount_total,tax_total,
    grand_total,amount_paid,amount_due,payment_due_at,created_by,source_cart_id)
  values (v_order_id,p_organization_id,v_context.customer_id,v_order_number,'STOREFRONT','THB','PENDING_CONFIRMATION','UNPAID',
    'UNFULFILLED',v_cart.subtotal,v_cart.discount_total,v_coupon_benefit,v_settings.flat_shipping_charge,0,0,
    v_grand_total,0,v_grand_total,v_payment_due_at,v_context.profile_id,p_cart_id);

  for v_item in
    select ci.*,pv.stock_code,pv.variant_name,p.name as product_name
    from public.cart_items ci join public.product_variants pv on pv.organization_id=ci.organization_id and pv.id=ci.variant_id
    join public.products p on p.organization_id=pv.organization_id and p.id=pv.product_id
    where ci.organization_id=p_organization_id and ci.cart_id=p_cart_id order by ci.variant_id
  loop
    v_order_item_id := gen_random_uuid();
    insert into public.order_items (id,organization_id,order_id,variant_id,sku_snapshot,product_name_snapshot,variant_name_snapshot,
      quantity,original_unit_price,applied_unit_price,unit_cost_snapshot,line_discount_total,line_total,source_cart_item_id)
    values (v_order_item_id,p_organization_id,v_order_id,v_item.variant_id,v_item.stock_code,v_item.product_name,v_item.variant_name,
      v_item.requested_quantity,v_item.original_unit_price,v_item.calculated_unit_price,null,v_item.line_discount_total,v_item.line_total,v_item.id);
    v_remaining := v_item.requested_quantity;
    for v_balance in
      select ib.*,w.code from public.inventory_balances ib join public.warehouses w
        on w.organization_id=ib.organization_id and w.id=ib.warehouse_id and w.status='ACTIVE'
      where ib.organization_id=p_organization_id and ib.variant_id=v_item.variant_id and ib.available>0
      order by v_item.variant_id,w.code,w.id for update of ib
    loop
      exit when v_remaining <= 0;
      v_take := least(v_remaining,v_balance.available);
      update public.inventory_balances set reserved=reserved+v_take,available=available-v_take,updated_at=v_now where id=v_balance.id;
      insert into public.inventory_reservations (organization_id,warehouse_id,variant_id,cart_id,order_id,order_item_id,
        quantity,status,reserved_at,expires_at)
      values (p_organization_id,v_balance.warehouse_id,v_item.variant_id,p_cart_id,v_order_id,v_order_item_id,
        v_take,'ACTIVE',v_now,v_reserved_until);
      v_remaining := v_remaining-v_take;
    end loop;
    if v_remaining > 0 then raise exception 'ITEM_UNAVAILABLE' using errcode='P0001'; end if;

    for v_action in select value from jsonb_array_elements(coalesce(v_item.pricing_snapshot_json->'applied_actions','[]'::jsonb))
    loop
      insert into public.promotion_applied_benefits (organization_id,order_id,order_item_id,campaign_id,campaign_version_id,
        rule_id,action_id,benefit_type,quantity,snapshot_json)
      values (p_organization_id,v_order_id,v_order_item_id,(v_action->>'campaign_id')::uuid,
        (v_action->>'promotion_version_id')::uuid,(v_action->>'rule_id')::uuid,(v_action->>'action_id')::uuid,
        v_action->>'action_type',v_item.requested_quantity,jsonb_build_object('schema_version',1,'currency_code','THB',
        'campaign_id',v_action->>'campaign_id','promotion_version_id',v_action->>'promotion_version_id','rule_id',v_action->>'rule_id',
        'action_id',v_action->>'action_id','action_type',v_action->>'action_type','calculated_at',v_now));
    end loop;
  end loop;

  if coalesce((v_coupon->>'applied')::boolean,false) then
    insert into public.coupon_redemptions (organization_id,coupon_id,customer_id,cart_id,order_id,status,reserved_at)
    values (p_organization_id,(v_coupon->>'coupon_id')::uuid,v_context.customer_id,p_cart_id,v_order_id,'RESERVED',v_now);
    insert into public.promotion_applied_benefits (organization_id,order_id,campaign_id,campaign_version_id,rule_id,action_id,
      benefit_type,original_amount,benefit_amount,final_amount,snapshot_json)
    values (p_organization_id,v_order_id,(v_coupon->>'campaign_id')::uuid,(v_coupon->>'promotion_version_id')::uuid,
      (v_coupon->>'rule_id')::uuid,(v_coupon->>'action_id')::uuid,v_coupon->>'action_type',v_eligible,v_coupon_benefit,
      v_eligible-v_coupon_benefit,jsonb_build_object('schema_version',1,'currency_code','THB','campaign_id',v_coupon->>'campaign_id',
      'promotion_version_id',v_coupon->>'promotion_version_id','rule_id',v_coupon->>'rule_id','action_id',v_coupon->>'action_id',
      'action_type',v_coupon->>'action_type','eligible_base',to_char(v_eligible,'FM9999999999990.00'),
      'benefit_amount',to_char(v_coupon_benefit,'FM9999999999990.00'),'calculated_at',v_now));
  end if;

  insert into public.order_addresses (organization_id,order_id,address_type,recipient_name,phone,address_line1,address_line2,
    subdistrict,district,province,postal_code,country_code)
  values (p_organization_id,v_order_id,'SHIPPING',v_address->>'recipient_name',v_address->>'phone',v_address->>'address_line1',
    v_address->>'address_line2',v_address->>'subdistrict',v_address->>'district',v_address->>'province',v_address->>'postal_code','TH');
  insert into public.payments (organization_id,order_id,status,amount_expected,amount_received,currency_code)
  values (p_organization_id,v_order_id,'UNPAID',v_grand_total,0,'THB') returning id into v_payment_id;
  insert into public.order_status_history (organization_id,order_id,status_domain,from_status,to_status,changed_by,reason)
  values (p_organization_id,v_order_id,'ORDER',null,'PENDING_CONFIRMATION',v_context.profile_id,'STOREFRONT_CHECKOUT');
  insert into public.cart_events (organization_id,cart_id,event_type,actor_type,actor_id,payload_json)
  values (p_organization_id,p_cart_id,'checkout_completed','USER',v_context.profile_id,jsonb_build_object('request_id',p_request_id,
    'cart_id',p_cart_id,'order_id',v_order_id,'payment_id',v_payment_id,'currency_code','THB','grand_total',to_char(v_grand_total,'FM9999999999990.00')));
  insert into public.audit_logs (organization_id,actor_profile_id,actor_type,entity_type,entity_id,action,before_json,after_json,request_id)
  values (p_organization_id,v_context.profile_id,'USER','cart',p_cart_id,'STOREFRONT_CHECKOUT_SUBMITTED',
    jsonb_build_object('status','READY'),jsonb_build_object('status','CONVERTED','order_id',v_order_id),p_request_id),
    (p_organization_id,v_context.profile_id,'USER','order',v_order_id,'STOREFRONT_ORDER_CREATED',null,
    jsonb_build_object('order_status','PENDING_CONFIRMATION','payment_status','UNPAID','currency_code','THB','grand_total',to_char(v_grand_total,'FM9999999999990.00')),p_request_id);
  update public.carts set status='RESERVED',reserved_until=v_reserved_until,payment_due_at=v_payment_due_at,
    discount_total=round(discount_total+v_coupon_benefit,2),grand_total=v_grand_total,updated_at=v_now
  where id=p_cart_id and status='READY';
  if not found then raise exception 'CART_NOT_READY' using errcode='P0001'; end if;
  update public.carts set status='CONVERTED',updated_at=v_now where id=p_cart_id and status='RESERVED';
  perform public.internal_complete_checkout_idempotency(p_organization_id,'CHECKOUT_SUBMIT',p_request_id,'order',v_order_id);
  return public.internal_checkout_order_response(p_organization_id,v_order_id,'CHECKOUT_SUBMIT',false);
end;
$$;

create function public.internal_release_storefront_checkout(
  p_organization_id uuid,
  p_order_id uuid,
  p_to_status text,
  p_event_action text,
  p_reason text,
  p_request_id uuid
)
returns integer
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_res record;
  v_count integer := 0;
begin
  for v_res in select ir.* from public.inventory_reservations ir
    where ir.organization_id=p_organization_id and ir.order_id=p_order_id and ir.status='ACTIVE'
    order by ir.variant_id,ir.warehouse_id,ir.id for update
  loop
    update public.inventory_balances set reserved=reserved-v_res.quantity,available=available+v_res.quantity,
      updated_at=statement_timestamp()
    where organization_id=p_organization_id and warehouse_id=v_res.warehouse_id and variant_id=v_res.variant_id
      and reserved>=v_res.quantity;
    if not found then raise exception 'INVENTORY_RESERVATION_INCONSISTENT' using errcode='P0001'; end if;
    update public.inventory_reservations set status=case when p_to_status='PAYMENT_EXPIRED' then 'EXPIRED' else 'RELEASED' end,
      released_at=statement_timestamp() where id=v_res.id;
    v_count := v_count+1;
  end loop;
  update public.coupon_redemptions set status='RELEASED',released_at=statement_timestamp()
  where organization_id=p_organization_id and order_id=p_order_id and status='RESERVED';
  update public.orders set order_status=p_to_status,cancelled_at=case when p_to_status='CANCELLED' then statement_timestamp() else cancelled_at end,
    updated_at=statement_timestamp() where organization_id=p_organization_id and id=p_order_id;
  insert into public.order_status_history (organization_id,order_id,status_domain,from_status,to_status,reason)
  values (p_organization_id,p_order_id,'ORDER','PENDING_CONFIRMATION',p_to_status,p_reason);
  insert into public.audit_logs (organization_id,actor_type,entity_type,entity_id,action,before_json,after_json,reason,request_id)
  values (p_organization_id,'JOB','order',p_order_id,p_event_action,jsonb_build_object('order_status','PENDING_CONFIRMATION'),
    jsonb_build_object('order_status',p_to_status,'released_hold_count',v_count),p_reason,p_request_id);
  return v_count;
end;
$$;

create function public.api_expire_storefront_checkout(p_organization_id uuid,p_order_id uuid,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_hash bytea; v_idem jsonb; v_count integer;
begin
  if coalesce(auth.jwt()->>'role',current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;
  v_hash:=extensions.digest(convert_to(concat_ws('|','v1','CHECKOUT_EXPIRE',p_organization_id,p_order_id),'UTF8'),'sha256');
  v_idem:=public.internal_begin_checkout_idempotency(p_organization_id,'CHECKOUT_EXPIRE',p_request_id,null,null,v_hash);
  if coalesce((v_idem->>'idempotency_reused')::boolean,false) then return public.internal_checkout_order_response(p_organization_id,(v_idem->>'result_entity_id')::uuid,'CHECKOUT_EXPIRE',true); end if;
  select * into v_order from public.orders where organization_id=p_organization_id and id=p_order_id for update;
  if v_order.id is null or v_order.order_status<>'PENDING_CONFIRMATION' or v_order.payment_status<>'UNPAID'
     or v_order.payment_due_at is null or v_order.payment_due_at>statement_timestamp() then raise exception 'ORDER_NOT_EXPIRABLE' using errcode='P0001'; end if;
  v_count:=public.internal_release_storefront_checkout(p_organization_id,p_order_id,'PAYMENT_EXPIRED','CHECKOUT_EXPIRED','PAYMENT_DUE_EXPIRED',p_request_id);
  perform public.internal_complete_checkout_idempotency(p_organization_id,'CHECKOUT_EXPIRE',p_request_id,'order',p_order_id);
  return public.internal_checkout_order_response(p_organization_id,p_order_id,'CHECKOUT_EXPIRE',false)||jsonb_build_object('released_hold_count',v_count);
end; $$;

create function public.api_compensate_storefront_checkout(p_organization_id uuid,p_order_id uuid,p_failure_code text,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_hash bytea; v_idem jsonb; v_count integer;
begin
  if coalesce(auth.jwt()->>'role',current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;
  if p_failure_code is distinct from 'CHECKOUT_POST_COMMIT_FAILED' then raise exception 'COMPENSATION_REASON_INVALID' using errcode='22023'; end if;
  v_hash:=extensions.digest(convert_to(concat_ws('|','v1','CHECKOUT_COMPENSATE',p_organization_id,p_order_id,p_failure_code),'UTF8'),'sha256');
  v_idem:=public.internal_begin_checkout_idempotency(p_organization_id,'CHECKOUT_COMPENSATE',p_request_id,null,null,v_hash);
  if coalesce((v_idem->>'idempotency_reused')::boolean,false) then return public.internal_checkout_order_response(p_organization_id,(v_idem->>'result_entity_id')::uuid,'CHECKOUT_COMPENSATE',true); end if;
  select * into v_order from public.orders where organization_id=p_organization_id and id=p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_COMPENSATABLE' using errcode='P0001'; end if;
  if v_order.order_status='CANCELLED' and v_order.payment_status='UNPAID' then
    perform public.internal_complete_checkout_idempotency(p_organization_id,'CHECKOUT_COMPENSATE',p_request_id,'order',p_order_id);
    return public.internal_checkout_order_response(p_organization_id,p_order_id,'CHECKOUT_COMPENSATE',false)||jsonb_build_object('released_hold_count',0);
  end if;
  if v_order.order_status<>'PENDING_CONFIRMATION' or v_order.payment_status<>'UNPAID'
     or not exists(select 1 from public.inventory_reservations where organization_id=p_organization_id and order_id=p_order_id and status='ACTIVE')
  then raise exception 'ORDER_NOT_COMPENSATABLE' using errcode='P0001'; end if;
  v_count:=public.internal_release_storefront_checkout(p_organization_id,p_order_id,'CANCELLED','CHECKOUT_COMPENSATED',p_failure_code,p_request_id);
  perform public.internal_complete_checkout_idempotency(p_organization_id,'CHECKOUT_COMPENSATE',p_request_id,'order',p_order_id);
  return public.internal_checkout_order_response(p_organization_id,p_order_id,'CHECKOUT_COMPENSATE',false)||jsonb_build_object('released_hold_count',v_count);
end; $$;

revoke all on function public.protect_coupon_checkout_channel() from public,anon,authenticated,service_role;
revoke all on function public.protect_coupon_linked_campaign_scope() from public,anon,authenticated,service_role;
revoke all on function public.protect_coupon_linked_version_campaign() from public,anon,authenticated,service_role;
revoke all on function public.internal_begin_checkout_idempotency(uuid,text,uuid,uuid,uuid,bytea) from public,anon,authenticated,service_role;
revoke all on function public.internal_complete_checkout_idempotency(uuid,text,uuid,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.internal_checkout_order_response(uuid,uuid,text,boolean) from public,anon,authenticated,service_role;
revoke all on function public.internal_evaluate_storefront_coupon(uuid,uuid,uuid,text,numeric,numeric,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.internal_release_storefront_checkout(uuid,uuid,text,text,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.api_submit_storefront_checkout(uuid,uuid,uuid,jsonb,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.api_expire_storefront_checkout(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.api_compensate_storefront_checkout(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.api_submit_storefront_checkout(uuid,uuid,uuid,jsonb,text,uuid) to authenticated;
grant execute on function public.api_expire_storefront_checkout(uuid,uuid,uuid) to service_role;
grant execute on function public.api_compensate_storefront_checkout(uuid,uuid,text,uuid) to service_role;

comment on function public.api_submit_storefront_checkout(uuid,uuid,uuid,jsonb,text,uuid) is
  'AC01-AC30 and CP01-CP30 authenticated atomic Storefront checkout submission.';
comment on function public.api_expire_storefront_checkout(uuid,uuid,uuid) is
  'AC01-AC30 service-role unpaid checkout expiry and hold release boundary.';
comment on function public.api_compensate_storefront_checkout(uuid,uuid,text,uuid) is
  'AC01-AC30 service-role post-commit compensation boundary; failure code allowlist is CHECKOUT_POST_COMMIT_FAILED only.';
