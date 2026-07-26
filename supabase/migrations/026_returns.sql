-- ADORA Commerce OS (ACOS)
-- 026_returns.sql

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  return_number varchar(100) not null,
  return_type varchar(30) not null
    check (return_type in ('CUSTOMER_RETURN','EXCHANGE','RTO')),
  status varchar(30) not null default 'REQUESTED'
    check (status in ('REQUESTED','APPROVED','IN_TRANSIT','RECEIVED','INSPECTION','RESOLVED','REJECTED','CANCELLED')),
  resolution_type varchar(40),
  reason text,
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  inspected_at timestamptz,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, return_number),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  return_id uuid not null,
  order_item_id uuid not null,
  quantity numeric(14,3) not null,
  condition_status varchar(30),
  restockable boolean not null default false,
  refund_amount numeric(14,2),
  replacement_variant_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, return_id)
    references public.returns(organization_id, id) on delete cascade,
  foreign key (organization_id, order_item_id)
    references public.order_items(organization_id, id) on delete restrict,
  foreign key (organization_id, replacement_variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.return_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  return_id uuid not null,
  from_status varchar(30),
  to_status varchar(30) not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, return_id)
    references public.returns(organization_id, id) on delete cascade
);

create table if not exists public.return_inventory_dispositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  return_item_id uuid not null,
  disposition varchar(30) not null
    check (disposition in ('RESTOCK','DAMAGED','QUARANTINE','DISPOSE','RETURN_TO_SUPPLIER')),
  quantity numeric(14,3) not null,
  warehouse_id uuid,
  inventory_movement_id uuid references public.inventory_movements(id) on delete restrict,
  reason text,
  inspected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, return_item_id)
    references public.return_items(organization_id, id) on delete restrict,
  foreign key (organization_id, warehouse_id)
    references public.warehouses(organization_id, id) on delete restrict
);

create table if not exists public.exchange_replacements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  return_id uuid not null,
  return_item_id uuid not null,
  replacement_order_id uuid,
  replacement_order_item_id uuid,
  price_difference numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  foreign key (organization_id, return_id)
    references public.returns(organization_id, id) on delete restrict,
  foreign key (organization_id, return_item_id)
    references public.return_items(organization_id, id) on delete restrict,
  foreign key (organization_id, replacement_order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, replacement_order_item_id)
    references public.order_items(organization_id, id) on delete restrict
);

alter table public.refunds
  add constraint refunds_return_fk
  foreign key (organization_id, return_id)
  references public.returns(organization_id, id) on delete restrict;
