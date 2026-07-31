-- Phase 1D checkout foundation.
-- Additive only: no customer action RPC, provider integration, entitlement
-- grant, sample commerce data, or Production activation is included.

do $$
declare
  v_missing text;
begin
  select string_agg(required_object, ', ' order by required_object)
  into v_missing
  from unnest(array[
    'public.organizations',
    'public.profiles',
    'public.customers',
    'public.carts',
    'public.cart_items',
    'public.orders',
    'public.order_items',
    'public.inventory_reservations',
    'public.coupon_redemptions',
    'public.payments',
    'public.payment_transactions',
    'public.features'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Phase 1D checkout foundation missing dependencies: %', v_missing;
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Phase 1D checkout foundation missing dependency: public.set_updated_at()';
  end if;

  if to_regclass('public.organization_checkout_settings') is not null
     or to_regclass('public.commerce_idempotency_keys') is not null then
    raise exception 'Phase 1D checkout foundation target tables already exist';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'orders' and column_name = 'source_cart_id')
        or (
          table_name = 'inventory_reservations'
          and column_name = 'order_item_id'
        )
      )
  ) then
    raise exception 'Phase 1D checkout foundation target columns already exist';
  end if;

  if exists (
    select 1
    from public.carts c
    where c.source = 'STOREFRONT'
      and c.customer_id is not null
      and c.status in ('OPEN', 'READY', 'RESERVED')
    group by c.organization_id, c.customer_id
    having count(*) > 1
  ) then
    raise exception 'Phase 1D preflight failed: duplicate active Storefront carts';
  end if;

  if exists (
    select 1
    from public.cart_items ci
    group by ci.organization_id, ci.cart_id, ci.variant_id
    having count(*) > 1
  ) then
    raise exception 'Phase 1D preflight failed: duplicate cart variants';
  end if;

  if exists (
    select 1
    from public.order_items oi
    join public.cart_items ci on ci.id = oi.source_cart_item_id
    group by ci.organization_id, ci.cart_id
    having count(distinct oi.order_id) > 1
  ) then
    raise exception 'Phase 1D preflight failed: one cart is linked to multiple orders';
  end if;

  if exists (
    select 1
    from public.order_items oi
    join public.cart_items ci on ci.id = oi.source_cart_item_id
    join public.carts c on c.id = ci.cart_id
    where oi.organization_id <> ci.organization_id
       or ci.organization_id <> c.organization_id
       or oi.variant_id is distinct from ci.variant_id
  ) then
    raise exception 'Phase 1D preflight failed: mismatched cart/order item tenant or variant';
  end if;

  if exists (
    select 1
    from public.payment_transactions pt
    where pt.external_reference is not null
      and pt.payment_method in ('BANK_TRANSFER', 'QR')
      and pt.status in ('PENDING', 'SUCCEEDED')
    group by
      pt.organization_id,
      pt.payment_method,
      pt.external_reference
    having count(*) > 1
  ) then
    raise exception 'Phase 1D preflight failed: duplicate active manual payment references';
  end if;

  if exists (
    select 1
    from public.features f
    where f.code = 'storefront.checkout'
      and (
        f.feature_type <> 'BOOLEAN'
        or f.status <> 'ACTIVE'
        or f.unit is not null
      )
  ) then
    raise exception 'Phase 1D preflight failed: conflicting storefront.checkout feature';
  end if;
end;
$$;

create table public.organization_checkout_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  status varchar(20) not null default 'INACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  currency_code varchar(3) not null default 'THB'
    check (currency_code = 'THB'),
  flat_shipping_charge numeric(14,2) not null default 0
    check (flat_shipping_charge >= 0),
  reservation_minutes integer not null default 15
    check (reservation_minutes between 5 and 60),
  payment_due_minutes integer not null default 60
    check (payment_due_minutes between 5 and 1440),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  unique (organization_id, id)
);

create table public.commerce_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  operation varchar(40) not null
    check (operation in (
      'CART_CREATE',
      'CART_ITEM_SET',
      'CART_ITEM_REMOVE',
      'CHECKOUT_START',
      'CHECKOUT_SUBMIT',
      'PAYMENT_PROOF_SUBMIT',
      'PAYMENT_VERIFY',
      'PAYMENT_REJECT',
      'CHECKOUT_EXPIRE',
      'CHECKOUT_COMPENSATE'
    )),
  request_id uuid not null,
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  customer_id uuid,
  request_hash bytea not null
    check (octet_length(request_hash) = 32),
  state varchar(20) not null default 'IN_PROGRESS'
    check (state in ('IN_PROGRESS', 'SUCCEEDED', 'FAILED')),
  result_entity_type varchar(40)
    check (
      result_entity_type is null
      or result_entity_type in (
        'cart',
        'order',
        'payment',
        'payment_transaction'
      )
    ),
  result_entity_id uuid,
  failure_code varchar(80)
    check (
      failure_code is null
      or (
        failure_code = trim(failure_code)
        and char_length(failure_code) between 1 and 80
      )
    ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, operation, request_id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  check (
    (result_entity_type is null and result_entity_id is null)
    or (result_entity_type is not null and result_entity_id is not null)
  ),
  check (
    (
      state = 'IN_PROGRESS'
      and completed_at is null
      and result_entity_type is null
      and result_entity_id is null
      and failure_code is null
    )
    or (
      state = 'SUCCEEDED'
      and completed_at is not null
      and failure_code is null
    )
    or (
      state = 'FAILED'
      and completed_at is not null
      and result_entity_type is null
      and result_entity_id is null
      and failure_code is not null
    )
  ),
  check (expires_at is null or expires_at > started_at)
);

