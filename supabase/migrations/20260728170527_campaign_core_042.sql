-- ADORA Commerce OS (ACOS)
-- Track B: Campaign Core migration 042
--
-- Owner-approved decisions:
-- - Campaign Core follows validated Audience migration 041;
-- - campaign state transitions are guarded service/RPC responsibilities;
-- - structural checks require snapshots before preparation/running/completion;
-- - consent and suppression are checked again at dispatch;
-- - no messaging jobs, providers, or dispatch logic are created here.

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  status text not null default 'DRAFT',
  purpose text not null,
  primary_channel text,
  content_post_id uuid,
  audience_segment_id uuid,
  audience_snapshot_id uuid,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint marketing_campaigns_name_check check (length(trim(name)) > 0),
  constraint marketing_campaigns_status_check check (status in (
    'DRAFT', 'SCHEDULED', 'PREPARING', 'RUNNING',
    'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED'
  )),
  constraint marketing_campaigns_purpose_check check (purpose in (
    'PROMOTION', 'NEW_PRODUCT', 'LIVE_NOTIFICATION',
    'CONTENT_UPDATE', 'LOYALTY'
  )),
  constraint marketing_campaigns_channel_check check (
    primary_channel is null or primary_channel in ('LINE', 'SMS', 'EMAIL')
  ),
  constraint marketing_campaigns_snapshot_gate_check check (
    status not in ('PREPARING', 'RUNNING', 'COMPLETED')
    or audience_snapshot_id is not null
  ),
  constraint marketing_campaigns_timestamp_check check (
    (status <> 'SCHEDULED' or scheduled_at is not null)
    and (status <> 'RUNNING' or started_at is not null)
    and (status <> 'COMPLETED' or completed_at is not null)
    and (status <> 'CANCELLED' or cancelled_at is not null)
    and (status <> 'FAILED' or failed_at is not null)
  ),
  constraint marketing_campaigns_content_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete restrict,
  constraint marketing_campaigns_segment_fk
    foreign key (organization_id, audience_segment_id)
    references public.audience_segments (organization_id, id) on delete restrict,
  constraint marketing_campaigns_snapshot_fk
    foreign key (organization_id, audience_snapshot_id)
    references public.audience_snapshots (organization_id, id) on delete restrict
);

create table public.campaign_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  marketing_campaign_id uuid not null,
  audience_snapshot_id uuid not null,
  status text not null default 'PREPARING',
  run_no integer not null,
  total_recipients integer not null default 0,
  eligible_recipients integer not null default 0,
  suppressed_count integer not null default 0,
  no_consent_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb,
  unique (organization_id, id),
  unique (organization_id, marketing_campaign_id, run_no),
  constraint campaign_runs_campaign_fk
    foreign key (organization_id, marketing_campaign_id)
    references public.marketing_campaigns (organization_id, id) on delete restrict,
  constraint campaign_runs_snapshot_fk
    foreign key (organization_id, audience_snapshot_id)
    references public.audience_snapshots (organization_id, id) on delete restrict,
  constraint campaign_runs_status_check check (status in (
    'PREPARING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED'
  )),
  constraint campaign_runs_run_no_check check (run_no >= 1),
  constraint campaign_runs_counters_check check (
    total_recipients >= 0
    and eligible_recipients >= 0
    and suppressed_count >= 0
    and no_consent_count >= 0
    and sent_count >= 0
    and failed_count >= 0
  ),
  constraint campaign_runs_timestamp_check check (
    (status <> 'RUNNING' or started_at is not null)
    and (status <> 'COMPLETED' or completed_at is not null)
  ),
  constraint campaign_runs_metadata_check check (
    metadata is null or jsonb_typeof(metadata) = 'object'
  )
);

create index marketing_campaigns_status_schedule_idx
  on public.marketing_campaigns (organization_id, status, scheduled_at);

create index marketing_campaigns_created_idx
  on public.marketing_campaigns (organization_id, created_at desc);

create index marketing_campaigns_snapshot_idx
  on public.marketing_campaigns (organization_id, audience_snapshot_id);

create index campaign_runs_campaign_idx
  on public.campaign_runs (organization_id, marketing_campaign_id);

create index campaign_runs_status_created_idx
  on public.campaign_runs (organization_id, status, created_at desc);

create trigger marketing_campaigns_set_updated_at
  before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

alter table public.marketing_campaigns enable row level security;
alter table public.campaign_runs enable row level security;

revoke all on table public.marketing_campaigns from public, anon, authenticated;
revoke all on table public.campaign_runs from public, anon, authenticated;
