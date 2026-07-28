-- ADORA Commerce OS (ACOS)
-- Track B: Retention Metrics migration 040
--
-- Owner-approved decisions:
-- - qualifying orders are COMPLETED and are read only;
-- - V1 projection values use the recorded order grand_total, not a financial mutation;
-- - refresh service uses the organization's currency_code and does not mix currencies;
-- - engagement fields remain nullable until content_events exists;
-- - calculation_version and default segment labels are required projection metadata.

create table public.customer_retention_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  order_count integer not null default 0,
  lifetime_value numeric(14, 2) not null default 0,
  average_order_value numeric(14, 2) not null default 0,
  recency_days integer,
  frequency_score integer,
  monetary_score integer,
  rfm_score text,
  retention_segment text not null default 'NEW_CUSTOMER',
  last_engagement_at timestamptz,
  engagement_score integer,
  churn_risk_score integer,
  calculated_at timestamptz not null default now(),
  calculation_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, customer_id),
  constraint customer_retention_metrics_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint customer_retention_metrics_order_count_check check (order_count >= 0),
  constraint customer_retention_metrics_lifetime_value_check check (lifetime_value >= 0),
  constraint customer_retention_metrics_average_order_value_check check (average_order_value >= 0),
  constraint customer_retention_metrics_recency_check check (recency_days is null or recency_days >= 0),
  constraint customer_retention_metrics_frequency_check check (
    frequency_score is null or frequency_score between 1 and 5
  ),
  constraint customer_retention_metrics_monetary_check check (
    monetary_score is null or monetary_score between 1 and 5
  ),
  constraint customer_retention_metrics_engagement_check check (
    engagement_score is null or engagement_score between 0 and 100
  ),
  constraint customer_retention_metrics_churn_check check (
    churn_risk_score is null or churn_risk_score between 0 and 100
  ),
  constraint customer_retention_metrics_segment_check check (retention_segment in (
    'CHAMPION', 'LOYAL', 'POTENTIAL_LOYALIST', 'NEW_CUSTOMER',
    'AT_RISK', 'LOST', 'DORMANT'
  ))
);

create index customer_retention_metrics_segment_idx
  on public.customer_retention_metrics (organization_id, retention_segment);

create index customer_retention_metrics_last_purchase_idx
  on public.customer_retention_metrics (organization_id, last_purchase_at);

create index customer_retention_metrics_value_idx
  on public.customer_retention_metrics (organization_id, lifetime_value desc);

create index customer_retention_metrics_rfm_idx
  on public.customer_retention_metrics (organization_id, rfm_score);

create trigger customer_retention_metrics_set_updated_at
  before update on public.customer_retention_metrics
  for each row execute function public.set_updated_at();

alter table public.customer_retention_metrics enable row level security;

revoke all on table public.customer_retention_metrics from public, anon, authenticated;
