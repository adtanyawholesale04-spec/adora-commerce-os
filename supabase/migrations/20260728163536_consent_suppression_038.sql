-- ADORA Commerce OS (ACOS)
-- Track B: Consent / Suppression migration 038
--
-- Owner-approved decisions:
-- - normalize consent destinations at the service boundary and enforce a coalesced current key;
-- - require status-specific consent timestamps;
-- - protect consent events with a database append-only trigger;
-- - allow multiple active suppression records for source/audit fidelity;
-- - enable RLS and deny direct browser table access until guarded actions exist.

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  channel text not null,
  purpose text not null,
  status text not null default 'UNKNOWN',
  destination text,
  source text,
  policy_version text,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint customer_consents_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint customer_consents_channel_check check (channel in ('LINE', 'SMS', 'EMAIL', 'PHONE')),
  constraint customer_consents_purpose_check check (purpose in (
    'ORDER_UPDATE', 'LIVE_NOTIFICATION', 'PROMOTION',
    'NEW_PRODUCT', 'LOYALTY', 'CONTENT_UPDATE'
  )),
  constraint customer_consents_status_check check (status in ('GRANTED', 'REVOKED', 'UNKNOWN')),
  constraint customer_consents_timestamp_check check (
    (status <> 'GRANTED' or granted_at is not null)
    and (status <> 'REVOKED' or revoked_at is not null)
  )
);

create unique index customer_consents_current_key_idx
  on public.customer_consents (
    organization_id,
    customer_id,
    channel,
    purpose,
    coalesce(destination, '')
  );

create index customer_consents_customer_lookup_idx
  on public.customer_consents (organization_id, customer_id, channel, purpose);

create index customer_consents_dispatch_lookup_idx
  on public.customer_consents (organization_id, channel, purpose, status);

create table public.customer_consent_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  consent_id uuid,
  channel text not null,
  purpose text not null,
  previous_status text,
  new_status text not null,
  destination text,
  source text,
  policy_version text,
  actor_type text not null,
  actor_user_id uuid,
  occurred_at timestamptz not null default now(),
  metadata jsonb,
  unique (organization_id, id),
  constraint customer_consent_events_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint customer_consent_events_consent_fk
    foreign key (organization_id, consent_id)
    references public.customer_consents (organization_id, id) on delete set null,
  constraint customer_consent_events_actor_fk
    foreign key (actor_user_id)
    references public.profiles (id) on delete set null,
  constraint customer_consent_events_channel_check check (channel in ('LINE', 'SMS', 'EMAIL', 'PHONE')),
  constraint customer_consent_events_purpose_check check (purpose in (
    'ORDER_UPDATE', 'LIVE_NOTIFICATION', 'PROMOTION',
    'NEW_PRODUCT', 'LOYALTY', 'CONTENT_UPDATE'
  )),
  constraint customer_consent_events_previous_status_check check (
    previous_status is null or previous_status in ('GRANTED', 'REVOKED', 'UNKNOWN')
  ),
  constraint customer_consent_events_new_status_check check (new_status in ('GRANTED', 'REVOKED', 'UNKNOWN')),
  constraint customer_consent_events_actor_type_check check (
    actor_type in ('CUSTOMER', 'USER', 'SYSTEM', 'IMPORT')
  )
);

create index customer_consent_events_customer_idx
  on public.customer_consent_events (organization_id, customer_id, occurred_at desc);

create index customer_consent_events_dispatch_idx
  on public.customer_consent_events (organization_id, channel, purpose, occurred_at desc);

create trigger customer_consent_events_append_only
  before update or delete on public.customer_consent_events
  for each row execute function public.prevent_update_delete();

create table public.customer_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid,
  channel text not null,
  purpose text,
  destination text,
  suppression_type text not null,
  reason text,
  source text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_user_id uuid,
  unique (organization_id, id),
  constraint customer_suppressions_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint customer_suppressions_actor_fk
    foreign key (created_by_user_id)
    references public.profiles (id) on delete set null,
  constraint customer_suppressions_channel_check check (channel in ('LINE', 'SMS', 'EMAIL', 'PHONE')),
  constraint customer_suppressions_purpose_check check (
    purpose is null or purpose in (
      'ORDER_UPDATE', 'LIVE_NOTIFICATION', 'PROMOTION',
      'NEW_PRODUCT', 'LOYALTY', 'CONTENT_UPDATE'
    )
  ),
  constraint customer_suppressions_type_check check (suppression_type in (
    'BOUNCED', 'COMPLAINED', 'BLOCKED', 'UNSUBSCRIBED',
    'MANUAL_SUPPRESS', 'INVALID_DESTINATION'
  )),
  constraint customer_suppressions_time_check check (
    ends_at is null or ends_at > starts_at
  )
);

create index customer_suppressions_customer_idx
  on public.customer_suppressions (organization_id, customer_id, channel);

create index customer_suppressions_destination_idx
  on public.customer_suppressions (organization_id, channel, destination);

create index customer_suppressions_active_lookup_idx
  on public.customer_suppressions (organization_id, suppression_type, starts_at desc);

alter table public.customer_consents enable row level security;
alter table public.customer_consent_events enable row level security;
alter table public.customer_suppressions enable row level security;

revoke all on table public.customer_consents from public, anon, authenticated;
revoke all on table public.customer_consent_events from public, anon, authenticated;
revoke all on table public.customer_suppressions from public, anon, authenticated;
