\set ON_ERROR_STOP on

begin;

do $$
declare
  v_api text;
  v_internal text;
begin
  foreach v_api in array array[
    'api_resolve_storefront_cart',
    'api_set_storefront_cart_item',
    'api_remove_storefront_cart_item',
    'api_start_storefront_checkout'
  ]
  loop
    if not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = v_api
        and p.prosecdef
        and p.provolatile = 'v'
        and p.proconfig @> array['search_path=public']
    ) then
      raise exception 'Guarded cart API % is not a hardened volatile definer', v_api;
    end if;
  end loop;

  if not has_function_privilege(
    'authenticated',
    'public.api_resolve_storefront_cart(uuid,uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.api_resolve_storefront_cart(uuid,uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'service_role',
    'public.api_resolve_storefront_cart(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Guarded cart API role grants are incorrect';
  end if;

  foreach v_internal in array array[
    'internal_storefront_checkout_context',
    'internal_begin_commerce_idempotency',
    'internal_complete_cart_idempotency',
    'internal_storefront_cart_response',
    'internal_reprice_storefront_cart'
  ]
  loop
    if exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = v_internal
        and (
          has_function_privilege('anon', p.oid, 'EXECUTE')
          or has_function_privilege('authenticated', p.oid, 'EXECUTE')
          or has_function_privilege('service_role', p.oid, 'EXECUTE')
        )
    ) then
      raise exception 'Data API role can execute internal helper %', v_internal;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.carts', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.cart_items', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.cart_events', 'INSERT,UPDATE,DELETE') then
    raise exception 'Authenticated retained direct cart mutation grants';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'b0000000-0000-4000-8000-000000000501',
    'authenticated', 'authenticated', 'guarded-cart@example.test', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'b0000000-0000-4000-8000-000000000502',
    'authenticated', 'authenticated', 'guarded-cart-outsider@example.test', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.organizations (id, name, slug, status, currency_code)
values
  ('b1000000-0000-4000-8000-000000000501', 'Guarded Cart A', 'guarded-cart-a', 'ACTIVE', 'THB'),
  ('b1000000-0000-4000-8000-000000000502', 'Guarded Cart B', 'guarded-cart-b', 'ACTIVE', 'THB');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  ('b2000000-0000-4000-8000-000000000501', 'b0000000-0000-4000-8000-000000000501', 'Cart Customer', 'ACTIVE'),
  ('b2000000-0000-4000-8000-000000000502', 'b0000000-0000-4000-8000-000000000502', 'Cart Outsider', 'ACTIVE');

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'b3000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'b2000000-0000-4000-8000-000000000501',
    'ACTIVE', true, now()
  ),
  (
    'b3000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'b2000000-0000-4000-8000-000000000502',
    'ACTIVE', true, now()
  );

insert into public.customers (
  id, organization_id, customer_code, display_name, status
) values
  (
    'b4000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'CART-CUSTOMER-A', 'Cart Customer A', 'ACTIVE'
  ),
  (
    'b4000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'CART-CUSTOMER-B', 'Cart Customer B', 'ACTIVE'
  );

insert into public.customer_profile_links (
  id, organization_id, customer_id, profile_id, link_status,
  link_source, verification_method, verified_at
) values
  (
    'b5000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'b4000000-0000-4000-8000-000000000501',
    'b2000000-0000-4000-8000-000000000501',
    'ACTIVE', 'VERIFIED_SIGNUP', 'EMAIL_OTP', now()
  ),
  (
    'b5000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'b4000000-0000-4000-8000-000000000502',
    'b2000000-0000-4000-8000-000000000502',
    'ACTIVE', 'VERIFIED_SIGNUP', 'EMAIL_OTP', now()
  );

insert into public.organization_storefronts (
  id, organization_id, publication_status, tagline,
  published_at, published_by
) values
  (
    'b6000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'PUBLISHED', 'Guarded Cart A', now(),
    'b2000000-0000-4000-8000-000000000501'
  ),
  (
    'b6000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'PUBLISHED', 'Guarded Cart B', now(),
    'b2000000-0000-4000-8000-000000000502'
  );

