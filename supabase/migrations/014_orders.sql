-- ADORA Commerce OS (ACOS)
-- 014_orders.sql

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  order_number varchar(100) not null,
  source varchar(30) not null,
  currency_code varchar(3) not null default 'THB',
  order_status varchar(40) not null default 'DRAFT'
    check (order_status in ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','PROCESSING','COMPLETED','CANCELLED','PAYMENT_EXPIRED')),
  payment_status varchar(40) not null default 'UNPAID'
    check (payment_status in ('UNPAID','PARTIALLY_PAID','PAID','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','COD_PENDING')),
  fulfillment_status varchar(40) not null default 'UNFULFILLED'
    check (fulfillment_status in ('UNFULFILLED','ON_HOLD','PARTIALLY_FULFILLED','FULFILLED','RETURN_IN_PROGRESS','RETURNED')),
  subtotal numeric(14,2) not null default 0,
  item_discount_total numeric(14,2) not null default 0,
  order_discount_total numeric(14,2) not null default 0,
  shipping_charge numeric(14,2) not null default 0,
  shipping_discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  amount_due numeric(14,2) not null default 0,
  payment_due_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  variant_id uuid,
  sku_snapshot varchar(120),
  sale_code_snapshot varchar(80),
  product_name_snapshot varchar(255) not null,
  variant_name_snapshot varchar(255),
  quantity numeric(14,3) not null check (quantity > 0),
  original_unit_price numeric(14,2) not null,
  applied_unit_price numeric(14,2) not null,
  unit_cost_snapshot numeric(14,2),
  line_discount_total numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  is_reward_item boolean not null default false,
  source_cart_item_id uuid references public.cart_items(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.order_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  address_type varchar(30) not null check (address_type in ('SHIPPING','BILLING')),
  recipient_name varchar(200) not null,
  phone varchar(50) not null,
  address_line1 text not null,
  address_line2 text,
  subdistrict varchar(150),
  district varchar(150),
  province varchar(150),
  postal_code varchar(20),
  country_code varchar(2) not null default 'TH',
  created_at timestamptz not null default now(),
  unique (order_id, address_type),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  status_domain varchar(30) not null,
  from_status varchar(40),
  to_status varchar(40) not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete cascade
);

create table if not exists public.purchase_session_orders (
  purchase_session_id uuid not null references public.purchase_sessions(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (purchase_session_id, order_id),
  unique (order_id)
);

create table if not exists public.conversation_orders (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (conversation_id, order_id)
);

alter table public.inventory_reservations
  add constraint inventory_reservations_order_fk
  foreign key (organization_id, order_id)
  references public.orders(organization_id, id) on delete restrict;

alter table public.inventory_allocations
  add constraint inventory_allocations_order_fk
  foreign key (organization_id, order_id)
  references public.orders(organization_id, id) on delete restrict;

alter table public.inventory_allocations
  add constraint inventory_allocations_order_item_fk
  foreign key (organization_id, order_item_id)
  references public.order_items(organization_id, id) on delete restrict;
