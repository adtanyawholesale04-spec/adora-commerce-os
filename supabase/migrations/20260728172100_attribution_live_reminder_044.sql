-- ADORA Commerce OS (ACOS)
-- Track B: Events / Attribution migration 044
--
-- Owner-approved decisions:
-- - V1 attribution uses LAST_CLICK_7D;
-- - revenue remains a projection from Orders/Payments and cannot mutate commerce truth;
-- - live reminders require explicit customer requests and approved offsets;
-- - consent/suppression checks and scheduling remain service-owned;
-- - event/request history is append-only and direct browser access is denied.

create table public.attribution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null,
  customer_id uuid,
  anonymous_id text,
  content_post_id uuid,
  marketing_campaign_id uuid,
  campaign_run_id uuid,
  message_job_id uuid,
  order_id uuid,
  attributed_revenue numeric(14, 2),
  attribution_model text,
  occurred_at timestamptz not null default now(),
  metadata jsonb,
  unique (organization_id, id),
  constraint attribution_events_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint attribution_events_content_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete restrict,
  constraint attribution_events_campaign_fk
    foreign key (organization_id, marketing_campaign_id)
    references public.marketing_campaigns (organization_id, id) on delete restrict,
  constraint attribution_events_campaign_run_fk
    foreign key (organization_id, campaign_run_id)
    references public.campaign_runs (organization_id, id) on delete restrict,
  constraint attribution_events_message_job_fk
    foreign key (organization_id, message_job_id)
    references public.message_jobs (organization_id, id) on delete restrict,
  constraint attribution_events_order_fk
    foreign key (organization_id, order_id)
    references public.orders (organization_id, id) on delete restrict,
  constraint attribution_events_type_check check (event_type in (
    'CONTENT_VIEW', 'CAMPAIGN_CLICK', 'MESSAGE_CLICK',
    'ORDER_PLACED', 'ORDER_PAID', 'ATTRIBUTED_REVENUE'
  )),
  constraint attribution_events_identity_check check (
    customer_id is not null or nullif(trim(anonymous_id), '') is not null
  ),
  constraint attribution_events_revenue_check check (
    attributed_revenue is null or attributed_revenue >= 0
  ),
  constraint attribution_events_model_check check (
    attribution_model is null or attribution_model = 'LAST_CLICK_7D'
  ),
  constraint attribution_events_metadata_check check (
    metadata is null or jsonb_typeof(metadata) = 'object'
  )
);

create table public.live_reminder_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  content_post_id uuid not null,
  live_link_id uuid,
  channel text not null,
  reminder_offset_minutes integer not null,
  status text not null default 'REQUESTED',
  requested_at timestamptz not null default now(),
  scheduled_message_job_id uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (
    organization_id,
    customer_id,
    content_post_id,
    channel,
    reminder_offset_minutes
  ),
  constraint live_reminder_requests_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint live_reminder_requests_content_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete restrict,
  constraint live_reminder_requests_live_link_fk
    foreign key (organization_id, live_link_id)
    references public.content_live_links (organization_id, id) on delete restrict,
  constraint live_reminder_requests_message_job_fk
    foreign key (organization_id, scheduled_message_job_id)
    references public.message_jobs (organization_id, id) on delete restrict,
  constraint live_reminder_requests_channel_check check (channel in ('LINE', 'SMS', 'EMAIL')),
  constraint live_reminder_requests_offset_check check (
    reminder_offset_minutes in (1440, 60, 10)
  ),
  constraint live_reminder_requests_status_check check (
    status in ('REQUESTED', 'CANCELLED', 'SCHEDULED', 'SENT', 'FAILED')
  ),
  constraint live_reminder_requests_cancelled_at_check check (
    (status = 'CANCELLED' and cancelled_at is not null)
    or (status <> 'CANCELLED' and cancelled_at is null)
  )
);

create index attribution_events_occurred_idx
  on public.attribution_events (organization_id, occurred_at desc);

create index attribution_events_customer_occurred_idx
  on public.attribution_events (organization_id, customer_id, occurred_at desc);

create index attribution_events_campaign_idx
  on public.attribution_events (organization_id, marketing_campaign_id, occurred_at desc);

create index attribution_events_order_idx
  on public.attribution_events (organization_id, order_id);

create index live_reminder_requests_content_idx
  on public.live_reminder_requests (organization_id, content_post_id);

create index live_reminder_requests_customer_idx
  on public.live_reminder_requests (organization_id, customer_id);

create index live_reminder_requests_status_idx
  on public.live_reminder_requests (organization_id, status);

create trigger attribution_events_append_only
  before update or delete on public.attribution_events
  for each row execute function public.prevent_update_delete();

create trigger live_reminder_requests_set_updated_at
  before update on public.live_reminder_requests
  for each row execute function public.set_updated_at();

alter table public.attribution_events enable row level security;
alter table public.live_reminder_requests enable row level security;

revoke all on table public.attribution_events from public, anon, authenticated;
revoke all on table public.live_reminder_requests from public, anon, authenticated;