insert into public.organization_checkout_settings (
  organization_id, status, currency_code, flat_shipping_charge
) values
  ('b1000000-0000-4000-8000-000000000501', 'ACTIVE', 'THB', 35),
  ('b1000000-0000-4000-8000-000000000502', 'ACTIVE', 'THB', 45);

insert into public.organization_entitlements (
  organization_id, feature_id, source_type, enabled, valid_from
)
select fixture.organization_id, f.id, 'MANUAL_OVERRIDE', true, now() - interval '1 day'
from (
  values
    ('b1000000-0000-4000-8000-000000000501'::uuid),
    ('b1000000-0000-4000-8000-000000000502'::uuid)
) as fixture(organization_id)
cross join public.features f
where f.code = 'storefront.checkout';

insert into public.products (
  id, organization_id, product_code, name, status
) values
  (
    'b7000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'CART-PRODUCT-A', 'Cart Product A', 'ACTIVE'
  ),
  (
    'b7000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'CART-PRODUCT-B', 'Cart Product B', 'ACTIVE'
  );

insert into public.product_variants (
  id, organization_id, product_id, stock_code, variant_name,
  base_price, cost_price, minimum_selling_price, status
) values
  (
    'b8000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'b7000000-0000-4000-8000-000000000501',
    'CART-A-1', 'Standard', 100, 20, 50, 'ACTIVE'
  ),
  (
    'b8000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'b7000000-0000-4000-8000-000000000502',
    'CART-B-1', 'Private', 200, 40, 100, 'ACTIVE'
  );

insert into public.storefront_product_listings (
  id, organization_id, storefront_id, product_id, public_handle,
  visibility, visible_at
) values
  (
    'b9000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'b6000000-0000-4000-8000-000000000501',
    'b7000000-0000-4000-8000-000000000501',
    'cart-product-a', 'VISIBLE', now()
  ),
  (
    'b9000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000502',
    'b6000000-0000-4000-8000-000000000502',
    'b7000000-0000-4000-8000-000000000502',
    'cart-product-b', 'VISIBLE', now()
  );

insert into public.warehouses (id, organization_id, code, name, status)
values
  (
    'ba000000-0000-4000-8000-000000000501',
    'b1000000-0000-4000-8000-000000000501',
    'ACTIVE-A', 'Active Warehouse', 'ACTIVE'
  ),
  (
    'ba000000-0000-4000-8000-000000000502',
    'b1000000-0000-4000-8000-000000000501',
    'INACTIVE-A', 'Inactive Warehouse', 'INACTIVE'
  );

insert into public.inventory_balances (
  organization_id, warehouse_id, variant_id,
  on_hand, reserved, allocated, available
) values
  (
    'b1000000-0000-4000-8000-000000000501',
    'ba000000-0000-4000-8000-000000000501',
    'b8000000-0000-4000-8000-000000000501',
    5, 0, 0, 5
  ),
  (
    'b1000000-0000-4000-8000-000000000501',
    'ba000000-0000-4000-8000-000000000502',
    'b8000000-0000-4000-8000-000000000501',
    100, 0, 0, 100
  );

insert into public.promotion_campaigns (
  id, organization_id, code, name, status, scope, priority, stackable, currency_code
) values (
  'bb000000-0000-4000-8000-000000000501',
  'b1000000-0000-4000-8000-000000000501',
  'CART-10', 'Cart 10 Percent', 'ACTIVE', 'CART', 100, true, 'THB'
);

insert into public.promotion_campaign_versions (
  id, organization_id, campaign_id, version_number, status
) values (
  'bc000000-0000-4000-8000-000000000501',
  'b1000000-0000-4000-8000-000000000501',
  'bb000000-0000-4000-8000-000000000501', 1, 'ACTIVE'
);

insert into public.promotion_rules (
  id, organization_id, campaign_version_id, rule_type, scope_type,
  min_quantity, repeatable, priority
) values (
  'bd000000-0000-4000-8000-000000000501',
  'b1000000-0000-4000-8000-000000000501',
  'bc000000-0000-4000-8000-000000000501',
  'MIN_QUANTITY', 'VARIANT', 1, false, 10
);

