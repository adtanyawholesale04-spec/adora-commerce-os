-- ADORA Commerce OS (ACOS)
-- 018_promotion_rewards.sql

create table if not exists public.promotion_tiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  action_id uuid not null,
  min_quantity numeric(14,3) not null,
  max_quantity numeric(14,3),
  benefit_type varchar(40) not null,
  percent_discount numeric(7,4),
  fixed_discount numeric(14,2),
  fixed_unit_price numeric(14,2),
  value_json jsonb,
  sort_order integer not null default 0,
  foreign key (organization_id, action_id)
    references public.promotion_actions(organization_id, id) on delete cascade
);

create table if not exists public.promotion_bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_version_id uuid not null,
  name varchar(200) not null,
  qualification_type varchar(40) not null
    check (qualification_type in ('EXACT_SET','MIN_TOTAL_QUANTITY','PER_COMPONENT_MINIMUM','MIX_AND_MATCH')),
  repeatable boolean not null default false,
  max_bundle_count integer,
  bundle_price_type varchar(40) not null,
  bundle_price_value numeric(14,2),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete cascade
);

create table if not exists public.promotion_bundle_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  bundle_id uuid not null,
  component_type varchar(40) not null,
  reference_id uuid not null,
  min_quantity numeric(14,3) not null,
  max_quantity numeric(14,3),
  required boolean not null default true,
  foreign key (organization_id, bundle_id)
    references public.promotion_bundles(organization_id, id) on delete cascade
);

create table if not exists public.promotion_reward_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  action_id uuid not null,
  reward_selection_type varchar(50) not null,
  reward_quantity numeric(14,3) not null,
  repeatable boolean not null default false,
  max_reward_quantity numeric(14,3),
  selection_price_basis varchar(30) not null
    check (selection_price_basis in ('ORIGINAL_PRICE','APPLIED_PRICE')),
  value_json jsonb,
  foreign key (organization_id, action_id)
    references public.promotion_actions(organization_id, id) on delete cascade
);

create table if not exists public.promotion_applied_benefits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  order_item_id uuid,
  purchase_session_id uuid,
  campaign_id uuid not null,
  campaign_version_id uuid not null,
  rule_id uuid,
  action_id uuid not null,
  benefit_type varchar(50) not null,
  original_amount numeric(14,2),
  benefit_amount numeric(14,2),
  final_amount numeric(14,2),
  quantity numeric(14,3),
  reference_order_item_id uuid,
  snapshot_json jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, order_item_id)
    references public.order_items(organization_id, id) on delete restrict,
  foreign key (organization_id, purchase_session_id)
    references public.purchase_sessions(organization_id, id) on delete restrict,
  foreign key (organization_id, campaign_id)
    references public.promotion_campaigns(organization_id, id) on delete restrict,
  foreign key (organization_id, campaign_version_id)
    references public.promotion_campaign_versions(organization_id, id) on delete restrict,
  foreign key (organization_id, rule_id)
    references public.promotion_rules(organization_id, id) on delete restrict,
  foreign key (organization_id, action_id)
    references public.promotion_actions(organization_id, id) on delete restrict
);

create table if not exists public.promotion_reward_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  applied_benefit_id uuid not null references public.promotion_applied_benefits(id) on delete cascade,
  reward_order_item_id uuid not null,
  source_order_item_id uuid,
  reward_quantity numeric(14,3) not null,
  normal_unit_price numeric(14,2) not null,
  applied_unit_price numeric(14,2) not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, reward_order_item_id)
    references public.order_items(organization_id, id) on delete restrict,
  foreign key (organization_id, source_order_item_id)
    references public.order_items(organization_id, id) on delete restrict
);
