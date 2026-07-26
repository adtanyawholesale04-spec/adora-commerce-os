-- ADORA Commerce OS (ACOS)
-- 015_adjustments_holds.sql

create table if not exists public.order_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  adjustment_number varchar(100) not null,
  adjustment_type varchar(40) not null,
  status varchar(30) not null default 'DRAFT',
  amount numeric(14,2) not null,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (organization_id, adjustment_number),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);

create table if not exists public.order_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  adjustment_id uuid not null,
  order_item_id uuid,
  variant_id uuid,
  quantity_delta numeric(14,3),
  amount_delta numeric(14,2),
  reason text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, adjustment_id)
    references public.order_adjustments(organization_id, id) on delete cascade,
  foreign key (organization_id, order_item_id)
    references public.order_items(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.order_holds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  hold_type varchar(40) not null
    check (hold_type in ('CUSTOMER_REQUEST','WAITING_FOR_MORE_ORDERS','SCHEDULED_SHIP_DATE','MANUAL_REVIEW')),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','READY_FOR_REVIEW','RELEASED','EXPIRED_REVIEW','CANCELLED')),
  reason text,
  hold_until timestamptz,
  ship_not_before timestamptz,
  reminder_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  released_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);
