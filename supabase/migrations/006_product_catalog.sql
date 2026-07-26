-- ADORA Commerce OS (ACOS)
-- 006_product_catalog.sql

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  parent_id uuid,
  code varchar(80) not null,
  name varchar(200) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id),
  foreign key (organization_id, parent_id)
    references public.categories(organization_id, id) on delete restrict
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(80) not null,
  name varchar(200) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  product_code varchar(100) not null,
  name varchar(255) not null,
  description text,
  category_id uuid,
  brand_id uuid,
  status varchar(30) not null default 'DRAFT'
    check (status in ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, product_code),
  unique (organization_id, id),
  foreign key (organization_id, category_id)
    references public.categories(organization_id, id) on delete restrict,
  foreign key (organization_id, brand_id)
    references public.brands(organization_id, id) on delete restrict
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  product_id uuid not null,
  stock_code varchar(120) not null,
  barcode varchar(100),
  variant_name varchar(255) not null,
  base_price numeric(14,2) not null default 0 check (base_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  minimum_selling_price numeric(14,2),
  weight_grams integer,
  width_cm numeric(10,2),
  length_cm numeric(10,2),
  height_cm numeric(10,2),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, stock_code),
  unique (organization_id, id),
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete restrict
);

create index if not exists products_name_trgm_idx
on public.products using gin (name gin_trgm_ops);

create index if not exists product_variants_name_trgm_idx
on public.product_variants using gin (variant_name gin_trgm_ops);
