-- ADORA Commerce OS (ACOS)
-- 012_carts.sql

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid,
  conversation_id uuid,
  live_session_id uuid,
  source varchar(30) not null,
  status varchar(30) not null default 'OPEN'
    check (status in ('OPEN','READY','RESERVED','CONVERTED','ABANDONED','EXPIRED','CANCELLED')),
  currency_code varchar(3) not null default 'THB',
  payment_due_at timestamptz,
  reserved_until timestamptz,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  shipping_estimate numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id) on delete restrict,
  foreign key (organization_id, live_session_id)
    references public.live_sessions(organization_id, id) on delete restrict
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  cart_id uuid not null,
  variant_id uuid not null,
  requested_quantity numeric(14,3) not null check (requested_quantity > 0),
  reserved_quantity numeric(14,3) not null default 0,
  original_unit_price numeric(14,2) not null,
  calculated_unit_price numeric(14,2) not null,
  line_discount_total numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  source_sale_code_assignment_id uuid references public.sales_code_assignments(id) on delete set null,
  pricing_snapshot_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, cart_id)
    references public.carts(organization_id, id) on delete cascade,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.cart_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  cart_id uuid not null,
  event_type varchar(50) not null,
  actor_type varchar(30) not null,
  actor_id uuid,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, cart_id)
    references public.carts(organization_id, id) on delete cascade
);

alter table public.inventory_reservations
  add constraint inventory_reservations_cart_fk
  foreign key (organization_id, cart_id)
  references public.carts(organization_id, id) on delete restrict;
