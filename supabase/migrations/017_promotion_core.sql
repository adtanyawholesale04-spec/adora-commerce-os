-- ADORA Commerce OS (ACOS)
-- 017_promotion_core.sql

create table if not exists public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(100) not null,
  name varchar(255) not null,
  description text,
  status varchar(30) not null default 'DRAFT'
    check (status in ('DRAFT','ACTIVE','PAUSED','ENDED','ARCHIVED')),
  scope varchar(30) not null
    check (scope in ('CART','ORDER','PURCHASE_SESSION','CUSTOMER_PERIOD')),
  priority integer not null default 0,
  stackable boolean not null default true,
  exclusive_group varchar(100),
  usage_limit integer,
  usage_limit_per_customer integer,
  currency_code varchar(3),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.promotion_campaign_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_id uuid not null,
  version_number integer not null check (version_number > 0),
  status varchar(30) not null default 'DRAFT'
    check (status in ('DRAFT','VALIDATING','PUBLISHED','ACTIVE','RETIRED','CANCELLED')),
  effective_from timestamptz,
  effective_until timestamptz,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (campaign_id, version_number),
  unique (organization_id, id),
  foreign key (organization_id, campaign_id)
    references public.promotion_campaigns(organization_id, id) on delete restrict
);

create table if not exists public.promotion_condition_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid not null,
  parent_group_id uuid references public.promotion_condition_groups(id) on delete cascade,
  operator varchar(10) not null check (operator in ('AND','OR')),
  negate boolean not null default false,
  sort_order integer not null default 0,
  unique (organization_id, id),
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete cascade
);

create table if not exists public.promotion_conditions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  condition_group_id uuid not null,
  condition_type varchar(60) not null,
  operator varchar(30) not null,
  reference_type varchar(50),
  reference_id uuid,
  value_json jsonb,
  sort_order integer not null default 0,
  foreign key (organization_id, condition_group_id)
    references public.promotion_condition_groups(organization_id, id) on delete cascade
);

create table if not exists public.promotion_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid not null,
  rule_type varchar(50) not null,
  scope_type varchar(30),
  min_quantity numeric(14,3),
  max_quantity numeric(14,3),
  min_spend numeric(14,2),
  max_spend numeric(14,2),
  repeatable boolean not null default false,
  max_repeat_count integer,
  priority integer not null default 0,
  value_json jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete cascade
);

create table if not exists public.promotion_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid not null,
  rule_id uuid,
  action_type varchar(50) not null,
  priority integer not null default 0,
  stackable boolean not null default true,
  exclusive_group varchar(100),
  max_discount_amount numeric(14,2),
  value_json jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, rule_id)
    references public.promotion_rules(organization_id, id) on delete cascade
);

create table if not exists public.promotion_target_scopes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid not null,
  action_id uuid,
  scope_type varchar(50) not null,
  reference_id uuid,
  include boolean not null default true,
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, action_id)
    references public.promotion_actions(organization_id, id) on delete cascade
);

create table if not exists public.promotion_price_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  action_id uuid not null,
  mapping_type varchar(40) not null,
  reference_id uuid not null,
  fixed_unit_price numeric(14,2) not null check (fixed_unit_price >= 0),
  currency_code varchar(3) not null default 'THB',
  unique (action_id, mapping_type, reference_id),
  foreign key (organization_id, action_id)
    references public.promotion_actions(organization_id, id) on delete cascade
);