alter table public.orders
  add column source_cart_id uuid;

alter table public.orders
  add constraint orders_source_cart_tenant_fk
  foreign key (organization_id, source_cart_id)
  references public.carts(organization_id, id) on delete restrict;

alter table public.inventory_reservations
  add column order_item_id uuid;

alter table public.inventory_reservations
  add constraint inventory_reservations_order_item_tenant_fk
  foreign key (organization_id, order_item_id)
  references public.order_items(organization_id, id) on delete restrict;

create unique index carts_one_active_storefront_customer_uidx
on public.carts (organization_id, customer_id)
where source = 'STOREFRONT'
  and customer_id is not null
  and status in ('OPEN', 'READY', 'RESERVED');

create unique index cart_items_one_variant_per_cart_uidx
on public.cart_items (organization_id, cart_id, variant_id);

create unique index orders_one_per_source_cart_uidx
on public.orders (organization_id, source_cart_id)
where source_cart_id is not null;

create index inventory_reservations_cart_status_expiry_idx
on public.inventory_reservations (
  organization_id,
  cart_id,
  status,
  expires_at
);

create index inventory_reservations_order_item_status_idx
on public.inventory_reservations (
  organization_id,
  order_id,
  order_item_id,
  status
);

create index coupon_redemptions_cart_status_idx
on public.coupon_redemptions (organization_id, cart_id, status);

create index coupon_redemptions_order_status_idx
on public.coupon_redemptions (organization_id, order_id, status);

create unique index payment_transactions_active_manual_reference_uidx
on public.payment_transactions (
  organization_id,
  payment_method,
  external_reference
)
where external_reference is not null
  and payment_method in ('BANK_TRANSFER', 'QR')
  and status in ('PENDING', 'SUCCEEDED');

create index payments_status_updated_idx
on public.payments (organization_id, status, updated_at);

create index orders_status_payment_due_idx
on public.orders (organization_id, order_status, payment_due_at);

create index commerce_idempotency_customer_started_idx
on public.commerce_idempotency_keys (
  organization_id,
  customer_id,
  started_at desc
);

create index commerce_idempotency_state_expiry_idx
on public.commerce_idempotency_keys (state, expires_at);

create trigger organization_checkout_settings_set_updated_at
before update on public.organization_checkout_settings
for each row execute function public.set_updated_at();

create or replace function public.protect_commerce_idempotency_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Commerce idempotency evidence is protected from deletion';
  end if;

  if old.organization_id is distinct from new.organization_id
     or old.operation is distinct from new.operation
     or old.request_id is distinct from new.request_id
     or old.actor_profile_id is distinct from new.actor_profile_id
     or old.customer_id is distinct from new.customer_id
     or old.request_hash is distinct from new.request_hash
     or old.started_at is distinct from new.started_at then
    raise exception 'Commerce idempotency identity is immutable';
  end if;

  if old.state <> 'IN_PROGRESS' then
    raise exception 'Terminal commerce idempotency evidence is immutable';
  end if;

  if new.state not in ('SUCCEEDED', 'FAILED') then
    raise exception 'Commerce idempotency state must transition to a terminal state';
  end if;

  return new;
end;
$$;

create trigger commerce_idempotency_keys_protect
before update or delete on public.commerce_idempotency_keys
for each row execute function public.protect_commerce_idempotency_key();

alter table public.organization_checkout_settings enable row level security;
alter table public.commerce_idempotency_keys enable row level security;

revoke all on table public.organization_checkout_settings
  from public, anon, authenticated;
revoke all on table public.commerce_idempotency_keys
  from public, anon, authenticated;

grant select, insert, update on table public.organization_checkout_settings
  to service_role;
grant select, insert, update on table public.commerce_idempotency_keys
  to service_role;

revoke execute on function public.protect_commerce_idempotency_key()
  from public, anon, authenticated;

insert into public.features (
  code,
  name,
  description,
  feature_type,
  unit,
  status
)
values (
  'storefront.checkout',
  'Storefront Checkout',
  'Authenticated product checkout for a published Storefront',
  'BOOLEAN',
  null,
  'ACTIVE'
)
on conflict (code) do nothing;

comment on table public.organization_checkout_settings is
  'Fail-closed organization configuration for Phase 1D Storefront checkout.';
comment on table public.commerce_idempotency_keys is
  'Protected retry evidence for guarded Commerce Core operations; no raw request payloads.';
comment on column public.orders.source_cart_id is
  'Canonical source cart for one-time Storefront conversion.';
comment on column public.inventory_reservations.order_item_id is
  'Order line matched by guarded reservation-to-allocation conversion.';
