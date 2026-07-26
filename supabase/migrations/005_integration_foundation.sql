-- ADORA Commerce OS (ACOS)
-- 005_integration_foundation.sql

create table if not exists public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider varchar(50) not null,
  external_account_id varchar(255) not null,
  display_name varchar(255),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','ERROR')),
  capabilities_json jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_account_id),
  unique (organization_id, id)
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider varchar(60) not null,
  channel_account_id uuid,
  external_event_id varchar(255) not null,
  event_type varchar(100) not null,
  payload_json jsonb not null,
  status varchar(30) not null default 'RECEIVED'
    check (status in ('RECEIVED','PROCESSING','PROCESSED','FAILED','DEAD_LETTER')),
  retry_count integer not null default 0 check (retry_count >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  foreign key (organization_id, channel_account_id)
    references public.channel_accounts(organization_id, id) on delete restrict
);

create unique index if not exists integration_events_idempotency_idx
on public.integration_events(
  organization_id, provider,
  coalesce(channel_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  external_event_id
);

create table if not exists public.external_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entity_type varchar(60) not null,
  entity_id uuid not null,
  provider varchar(60) not null,
  external_id varchar(255) not null,
  created_at timestamptz not null default now(),
  unique (organization_id, entity_type, provider, external_id)
);
