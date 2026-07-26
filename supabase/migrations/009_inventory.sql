-- ADORA Commerce OS (ACOS)
-- 009_inventory.sql

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(80) not null,
  name varchar(200) not null,
  status varchar(30) not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  variant_id uuid not null,
  movement_type varchar(40) not null,
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  reference_type varchar(60),
  reference_id uuid,
  reversal_of_movement_id uuid references public.inventory_movements(id) on delete restrict,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  variant_id uuid not null,
  on_hand numeric(14,3) not null default 0,
  reserved numeric(14,3) not null default 0,
  allocated numeric(14,3) not null default 0,
  available numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, warehouse_id, variant_id),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  variant_id uuid not null,
  cart_id uuid,
  order_id uuid,
  quantity numeric(14,3) not null check (quantity > 0),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','CONVERTED','EXPIRED','RELEASED','CANCELLED')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.inventory_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  variant_id uuid not null,
  order_id uuid not null,
  order_item_id uuid not null,
  quantity numeric(14,3) not null check (quantity > 0),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','FULFILLED','RELEASED','CANCELLED')),
  allocated_at timestamptz not null default now(),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);