insert into public.promotion_actions (
  id, organization_id, campaign_version_id, rule_id, action_type,
  priority, stackable, value_json
) values (
  'be000000-0000-4000-8000-000000000501',
  'b1000000-0000-4000-8000-000000000501',
  'bc000000-0000-4000-8000-000000000501',
  'bd000000-0000-4000-8000-000000000501',
  'PERCENT_DISCOUNT', 10, true, '{"percent":10}'
);

insert into public.promotion_target_scopes (
  id, organization_id, campaign_version_id, action_id,
  scope_type, reference_id, include
) values (
  'bf000000-0000-4000-8000-000000000501',
  'b1000000-0000-4000-8000-000000000501',
  'bc000000-0000-4000-8000-000000000501', null,
  'VARIANT', 'b8000000-0000-4000-8000-000000000501', true
);

insert into public.carts (
  id, organization_id, customer_id, source, status, currency_code,
  created_by, created_at, updated_at
) values (
  'c0000000-0000-4000-8000-000000000501',
  'b1000000-0000-4000-8000-000000000501',
  'b4000000-0000-4000-8000-000000000501',
  'STOREFRONT', 'OPEN', 'THB',
  'b2000000-0000-4000-8000-000000000501',
  now() - interval '31 days', now() - interval '31 days'
);

set local role authenticated;

do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.api_resolve_storefront_cart(
      'b1000000-0000-4000-8000-000000000501',
      'c1000000-0000-4000-8000-000000000501'
    );
    raise exception 'Unauthenticated cart resolve unexpectedly succeeded';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;

  begin
    insert into public.carts (organization_id, source)
    values ('b1000000-0000-4000-8000-000000000501', 'STOREFRONT');
    raise exception 'Direct authenticated cart insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  'b0000000-0000-4000-8000-000000000501',
  true
);

do $$
declare
  v_created jsonb;
  v_retried jsonb;
  v_set jsonb;
  v_removed jsonb;
  v_started jsonb;
  v_cart_id uuid;
