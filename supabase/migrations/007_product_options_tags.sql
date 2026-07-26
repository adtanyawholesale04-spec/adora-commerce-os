-- ADORA Commerce OS (ACOS)
-- 007_product_options_tags.sql

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  product_id uuid not null,
  code varchar(80) not null,
  name varchar(120) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, code),
  unique (organization_id, id),
  foreign key (organization_id, product_id)
    references public.products(organization_id, id) on delete cascade
);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  option_id uuid not null,
  code varchar(80) not null,
  value varchar(120) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (option_id, code),
  unique (organization_id, id),
  foreign key (organization_id, option_id)
    references public.product_options(organization_id, id) on delete cascade
);

create table if not exists public.product_variant_option_values (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  variant_id uuid not null,
  option_id uuid not null,
  option_value_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (variant_id, option_id),
  unique (variant_id, option_value_id),
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete cascade,
  foreign key (organization_id, option_id)
    references public.product_options(organization_id, id) on delete cascade,
  foreign key (organization_id, option_value_id)
    references public.product_option_values(organization_id, id) on delete cascade
);

create table if not exists public.product_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(80) not null,
  name varchar(120) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.product_variant_tag_links (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  variant_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (variant_id, tag_id),
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete cascade,
  foreign key (organization_id, tag_id)
    references public.product_tags(organization_id, id) on delete cascade
);

create table if not exists public.product_promotion_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(80) not null,
  name varchar(120) not null,
  description text,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.product_variant_promotion_classes (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  variant_id uuid not null,
  promotion_class_id uuid not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (variant_id, promotion_class_id),
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete cascade,
  foreign key (organization_id, promotion_class_id)
    references public.product_promotion_classes(organization_id, id) on delete cascade
);
