-- ADORA Commerce OS (ACOS)
-- 016_consolidations.sql

create table if not exists public.order_consolidations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  consolidation_number varchar(100) not null,
  status varchar(30) not null default 'OPEN'
    check (status in ('OPEN','READY','LOCKED','FULFILLMENT_CREATED','SHIPPED','CANCELLED')),
  shipping_address_hash varchar(128),
  shipping_charge_total_before numeric(14,2) not null default 0,
  consolidated_shipping_cost numeric(14,2),
  shipping_credit_amount numeric(14,2) not null default 0,
  additional_shipping_due numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, consolidation_number),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.order_consolidation_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  consolidation_id uuid not null,
  order_id uuid not null,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  unique (consolidation_id, order_id),
  foreign key (organization_id, consolidation_id)
    references public.order_consolidations(organization_id, id) on delete cascade,
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);

create table if not exists public.order_consolidation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  consolidation_id uuid not null,
  event_type varchar(50) not null,
  payload_json jsonb,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, consolidation_id)
    references public.order_consolidations(organization_id, id) on delete cascade
);
