-- ADORA Commerce OS (ACOS)
-- 022_loyalty.sql

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(100) not null,
  name varchar(200) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','ENDED')),
  earning_trigger varchar(30) not null
    check (earning_trigger in ('PAID','COMPLETED','DELIVERED','COD_SETTLED')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  program_id uuid not null,
  customer_id uuid not null,
  points_balance numeric(14,3) not null default 0,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','SUSPENDED','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, customer_id),
  unique (organization_id, id),
  foreign key (organization_id, program_id)
    references public.loyalty_programs(organization_id, id) on delete restrict,
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.loyalty_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  program_id uuid not null,
  rule_type varchar(50) not null,
  priority integer not null default 0,
  condition_json jsonb,
  earning_formula_json jsonb,
  status varchar(30) not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  foreign key (organization_id, program_id)
    references public.loyalty_programs(organization_id, id) on delete cascade
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  loyalty_account_id uuid not null,
  transaction_type varchar(30) not null
    check (transaction_type in ('EARN','REDEEM','EXPIRE','ADJUST','REVERSAL')),
  points_delta numeric(14,3) not null check (points_delta <> 0),
  order_id uuid,
  order_item_id uuid,
  source_type varchar(50) not null,
  source_id uuid,
  reversal_of_transaction_id uuid references public.loyalty_transactions(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, loyalty_account_id)
    references public.loyalty_accounts(organization_id, id) on delete restrict,
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, order_item_id)
    references public.order_items(organization_id, id) on delete restrict
);

create table if not exists public.customer_tiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(80) not null,
  name varchar(120) not null,
  rank integer not null default 0,
  status varchar(30) not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  qualification_json jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

alter table public.credit_topup_campaigns
  add constraint credit_topup_campaigns_tier_fk
  foreign key (organization_id, eligible_tier_id)
  references public.customer_tiers(organization_id, id) on delete restrict;

create table if not exists public.customer_tier_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  tier_id uuid not null,
  effective_from timestamptz not null,
  effective_until timestamptz,
  source_type varchar(40) not null,
  source_id uuid,
  overridden_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, tier_id)
    references public.customer_tiers(organization_id, id) on delete restrict
);

create table if not exists public.customer_commerce_metrics (
  customer_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lifetime_spend numeric(14,2) not null default 0,
  lifetime_units numeric(14,3) not null default 0,
  completed_order_count integer not null default 0,
  average_order_value numeric(14,2) not null default 0,
  last_purchase_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);
