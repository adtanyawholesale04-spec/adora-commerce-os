-- ADORA Commerce OS (ACOS)
-- 019_coupons.sql

create table if not exists public.promotion_trigger_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid not null,
  code varchar(100) not null,
  trigger_type varchar(50) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','EXPIRED')),
  active_from timestamptz,
  active_until timestamptz,
  usage_limit integer,
  usage_limit_per_customer integer,
  channel_account_id uuid,
  live_session_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, campaign_version_id, code),
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, channel_account_id)
    references public.channel_accounts(organization_id, id) on delete restrict,
  foreign key (organization_id, live_session_id)
    references public.live_sessions(organization_id, id) on delete restrict
);

create table if not exists public.promotion_trigger_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  trigger_code_id uuid not null references public.promotion_trigger_codes(id) on delete restrict,
  customer_id uuid,
  conversation_id uuid,
  live_session_id uuid,
  cart_id uuid,
  order_id uuid,
  status varchar(30) not null check (status in ('APPLIED','REJECTED','REVERSED')),
  rejection_reason text,
  redeemed_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid,
  code varchar(100) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','EXPIRED','DISABLED')),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_limit_per_customer integer,
  customer_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete restrict,
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  customer_id uuid not null,
  cart_id uuid,
  order_id uuid,
  status varchar(30) not null
    check (status in ('RESERVED','CONSUMED','RELEASED','REVERSED')),
  reserved_at timestamptz,
  consumed_at timestamptz,
  released_at timestamptz,
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, cart_id)
    references public.carts(organization_id, id) on delete restrict,
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);
