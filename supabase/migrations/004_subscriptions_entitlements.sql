-- ADORA Commerce OS (ACOS)
-- 004_subscriptions_entitlements.sql

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(150) not null,
  description text,
  billing_interval varchar(30) not null
    check (billing_interval in ('MONTHLY','YEARLY','CUSTOM')),
  base_price numeric(14,2) not null default 0 check (base_price >= 0),
  currency_code varchar(3) not null default 'THB',
  status varchar(30) not null default 'ACTIVE'
    check (status in ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  code varchar(100) not null unique,
  name varchar(150) not null,
  description text,
  feature_type varchar(30) not null
    check (feature_type in ('BOOLEAN','LIMIT','METERED')),
  unit varchar(50),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  enabled boolean not null default true,
  limit_value numeric(18,3),
  config_json jsonb,
  primary key (plan_id, feature_id),
  check (limit_value is null or limit_value >= 0)
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status varchar(30) not null
    check (status in ('TRIALING','ACTIVE','PAST_DUE','SUSPENDED','CANCELLED','EXPIRED')),
  billing_cycle varchar(30) not null
    check (billing_cycle in ('MONTHLY','YEARLY','CUSTOM')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_current_subscription_per_org_idx
on public.organization_subscriptions(organization_id)
where status in ('TRIALING','ACTIVE','PAST_DUE','SUSPENDED');

create table if not exists public.organization_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  feature_id uuid not null references public.features(id) on delete restrict,
  source_type varchar(40) not null
    check (source_type in ('PLAN','ADDON','MANUAL_OVERRIDE','PROMOTION','ENTERPRISE_CONTRACT')),
  source_id uuid,
  enabled boolean not null default true,
  limit_value numeric(18,3),
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  feature_id uuid not null references public.features(id) on delete restrict,
  usage_period_start timestamptz not null,
  usage_period_end timestamptz not null,
  used_quantity numeric(18,3) not null default 0 check (used_quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (organization_id, feature_id, usage_period_start, usage_period_end)
);

create table if not exists public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  platform_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  ticket_reference varchar(150),
  scope_json jsonb,
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','ACTIVE','EXPIRED','REVOKED')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
