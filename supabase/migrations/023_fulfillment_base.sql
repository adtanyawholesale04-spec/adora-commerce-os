-- ADORA Commerce OS (ACOS)
-- 023_fulfillment_base.sql

create table if not exists public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fulfillment_number varchar(100) not null,
  warehouse_id uuid not null,
  consolidation_id uuid,
  status varchar(30) not null default 'DRAFT'
    check (status in ('DRAFT','READY_TO_PICK','PICKING','QC_PENDING','QC_PASSED','PACKING','READY_TO_SHIP','SHIPPED','COMPLETED','CANCELLED')),
  packed_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, fulfillment_number),
  unique (organization_id, id),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, consolidation_id)
    references public.order_consolidations(organization_id, id) on delete restrict
);

create table if not exists public.fulfillment_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fulfillment_id uuid not null,
  order_id uuid not null,
  order_item_id uuid not null,
  variant_id uuid,
  quantity numeric(14,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, fulfillment_id)
    references public.fulfillments(organization_id, id) on delete cascade,
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, order_item_id)
    references public.order_items(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fulfillment_id uuid not null,
  event_type varchar(50) not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, fulfillment_id)
    references public.fulfillments(organization_id, id) on delete cascade
);