begin
  v_created := public.api_resolve_storefront_cart(
    'b1000000-0000-4000-8000-000000000501',
    'c1000000-0000-4000-8000-000000000501'
  );
  v_cart_id := (v_created ->> 'cart_id')::uuid;

  if v_created ->> 'status' <> 'OPEN'
     or (v_created ->> 'idempotency_reused')::boolean
     or jsonb_array_length(v_created -> 'items') <> 0 then
    raise exception 'Cart create response is incorrect: %', v_created;
  end if;

  v_retried := public.api_resolve_storefront_cart(
    'b1000000-0000-4000-8000-000000000501',
    'c1000000-0000-4000-8000-000000000501'
  );
  if not (v_retried ->> 'idempotency_reused')::boolean
     or v_retried ->> 'cart_id' <> v_created ->> 'cart_id' then
    raise exception 'Cart create retry is not deterministic: %', v_retried;
  end if;

  begin
    perform public.api_set_storefront_cart_item(
      'b1000000-0000-4000-8000-000000000501',
      v_cart_id,
      'b8000000-0000-4000-8000-000000000501',
      0,
      'c2000000-0000-4000-8000-000000000501'
    );
    raise exception 'Invalid cart quantity unexpectedly succeeded';
  exception
    when invalid_parameter_value then
      if sqlerrm <> 'QUANTITY_INVALID' then raise; end if;
  end;

  begin
    perform public.api_set_storefront_cart_item(
      'b1000000-0000-4000-8000-000000000501',
      v_cart_id,
      'b8000000-0000-4000-8000-000000000501',
      6,
      'c2000000-0000-4000-8000-000000000502'
    );
    raise exception 'Inactive warehouse stock was incorrectly counted';
  exception
    when raise_exception then
      if sqlerrm <> 'ITEM_UNAVAILABLE' then raise; end if;
  end;

  begin
    perform public.api_set_storefront_cart_item(
      'b1000000-0000-4000-8000-000000000501',
      v_cart_id,
      'b8000000-0000-4000-8000-000000000502',
      1,
      'c2000000-0000-4000-8000-000000000503'
    );
    raise exception 'Cross-tenant variant unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm <> 'ITEM_UNAVAILABLE' then raise; end if;
  end;

  v_set := public.api_set_storefront_cart_item(
    'b1000000-0000-4000-8000-000000000501',
    v_cart_id,
    'b8000000-0000-4000-8000-000000000501',
    2,
    'c2000000-0000-4000-8000-000000000504'
  );

  if v_set ->> 'subtotal' <> '200.00'
     or v_set ->> 'discount_total' <> '20.00'
     or v_set ->> 'shipping_estimate' <> '35.00'
     or v_set ->> 'grand_total' <> '215.00'
     or v_set #>> '{items,0,quantity}' <> '2.000'
     or v_set #>> '{items,0,line_total}' <> '180.00' then
    raise exception 'Promotion-aware cart totals are incorrect: %', v_set;
  end if;

  if exists (
    select 1 from jsonb_object_keys(v_set) as k(key)
    where k.key not in (
      'ok', 'operation', 'cart_id', 'status', 'currency_code',
      'subtotal', 'discount_total', 'shipping_estimate', 'grand_total',
      'items', 'idempotency_reused'
    )
  ) or exists (
    select 1 from jsonb_object_keys(v_set #> '{items,0}') as k(key)
    where k.key not in (
      'product_id', 'variant_id', 'quantity', 'original_unit_price',
      'calculated_unit_price', 'line_discount_total', 'line_total',
      'pricing_snapshot'
    )
  ) then
    raise exception 'Cart response exposes a forbidden field: %', v_set;
  end if;

  begin
    perform public.api_set_storefront_cart_item(
      'b1000000-0000-4000-8000-000000000501',
      v_cart_id,
      'b8000000-0000-4000-8000-000000000501',
      3,
      'c2000000-0000-4000-8000-000000000504'
    );
    raise exception 'Mismatched idempotency retry unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;

  v_removed := public.api_remove_storefront_cart_item(
    'b1000000-0000-4000-8000-000000000501',
    v_cart_id,
    'b8000000-0000-4000-8000-000000000599',
    'c3000000-0000-4000-8000-000000000501'
  );
  if jsonb_array_length(v_removed -> 'items') <> 1 then
    raise exception 'Missing-item removal was not a no-op: %', v_removed;
  end if;

  v_removed := public.api_remove_storefront_cart_item(
    'b1000000-0000-4000-8000-000000000501',
    v_cart_id,
    'b8000000-0000-4000-8000-000000000501',
    'c3000000-0000-4000-8000-000000000502'
  );
  if jsonb_array_length(v_removed -> 'items') <> 0
     or v_removed ->> 'grand_total' <> '0.00' then
    raise exception 'Existing item removal totals are incorrect: %', v_removed;
  end if;

  begin
    perform public.api_start_storefront_checkout(
      'b1000000-0000-4000-8000-000000000501',
      v_cart_id,
      'c4000000-0000-4000-8000-000000000501'
    );
    raise exception 'Empty cart checkout unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm <> 'CART_NOT_MUTABLE' then raise; end if;
  end;

  perform public.api_set_storefront_cart_item(
    'b1000000-0000-4000-8000-000000000501',
    v_cart_id,
    'b8000000-0000-4000-8000-000000000501',
    1,
    'c2000000-0000-4000-8000-000000000505'
  );

  v_started := public.api_start_storefront_checkout(
    'b1000000-0000-4000-8000-000000000501',
    v_cart_id,
    'c4000000-0000-4000-8000-000000000502'
  );
  if v_started ->> 'status' <> 'READY'
     or v_started ->> 'grand_total' <> '125.00'
     or (v_started ->> 'idempotency_reused')::boolean then
    raise exception 'Checkout start response is incorrect: %', v_started;
  end if;

  v_started := public.api_start_storefront_checkout(
    'b1000000-0000-4000-8000-000000000501',
    v_cart_id,
    'c4000000-0000-4000-8000-000000000502'
  );
  if not (v_started ->> 'idempotency_reused')::boolean then
    raise exception 'Checkout start retry was not reused: %', v_started;
  end if;

  begin
    perform public.api_remove_storefront_cart_item(
      'b1000000-0000-4000-8000-000000000501',
      v_cart_id,
      'b8000000-0000-4000-8000-000000000501',
      'c3000000-0000-4000-8000-000000000503'
    );
    raise exception 'READY cart mutation unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm <> 'CART_NOT_MUTABLE' then raise; end if;
  end;

  begin
    perform public.api_resolve_storefront_cart(
      'b1000000-0000-4000-8000-000000000502',
      'c1000000-0000-4000-8000-000000000502'
    );
    raise exception 'Cross-tenant cart access unexpectedly succeeded';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'ACTIVE_MEMBERSHIP_REQUIRED' then raise; end if;
  end;
end;
$$;

reset role;

do $$
declare
  v_ready_cart_id uuid;
begin
  select c.id
  into v_ready_cart_id
  from public.carts c
  where c.organization_id = 'b1000000-0000-4000-8000-000000000501'
    and c.customer_id = 'b4000000-0000-4000-8000-000000000501'
    and c.source = 'STOREFRONT'
    and c.status = 'READY';

  if v_ready_cart_id is null
     or (
       select count(*)
       from public.carts c
       where c.organization_id = 'b1000000-0000-4000-8000-000000000501'
         and c.customer_id = 'b4000000-0000-4000-8000-000000000501'
         and c.status in ('OPEN', 'READY', 'RESERVED')
     ) <> 1 then
    raise exception 'Active Storefront cart uniqueness failed';
  end if;

  if (select status from public.carts where id = 'c0000000-0000-4000-8000-000000000501') <> 'EXPIRED' then
    raise exception 'Stale OPEN cart was not expired';
  end if;

  if (
    select count(*)
    from public.cart_events e
    where e.cart_id = v_ready_cart_id
      and e.event_type = 'checkout_started'
  ) <> 1 then
    raise exception 'checkout_started event is not exactly once';
  end if;

  if exists (
    select 1
    from public.cart_events e,
      lateral jsonb_object_keys(e.payload_json) as k(key)
    where e.cart_id = v_ready_cart_id
      and k.key not in (
        'request_id', 'customer_id', 'cart_id', 'currency_code',
        'subtotal', 'discount_total', 'shipping_estimate', 'grand_total'
      )
  ) then
    raise exception 'Checkout event payload exceeds the frozen allowlist';
  end if;

  if exists (
    select 1
    from public.commerce_idempotency_keys k
    where k.organization_id = 'b1000000-0000-4000-8000-000000000501'
      and (
        octet_length(k.request_hash) <> 32
        or k.state <> 'SUCCEEDED'
        or k.result_entity_type <> 'cart'
        or k.result_entity_id <> v_ready_cart_id
      )
  ) then
    raise exception 'Successful cart idempotency ledger row is malformed';
  end if;

  if exists (
    select 1
    from public.commerce_idempotency_keys k
    where k.request_id in (
      'c2000000-0000-4000-8000-000000000501',
      'c2000000-0000-4000-8000-000000000502',
      'c2000000-0000-4000-8000-000000000503',
      'c4000000-0000-4000-8000-000000000501',
      'c3000000-0000-4000-8000-000000000503'
    )
  ) then
    raise exception 'Failed cart mutations left idempotency debris';
  end if;

  if exists (
    select 1 from public.inventory_reservations r where r.cart_id = v_ready_cart_id
  ) or exists (
    select 1 from public.coupon_redemptions r where r.cart_id = v_ready_cart_id
  ) or exists (
    select 1 from public.orders o where o.source_cart_id = v_ready_cart_id
  ) or exists (
    select 1 from public.payments p where p.order_id in (
      select o.id from public.orders o where o.source_cart_id = v_ready_cart_id
    )
  ) then
    raise exception 'Part 3C created a forbidden reservation, redemption, order or payment';
  end if;
end;
$$;

select 'phase_1d_guarded_cart_rpcs|pass';

rollback;
