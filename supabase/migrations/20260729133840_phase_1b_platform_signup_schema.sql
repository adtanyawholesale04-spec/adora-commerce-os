-- Phase 1B Part 3: private, profile-owned platform signup projections.

create table public.platform_account_onboarding (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  public_profile_opt_in_intent boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (status = 'NOT_STARTED' and started_at is null and completed_at is null)
    or (status = 'IN_PROGRESS' and started_at is not null and completed_at is null)
    or (status = 'COMPLETED' and started_at is not null and completed_at is not null)
  )
);

create table public.platform_account_acquisitions (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  source text not null
    check (source in ('PLATFORM_DIRECT', 'PLATFORM_CAMPAIGN', 'REFERRAL')),
  campaign_reference varchar(160),
  referral_reference varchar(160),
  request_id uuid not null unique,
  captured_at timestamptz not null default now(),
  check (
    (source = 'PLATFORM_DIRECT' and campaign_reference is null and referral_reference is null)
    or (source = 'PLATFORM_CAMPAIGN' and campaign_reference is not null and referral_reference is null)
    or (source = 'REFERRAL' and campaign_reference is null and referral_reference is not null)
  )
);

create table public.platform_account_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'CUSTOMER_ACCOUNT_CREATED', 'ONBOARDING_STARTED', 'ONBOARDING_COMPLETED',
    'ACQUISITION_CAPTURED', 'PLATFORM_INTERESTS_UPDATED',
    'COMMUNITY_TERMS_ACCEPTED', 'COMMUNITY_TERMS_WITHDRAWN',
    'PUBLIC_PROFILE_INTENT_UPDATED'
  )),
  request_id uuid not null,
  metadata_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata_json) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (profile_id, event_type, request_id)
);

create unique index platform_account_events_created_once_idx
on public.platform_account_events (profile_id)
where event_type = 'CUSTOMER_ACCOUNT_CREATED';

create index platform_account_events_profile_time_idx
on public.platform_account_events (profile_id, occurred_at desc);

create table public.platform_interest_topics (
  id uuid primary key default gen_random_uuid(),
  slug varchar(100) not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name varchar(120) not null check (length(btrim(name)) between 1 and 120),
  description varchar(500),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index platform_interest_topics_status_sort_idx
on public.platform_interest_topics (status, sort_order);

create table public.profile_platform_interests (
  profile_id uuid not null references public.profiles(id) on delete restrict,
  interest_topic_id uuid not null references public.platform_interest_topics(id) on delete restrict,
  selected boolean not null,
  selected_at timestamptz,
  deselected_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (profile_id, interest_topic_id),
  check (
    (selected and selected_at is not null and deselected_at is null)
    or (not selected and deselected_at is not null)
  )
);

create index profile_platform_interests_selected_idx
on public.profile_platform_interests (profile_id, selected);

create table public.platform_terms_versions (
  id uuid primary key default gen_random_uuid(),
  terms_type text not null check (terms_type = 'COMMUNITY'),
  version varchar(80) not null check (length(btrim(version)) between 1 and 80),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'RETIRED')),
  document_uri varchar(500) not null check (length(btrim(document_uri)) between 1 and 500),
  content_hash varchar(128) not null check (content_hash ~ '^[A-Fa-f0-9]{64,128}$'),
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (terms_type, version),
  check ((status = 'ACTIVE' and effective_at is not null) or status <> 'ACTIVE')
);

create unique index platform_terms_versions_one_active_idx
on public.platform_terms_versions (terms_type)
where status = 'ACTIVE';

create table public.profile_terms_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  terms_version_id uuid not null references public.platform_terms_versions(id) on delete restrict,
  event_type text not null check (event_type in ('ACCEPTED', 'WITHDRAWN')),
  request_id uuid not null,
  evidence_json jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_json) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (profile_id, terms_version_id, event_type, request_id)
);

create index profile_terms_events_profile_time_idx
on public.profile_terms_events (profile_id, occurred_at desc);

create table public.public_profile_drafts (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  display_name varchar(120) not null check (length(btrim(display_name)) between 1 and 120),
  handle_candidate varchar(40)
    check (handle_candidate is null or (
      handle_candidate = lower(handle_candidate)
      and handle_candidate ~ '^[a-z0-9](?:[a-z0-9_]{1,38}[a-z0-9])?$'
    )),
  bio varchar(500),
  opt_in_intent boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index public_profile_drafts_handle_candidate_idx
on public.public_profile_drafts (handle_candidate)
where handle_candidate is not null;

create trigger platform_account_onboarding_set_updated_at
before update on public.platform_account_onboarding
for each row execute function public.set_updated_at();
create trigger platform_interest_topics_set_updated_at
before update on public.platform_interest_topics
for each row execute function public.set_updated_at();
create trigger profile_platform_interests_set_updated_at
before update on public.profile_platform_interests
for each row execute function public.set_updated_at();
create trigger public_profile_drafts_set_updated_at
before update on public.public_profile_drafts
for each row execute function public.set_updated_at();

create trigger platform_account_acquisitions_append_only
before update or delete on public.platform_account_acquisitions
for each row execute function public.prevent_update_delete();
create trigger platform_account_events_append_only
before update or delete on public.platform_account_events
for each row execute function public.prevent_update_delete();
create trigger profile_terms_events_append_only
before update or delete on public.profile_terms_events
for each row execute function public.prevent_update_delete();

alter table public.platform_account_onboarding enable row level security;
alter table public.platform_account_acquisitions enable row level security;
alter table public.platform_account_events enable row level security;
alter table public.platform_interest_topics enable row level security;
alter table public.profile_platform_interests enable row level security;
alter table public.platform_terms_versions enable row level security;
alter table public.profile_terms_events enable row level security;
alter table public.public_profile_drafts enable row level security;

revoke all on table
  public.platform_account_onboarding,
  public.platform_account_acquisitions,
  public.platform_account_events,
  public.platform_interest_topics,
  public.profile_platform_interests,
  public.platform_terms_versions,
  public.profile_terms_events,
  public.public_profile_drafts
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.platform_account_onboarding,
  public.platform_account_acquisitions,
  public.platform_account_events,
  public.platform_interest_topics,
  public.profile_platform_interests,
  public.platform_terms_versions,
  public.profile_terms_events,
  public.public_profile_drafts
to service_role;
