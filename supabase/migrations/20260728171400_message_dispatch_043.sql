-- ADORA Commerce OS (ACOS)
-- Track B: Messaging Dispatch migration 043
--
-- Owner-approved decisions:
-- - persist one idempotent message job per send intent;
-- - re-check consent, suppression, quota, and provider readiness in the service boundary;
-- - keep provider credentials outside PostgreSQL application tables;
-- - protect delivery attempts as append-only history;
-- - deny direct browser table access until guarded dispatch contracts exist.

create table public.message_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_run_id uuid,
  marketing_campaign_id uuid,
  customer_id uuid not null,
  channel text not null,
  purpose text not null,
  destination text,
  status text not null default 'PENDING',
  idempotency_key text not null,
  content_post_id uuid,
  template_key text,
  payload jsonb,
  scheduled_at timestamptz,
  queued_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  failure_code text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  constraint message_jobs_campaign_run_fk
    foreign key (organization_id, campaign_run_id)
    references public.campaign_runs (organization_id, id) on delete restrict,
  constraint message_jobs_campaign_fk
    foreign key (organization_id, marketing_campaign_id)
    references public.marketing_campaigns (organization_id, id) on delete restrict,
  constraint message_jobs_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint message_jobs_content_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete restrict,
  constraint message_jobs_channel_check check (channel in ('LINE', 'SMS', 'EMAIL')),
  constraint message_jobs_purpose_check check (purpose in (
    'ORDER_UPDATE', 'LIVE_NOTIFICATION', 'PROMOTION',
    'NEW_PRODUCT', 'LOYALTY', 'CONTENT_UPDATE'
  )),
  constraint message_jobs_status_check check (status in (
    'PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED',
    'FAILED', 'CANCELLED', 'SUPPRESSED', 'SKIPPED_NO_CONSENT'
  )),
  constraint message_jobs_idempotency_key_check check (length(trim(idempotency_key)) > 0),
  constraint message_jobs_destination_check check (
    destination is null or length(trim(destination)) > 0
  ),
  constraint message_jobs_payload_check check (
    payload is null or jsonb_typeof(payload) = 'object'
  ),
  constraint message_jobs_timestamp_check check (
    (status not in ('QUEUED', 'SENDING', 'SENT', 'DELIVERED') or queued_at is not null)
    and (status not in ('SENT', 'DELIVERED') or sent_at is not null)
    and (status <> 'DELIVERED' or delivered_at is not null)
    and (status <> 'FAILED' or failed_at is not null)
    and (status <> 'CANCELLED' or cancelled_at is not null)
  )
);

create table public.message_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  message_job_id uuid not null,
  provider text not null,
  attempt_no integer not null,
  status text not null,
  provider_message_id text,
  provider_error_code text,
  provider_error_message text,
  attempted_at timestamptz not null default now(),
  response_metadata jsonb,
  unique (organization_id, id),
  unique (organization_id, message_job_id, attempt_no),
  constraint message_delivery_attempts_job_fk
    foreign key (organization_id, message_job_id)
    references public.message_jobs (organization_id, id) on delete restrict,
  constraint message_delivery_attempts_provider_check check (length(trim(provider)) > 0),
  constraint message_delivery_attempts_attempt_no_check check (attempt_no >= 1),
  constraint message_delivery_attempts_status_check check (
    status in ('SENT', 'DELIVERED', 'FAILED', 'CANCELLED')
  ),
  constraint message_delivery_attempts_metadata_check check (
    response_metadata is null or jsonb_typeof(response_metadata) = 'object'
  )
);

create index message_jobs_status_schedule_idx
  on public.message_jobs (organization_id, status, scheduled_at);

create index message_jobs_customer_created_idx
  on public.message_jobs (organization_id, customer_id, created_at desc);

create index message_jobs_campaign_idx
  on public.message_jobs (organization_id, marketing_campaign_id);

create index message_jobs_campaign_run_idx
  on public.message_jobs (organization_id, campaign_run_id);

create index message_delivery_attempts_job_idx
  on public.message_delivery_attempts (organization_id, message_job_id);

create index message_delivery_attempts_provider_attempted_idx
  on public.message_delivery_attempts (organization_id, provider, attempted_at desc);

create trigger message_jobs_set_updated_at
  before update on public.message_jobs
  for each row execute function public.set_updated_at();

create trigger message_delivery_attempts_append_only
  before update or delete on public.message_delivery_attempts
  for each row execute function public.prevent_update_delete();

alter table public.message_jobs enable row level security;
alter table public.message_delivery_attempts enable row level security;

revoke all on table public.message_jobs from public, anon, authenticated;
revoke all on table public.message_delivery_attempts from public, anon, authenticated;
