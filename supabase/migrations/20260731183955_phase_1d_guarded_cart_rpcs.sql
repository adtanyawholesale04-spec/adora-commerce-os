-- Phase 1D Part 3C guarded Storefront cart RPCs.
-- C01-C24 only: no inventory/coupon reservation, order/payment creation,
-- provider integration or Production activation.

do $$
declare
  v_missing text;
begin
  select string_agg(required_object, ', ' order by required_object)
  into v_missing
  from unnest(array[
    'public.organizations',
    'public.profiles',
    'public.organization_memberships',
    'public.customer_profile_links',
    'public.customers',
    'public.organization_storefronts',
    'public.storefront_product_listings',
    'public.organization_checkout_settings',
    'public.features',
    'public.organization_entitlements',
    'public.carts',
    'public.cart_items',
    'public.cart_events',
    'public.products',
    'public.product_variants',
    'public.warehouses',
    'public.inventory_balances',
    'public.commerce_idempotency_keys'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Phase 1D guarded cart RPCs missing dependencies: %', v_missing;
  end if;

  if to_regprocedure(
    'public.internal_evaluate_storefront_variant_promotion(uuid,uuid,numeric,timestamp with time zone)'
  ) is null then
    raise exception 'Phase 1D guarded cart RPCs missing frozen promotion evaluator';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'Phase 1D guarded cart RPCs missing extensions.digest(bytea,text)';
  end if;

  if to_regprocedure('public.api_resolve_storefront_cart(uuid,uuid)') is not null
     or to_regprocedure(
       'public.api_set_storefront_cart_item(uuid,uuid,uuid,numeric,uuid)'
     ) is not null
     or to_regprocedure(
       'public.api_remove_storefront_cart_item(uuid,uuid,uuid,uuid)'
     ) is not null
     or to_regprocedure(
       'public.api_start_storefront_checkout(uuid,uuid,uuid)'
     ) is not null then
    raise exception 'Phase 1D guarded cart RPC target already exists';
  end if;
end;
$$;

create function public.internal_storefront_checkout_context(
  p_organization_id uuid
)
returns table (
  profile_id uuid,
  customer_id uuid,
  flat_shipping_charge numeric
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_membership_id uuid;
  v_customer_id uuid;
  v_flat_shipping numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'ACTIVE'
  for share;

  if v_profile_id is null then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  select om.id
  into v_membership_id
  from public.organization_memberships om
  where om.organization_id = p_organization_id
    and om.profile_id = v_profile_id
    and om.status = 'ACTIVE'
  for share;

  if v_membership_id is null then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  select cpl.customer_id
  into v_customer_id
  from public.customer_profile_links cpl
  join public.customers c
    on c.organization_id = cpl.organization_id
   and c.id = cpl.customer_id
   and c.status = 'ACTIVE'
  where cpl.organization_id = p_organization_id
    and cpl.profile_id = v_profile_id
    and cpl.link_status = 'ACTIVE'
  for share of cpl, c;

  if v_customer_id is null then
    raise exception 'ACTIVE_CUSTOMER_LINK_REQUIRED' using errcode = '42501';
  end if;

  select settings.flat_shipping_charge
  into v_flat_shipping
  from public.organizations o
  join public.organization_storefronts storefront
    on storefront.organization_id = o.id
   and storefront.publication_status = 'PUBLISHED'
  join public.organization_checkout_settings settings
    on settings.organization_id = o.id
   and settings.status = 'ACTIVE'
   and settings.currency_code = 'THB'
  where o.id = p_organization_id
    and o.status = 'ACTIVE'
    and o.currency_code = 'THB'
    and exists (
      select 1
      from public.organization_entitlements oe
      join public.features f on f.id = oe.feature_id
      where oe.organization_id = o.id
        and f.code = 'storefront.checkout'
        and f.feature_type = 'BOOLEAN'
        and f.status = 'ACTIVE'
        and oe.enabled
        and (oe.valid_from is null or oe.valid_from <= statement_timestamp())
        and (oe.valid_until is null or oe.valid_until > statement_timestamp())
    )
  for share of o, storefront, settings;

  if v_flat_shipping is null then
    raise exception 'CHECKOUT_NOT_AVAILABLE' using errcode = '42501';
  end if;

  profile_id := v_profile_id;
  customer_id := v_customer_id;
  flat_shipping_charge := v_flat_shipping;
  return next;
end;
$$;

create function public.internal_begin_commerce_idempotency(
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
  v_inserted_count bigint := 0;
begin
  if p_request_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  insert into public.commerce_idempotency_keys (
    organization_id,
    operation,
    request_id,
    actor_profile_id,
    customer_id,
    request_hash,
    expires_at
  ) values (
    p_organization_id,
    p_operation,
    p_request_id,
    p_actor_profile_id,
    p_customer_id,
    p_request_hash,
    statement_timestamp() + interval '30 days'
  )
  on conflict (organization_id, operation, request_id) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 1 then
    return jsonb_build_object('is_new', true, 'idempotency_reused', false);
  end if;

  select key_row.*
  into v_existing
  from public.commerce_idempotency_keys key_row
  where key_row.organization_id = p_organization_id
    and key_row.operation = p_operation
    and key_row.request_id = p_request_id
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

  if v_existing.result_entity_type <> 'cart'
     or v_existing.result_entity_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'is_new', false,
    'idempotency_reused', true,
    'cart_id', v_existing.result_entity_id
  );
end;
$$;

create function public.internal_complete_cart_idempotency(
  p_organization_id uuid,
  p_operation text,
  p_request_id uuid,
  p_cart_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  update public.commerce_idempotency_keys key_row
  set state = 'SUCCEEDED',
      result_entity_type = 'cart',
      result_entity_id = p_cart_id,
      completed_at = statement_timestamp()
  where key_row.organization_id = p_organization_id
    and key_row.operation = p_operation
    and key_row.request_id = p_request_id
    and key_row.state = 'IN_PROGRESS';

  if not found then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
end;
$$;

create function public.internal_storefront_cart_response(
  p_organization_id uuid,
  p_customer_id uuid,
  p_cart_id uuid,
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
  v_cart public.carts%rowtype;
  v_items jsonb;
begin
  select c.*
  into v_cart
  from public.carts c
  where c.organization_id = p_organization_id
    and c.customer_id = p_customer_id
    and c.id = p_cart_id
    and c.source = 'STOREFRONT';

  if v_cart.id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0001';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', pv.product_id,
        'variant_id', ci.variant_id,
        'quantity', to_char(ci.requested_quantity, 'FM9999999990.000'),
        'original_unit_price', to_char(ci.original_unit_price, 'FM9999999999990.00'),
        'calculated_unit_price', to_char(ci.calculated_unit_price, 'FM9999999999990.00'),
        'line_discount_total', to_char(ci.line_discount_total, 'FM9999999999990.00'),
        'line_total', to_char(ci.line_total, 'FM9999999999990.00'),
        'pricing_snapshot', ci.pricing_snapshot_json
      ) order by ci.variant_id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.cart_items ci
  join public.product_variants pv
    on pv.organization_id = ci.organization_id
   and pv.id = ci.variant_id
  where ci.organization_id = p_organization_id
    and ci.cart_id = p_cart_id;

  return jsonb_build_object(
    'ok', true,
    'operation', p_operation,
    'cart_id', v_cart.id,
    'status', v_cart.status,
    'currency_code', v_cart.currency_code,
    'subtotal', to_char(v_cart.subtotal, 'FM9999999999990.00'),
    'discount_total', to_char(v_cart.discount_total, 'FM9999999999990.00'),
    'shipping_estimate', to_char(v_cart.shipping_estimate, 'FM9999999999990.00'),
    'grand_total', to_char(v_cart.grand_total, 'FM9999999999990.00'),
    'items', v_items,
    'idempotency_reused', p_idempotency_reused
  );
end;
$$;

create function public.internal_reprice_storefront_cart(
  p_organization_id uuid,
  p_cart_id uuid,
  p_flat_shipping_charge numeric,
  p_evaluated_at timestamptz default statement_timestamp()
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_item record;
  v_pricing jsonb;
  v_available numeric(14,3);
  v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := 0;
  v_line_total numeric(14,2) := 0;
  v_item_count integer := 0;
  v_shipping numeric(14,2);
begin
  perform c.id
  from public.promotion_campaigns c
  where c.organization_id = p_organization_id
    and c.status = 'ACTIVE'
    and c.scope = 'CART'
  order by c.priority desc, c.id
  for share;

  for v_item in
    select ci.*
    from public.cart_items ci
    where ci.organization_id = p_organization_id
      and ci.cart_id = p_cart_id
    order by ci.variant_id
    for update
  loop
    v_item_count := v_item_count + 1;

    perform pv.id
    from public.product_variants pv
    join public.products p
      on p.organization_id = pv.organization_id
     and p.id = pv.product_id
     and p.status = 'ACTIVE'
    join public.storefront_product_listings listing
      on listing.organization_id = p.organization_id
     and listing.product_id = p.id
     and listing.visibility = 'VISIBLE'
    join public.organization_storefronts storefront
      on storefront.organization_id = listing.organization_id
     and storefront.id = listing.storefront_id
     and storefront.publication_status = 'PUBLISHED'
    where pv.organization_id = p_organization_id
      and pv.id = v_item.variant_id
      and pv.status = 'ACTIVE'
    for share of pv, p, listing, storefront;

    if not found then
      raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
    end if;

    perform ib.id
    from public.inventory_balances ib
    join public.warehouses w
      on w.organization_id = ib.organization_id
     and w.id = ib.warehouse_id
     and w.status = 'ACTIVE'
    where ib.organization_id = p_organization_id
      and ib.variant_id = v_item.variant_id
    order by w.code, w.id, ib.variant_id
    for share of ib, w;

    select coalesce(sum(ib.available), 0)
    into v_available
    from public.inventory_balances ib
    join public.warehouses w
      on w.organization_id = ib.organization_id
     and w.id = ib.warehouse_id
     and w.status = 'ACTIVE'
    where ib.organization_id = p_organization_id
      and ib.variant_id = v_item.variant_id;

    if v_available < v_item.requested_quantity then
      raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
    end if;

    v_pricing := public.internal_evaluate_storefront_variant_promotion(
      p_organization_id,
      v_item.variant_id,
      v_item.requested_quantity,
      p_evaluated_at
    );

    update public.cart_items ci
    set original_unit_price = (v_pricing ->> 'original_unit_price')::numeric,
        calculated_unit_price = (v_pricing ->> 'calculated_unit_price')::numeric,
        line_discount_total = (v_pricing ->> 'line_discount_total')::numeric,
        line_total = (v_pricing ->> 'line_total')::numeric,
        pricing_snapshot_json = v_pricing -> 'pricing_snapshot',
        updated_at = statement_timestamp()
    where ci.id = v_item.id;

    v_subtotal := round(
      v_subtotal
      + round(v_item.requested_quantity * (v_pricing ->> 'original_unit_price')::numeric, 2),
      2
    );
    v_discount := round(
      v_discount + (v_pricing ->> 'line_discount_total')::numeric,
      2
    );
    v_line_total := round(
      v_line_total + (v_pricing ->> 'line_total')::numeric,
      2
    );
  end loop;

  v_shipping := case
    when v_item_count = 0 then 0
    else round(p_flat_shipping_charge, 2)
  end;

  update public.carts c
  set subtotal = v_subtotal,
      discount_total = v_discount,
      shipping_estimate = v_shipping,
      grand_total = round(v_line_total + v_shipping, 2),
      updated_at = statement_timestamp()
  where c.organization_id = p_organization_id
    and c.id = p_cart_id;

  if not found then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

create function public.api_resolve_storefront_cart(
  p_organization_id uuid,
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
  v_idempotency jsonb;
  v_request_hash bytea;
  v_cart public.carts%rowtype;
begin
  if p_request_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  select * into strict v_context
  from public.internal_storefront_checkout_context(p_organization_id);

  v_request_hash := extensions.digest(
    convert_to(
      concat_ws(
        '|',
        'v1',
        'CART_CREATE',
        p_organization_id::text,
        v_context.customer_id::text,
        '-',
        '-',
        '-'
      ),
      'UTF8'
    ),
    'sha256'
  );

  v_idempotency := public.internal_begin_commerce_idempotency(
    p_organization_id,
    'CART_CREATE',
    p_request_id,
    v_context.profile_id,
    v_context.customer_id,
    v_request_hash
  );

  if coalesce((v_idempotency ->> 'idempotency_reused')::boolean, false) then
    return public.internal_storefront_cart_response(
      p_organization_id,
      v_context.customer_id,
      (v_idempotency ->> 'cart_id')::uuid,
      'CART_CREATE',
      true
    );
  end if;

  update public.carts c
  set status = 'EXPIRED',
      updated_at = statement_timestamp()
  where c.organization_id = p_organization_id
    and c.customer_id = v_context.customer_id
    and c.source = 'STOREFRONT'
    and c.status = 'OPEN'
    and c.updated_at <= statement_timestamp() - interval '30 days';

  select c.*
  into v_cart
  from public.carts c
  where c.organization_id = p_organization_id
    and c.customer_id = v_context.customer_id
    and c.source = 'STOREFRONT'
    and c.status in ('OPEN', 'READY', 'RESERVED')
  order by case c.status when 'OPEN' then 1 when 'READY' then 2 else 3 end, c.id
  limit 1
  for update;

  if v_cart.id is null then
    begin
      insert into public.carts (
        organization_id,
        customer_id,
        source,
        status,
        currency_code,
        created_by
      ) values (
        p_organization_id,
        v_context.customer_id,
        'STOREFRONT',
        'OPEN',
        'THB',
        v_context.profile_id
      )
      returning * into v_cart;
    exception
      when unique_violation then
        select c.*
        into v_cart
        from public.carts c
        where c.organization_id = p_organization_id
          and c.customer_id = v_context.customer_id
          and c.source = 'STOREFRONT'
          and c.status in ('OPEN', 'READY', 'RESERVED')
        order by case c.status when 'OPEN' then 1 when 'READY' then 2 else 3 end, c.id
        limit 1
        for update;
    end;
  end if;

  if v_cart.id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0001';
  end if;

  perform public.internal_complete_cart_idempotency(
    p_organization_id,
    'CART_CREATE',
    p_request_id,
    v_cart.id
  );

  return public.internal_storefront_cart_response(
    p_organization_id,
    v_context.customer_id,
    v_cart.id,
    'CART_CREATE',
    false
  );
end;
$$;

create function public.api_set_storefront_cart_item(
  p_organization_id uuid,
  p_cart_id uuid,
  p_variant_id uuid,
  p_quantity numeric,
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
  v_cart public.carts%rowtype;
  v_base_price numeric(14,2);
  v_request_hash bytea;
  v_idempotency jsonb;
begin
  if p_cart_id is null
     or p_variant_id is null
     or p_request_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  if p_quantity is null
     or p_quantity <= 0
     or p_quantity > 999.000
     or p_quantity <> round(p_quantity, 3) then
    raise exception 'QUANTITY_INVALID' using errcode = '22023';
  end if;

  select * into strict v_context
  from public.internal_storefront_checkout_context(p_organization_id);

  v_request_hash := extensions.digest(
    convert_to(
      concat_ws(
        '|',
        'v1',
        'CART_ITEM_SET',
        p_organization_id::text,
        v_context.customer_id::text,
        p_cart_id::text,
        p_variant_id::text,
        to_char(p_quantity, 'FM9999999990.000')
      ),
      'UTF8'
    ),
    'sha256'
  );

  v_idempotency := public.internal_begin_commerce_idempotency(
    p_organization_id,
    'CART_ITEM_SET',
    p_request_id,
    v_context.profile_id,
    v_context.customer_id,
    v_request_hash
  );

  if coalesce((v_idempotency ->> 'idempotency_reused')::boolean, false) then
    return public.internal_storefront_cart_response(
      p_organization_id,
      v_context.customer_id,
      (v_idempotency ->> 'cart_id')::uuid,
      'CART_ITEM_SET',
      true
    );
  end if;

  select c.*
  into v_cart
  from public.carts c
  where c.organization_id = p_organization_id
    and c.customer_id = v_context.customer_id
    and c.id = p_cart_id
    and c.source = 'STOREFRONT'
  for update;

  if v_cart.id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_cart.status <> 'OPEN' then
    raise exception 'CART_NOT_MUTABLE' using errcode = 'P0001';
  end if;

  select pv.base_price
  into v_base_price
  from public.product_variants pv
  join public.products p
    on p.organization_id = pv.organization_id
   and p.id = pv.product_id
   and p.status = 'ACTIVE'
  join public.storefront_product_listings listing
    on listing.organization_id = p.organization_id
   and listing.product_id = p.id
   and listing.visibility = 'VISIBLE'
  join public.organization_storefronts storefront
    on storefront.organization_id = listing.organization_id
   and storefront.id = listing.storefront_id
   and storefront.publication_status = 'PUBLISHED'
  where pv.organization_id = p_organization_id
    and pv.id = p_variant_id
    and pv.status = 'ACTIVE'
  for share of pv, p, listing, storefront;

  if v_base_price is null then
    raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into public.cart_items (
    organization_id,
    cart_id,
    variant_id,
    requested_quantity,
    original_unit_price,
    calculated_unit_price,
    line_discount_total,
    line_total
  ) values (
    p_organization_id,
    p_cart_id,
    p_variant_id,
    p_quantity,
    v_base_price,
    v_base_price,
    0,
    round(v_base_price * p_quantity, 2)
  )
  on conflict (organization_id, cart_id, variant_id) do update
  set requested_quantity = excluded.requested_quantity,
      updated_at = statement_timestamp();

  perform public.internal_reprice_storefront_cart(
    p_organization_id,
    p_cart_id,
    v_context.flat_shipping_charge,
    statement_timestamp()
  );

  perform public.internal_complete_cart_idempotency(
    p_organization_id,
    'CART_ITEM_SET',
    p_request_id,
    p_cart_id
  );

  return public.internal_storefront_cart_response(
    p_organization_id,
    v_context.customer_id,
    p_cart_id,
    'CART_ITEM_SET',
    false
  );
end;
$$;

create function public.api_remove_storefront_cart_item(
  p_organization_id uuid,
  p_cart_id uuid,
  p_variant_id uuid,
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
  v_cart public.carts%rowtype;
  v_request_hash bytea;
  v_idempotency jsonb;
begin
  if p_cart_id is null
     or p_variant_id is null
     or p_request_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  select * into strict v_context
  from public.internal_storefront_checkout_context(p_organization_id);

  v_request_hash := extensions.digest(
    convert_to(
      concat_ws(
        '|',
        'v1',
        'CART_ITEM_REMOVE',
        p_organization_id::text,
        v_context.customer_id::text,
        p_cart_id::text,
        p_variant_id::text,
        '-'
      ),
      'UTF8'
    ),
    'sha256'
  );

  v_idempotency := public.internal_begin_commerce_idempotency(
    p_organization_id,
    'CART_ITEM_REMOVE',
    p_request_id,
    v_context.profile_id,
    v_context.customer_id,
    v_request_hash
  );

  if coalesce((v_idempotency ->> 'idempotency_reused')::boolean, false) then
    return public.internal_storefront_cart_response(
      p_organization_id,
      v_context.customer_id,
      (v_idempotency ->> 'cart_id')::uuid,
      'CART_ITEM_REMOVE',
      true
    );
  end if;

  select c.*
  into v_cart
  from public.carts c
  where c.organization_id = p_organization_id
    and c.customer_id = v_context.customer_id
    and c.id = p_cart_id
    and c.source = 'STOREFRONT'
  for update;

  if v_cart.id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_cart.status <> 'OPEN' then
    raise exception 'CART_NOT_MUTABLE' using errcode = 'P0001';
  end if;

  delete from public.cart_items ci
  where ci.organization_id = p_organization_id
    and ci.cart_id = p_cart_id
    and ci.variant_id = p_variant_id;

  perform public.internal_reprice_storefront_cart(
    p_organization_id,
    p_cart_id,
    v_context.flat_shipping_charge,
    statement_timestamp()
  );

  perform public.internal_complete_cart_idempotency(
    p_organization_id,
    'CART_ITEM_REMOVE',
    p_request_id,
    p_cart_id
  );

  return public.internal_storefront_cart_response(
    p_organization_id,
    v_context.customer_id,
    p_cart_id,
    'CART_ITEM_REMOVE',
    false
  );
end;
$$;

create function public.api_start_storefront_checkout(
  p_organization_id uuid,
  p_cart_id uuid,
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
  v_cart public.carts%rowtype;
  v_request_hash bytea;
  v_idempotency jsonb;
begin
  if p_cart_id is null or p_request_id is null then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  select * into strict v_context
  from public.internal_storefront_checkout_context(p_organization_id);

  v_request_hash := extensions.digest(
    convert_to(
      concat_ws(
        '|',
        'v1',
        'CHECKOUT_START',
        p_organization_id::text,
        v_context.customer_id::text,
        p_cart_id::text,
        '-',
        '-'
      ),
      'UTF8'
    ),
    'sha256'
  );

  v_idempotency := public.internal_begin_commerce_idempotency(
    p_organization_id,
    'CHECKOUT_START',
    p_request_id,
    v_context.profile_id,
    v_context.customer_id,
    v_request_hash
  );

  if coalesce((v_idempotency ->> 'idempotency_reused')::boolean, false) then
    return public.internal_storefront_cart_response(
      p_organization_id,
      v_context.customer_id,
      (v_idempotency ->> 'cart_id')::uuid,
      'CHECKOUT_START',
      true
    );
  end if;

  select c.*
  into v_cart
  from public.carts c
  where c.organization_id = p_organization_id
    and c.customer_id = v_context.customer_id
    and c.id = p_cart_id
    and c.source = 'STOREFRONT'
  for update;

  if v_cart.id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_cart.status <> 'OPEN' then
    raise exception 'CART_NOT_MUTABLE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.cart_items ci
    where ci.organization_id = p_organization_id
      and ci.cart_id = p_cart_id
  ) then
    raise exception 'CART_NOT_MUTABLE' using errcode = 'P0001';
  end if;

  perform public.internal_reprice_storefront_cart(
    p_organization_id,
    p_cart_id,
    v_context.flat_shipping_charge,
    statement_timestamp()
  );

  update public.carts c
  set status = 'READY',
      updated_at = statement_timestamp()
  where c.organization_id = p_organization_id
    and c.id = p_cart_id
    and c.status = 'OPEN';

  if not found then
    raise exception 'CART_NOT_MUTABLE' using errcode = 'P0001';
  end if;

  insert into public.cart_events (
    organization_id,
    cart_id,
    event_type,
    actor_type,
    actor_id,
    payload_json
  ) values (
    p_organization_id,
    p_cart_id,
    'checkout_started',
    'USER',
    v_context.profile_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'customer_id', v_context.customer_id,
      'cart_id', p_cart_id,
      'currency_code', 'THB',
      'subtotal', (select c.subtotal from public.carts c where c.id = p_cart_id),
      'discount_total', (select c.discount_total from public.carts c where c.id = p_cart_id),
      'shipping_estimate', (select c.shipping_estimate from public.carts c where c.id = p_cart_id),
      'grand_total', (select c.grand_total from public.carts c where c.id = p_cart_id)
    )
  );

  perform public.internal_complete_cart_idempotency(
    p_organization_id,
    'CHECKOUT_START',
    p_request_id,
    p_cart_id
  );

  return public.internal_storefront_cart_response(
    p_organization_id,
    v_context.customer_id,
    p_cart_id,
    'CHECKOUT_START',
    false
  );
end;
$$;

revoke all on function public.internal_storefront_checkout_context(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.internal_begin_commerce_idempotency(
  uuid, text, uuid, uuid, uuid, bytea
) from public, anon, authenticated, service_role;
revoke all on function public.internal_complete_cart_idempotency(
  uuid, text, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.internal_storefront_cart_response(
  uuid, uuid, uuid, text, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.internal_reprice_storefront_cart(
  uuid, uuid, numeric, timestamptz
) from public, anon, authenticated, service_role;

revoke all on function public.api_resolve_storefront_cart(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.api_set_storefront_cart_item(
  uuid, uuid, uuid, numeric, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.api_remove_storefront_cart_item(
  uuid, uuid, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.api_start_storefront_checkout(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.api_resolve_storefront_cart(uuid, uuid)
  to authenticated;
grant execute on function public.api_set_storefront_cart_item(
  uuid, uuid, uuid, numeric, uuid
) to authenticated;
grant execute on function public.api_remove_storefront_cart_item(
  uuid, uuid, uuid, uuid
) to authenticated;
grant execute on function public.api_start_storefront_checkout(uuid, uuid, uuid)
  to authenticated;

revoke insert, update, delete on table public.carts
  from anon, authenticated;
revoke insert, update, delete on table public.cart_items
  from anon, authenticated;
revoke insert, update, delete on table public.cart_events
  from anon, authenticated;

comment on function public.api_resolve_storefront_cart(uuid, uuid) is
  'C01-C24 customer-owned Storefront cart resolve/create boundary.';
comment on function public.api_set_storefront_cart_item(
  uuid, uuid, uuid, numeric, uuid
) is 'C01-C24 guarded Storefront cart item set and full-cart reprice boundary.';
comment on function public.api_remove_storefront_cart_item(
  uuid, uuid, uuid, uuid
) is 'C01-C24 guarded Storefront cart item removal and full-cart reprice boundary.';
comment on function public.api_start_storefront_checkout(uuid, uuid, uuid) is
  'C01-C24 OPEN-to-READY checkout start boundary without inventory or coupon reservation.';
