-- ADORA Commerce OS (ACOS)
-- Track B: Audience migration 041
--
-- Owner-approved decisions:
-- - Audience is migrated before Campaign;
-- - snapshot membership is append-only after creation;
-- - rule JSON is validated/evaluated by a guarded service and is never executable SQL;
-- - Campaign state transitions remain outside this migration;
-- - campaign preparation will require an audience snapshot, while consent is rechecked at dispatch.

create table public.audience_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  segment_type text not null,
  status text not null default 'ACTIVE',
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  constraint audience_segments_name_check check (length(trim(name)) > 0),
  constraint audience_segments_type_check check (segment_type in ('STATIC', 'DYNAMIC_RULE', 'SNAPSHOT')),
  constraint audience_segments_status_check check (status in ('ACTIVE', 'ARCHIVED')),
  constraint audience_segments_archive_check check (
    status <> 'ARCHIVED' or archived_at is not null
  )
);

create table public.audience_segment_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  audience_segment_id uuid not null,
  rule_json jsonb not null,
  rule_version text not null,
  criteria_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, audience_segment_id),
  constraint audience_segment_rules_segment_fk
    foreign key (organization_id, audience_segment_id)
    references public.audience_segments (organization_id, id) on delete cascade,
  constraint audience_segment_rules_json_check check (jsonb_typeof(rule_json) = 'object'),
  constraint audience_segment_rules_version_check check (length(trim(rule_version)) > 0),
  constraint audience_segment_rules_hash_check check (length(trim(criteria_hash)) > 0)
);

create table public.audience_static_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  audience_segment_id uuid not null,
  customer_id uuid not null,
  added_by_user_id uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, audience_segment_id, customer_id),
  constraint audience_static_members_segment_fk
    foreign key (organization_id, audience_segment_id)
    references public.audience_segments (organization_id, id) on delete cascade,
  constraint audience_static_members_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict
);

create table public.audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  audience_segment_id uuid,
  name text,
  source_type text not null,
  criteria_hash text,
  criteria_json jsonb,
  member_count integer not null default 0,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint audience_snapshots_segment_fk
    foreign key (organization_id, audience_segment_id)
    references public.audience_segments (organization_id, id) on delete restrict,
  constraint audience_snapshots_source_type_check check (source_type in ('SEGMENT', 'RULE', 'MANUAL')),
  constraint audience_snapshots_member_count_check check (member_count >= 0),
  constraint audience_snapshots_criteria_json_check check (
    criteria_json is null or jsonb_typeof(criteria_json) = 'object'
  )
);

create table public.audience_snapshot_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  audience_snapshot_id uuid not null,
  customer_id uuid not null,
  eligibility_reason jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, audience_snapshot_id, customer_id),
  constraint audience_snapshot_members_snapshot_fk
    foreign key (organization_id, audience_snapshot_id)
    references public.audience_snapshots (organization_id, id) on delete cascade,
  constraint audience_snapshot_members_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint audience_snapshot_members_reason_check check (
    eligibility_reason is null or jsonb_typeof(eligibility_reason) = 'object'
  )
);

create index audience_segments_org_status_idx
  on public.audience_segments (organization_id, status);

create index audience_segments_org_type_idx
  on public.audience_segments (organization_id, segment_type);

create index audience_static_members_customer_idx
  on public.audience_static_members (organization_id, customer_id);

create index audience_snapshots_org_created_idx
  on public.audience_snapshots (organization_id, created_at desc);

create index audience_snapshots_org_segment_idx
  on public.audience_snapshots (organization_id, audience_segment_id);

create index audience_snapshot_members_snapshot_idx
  on public.audience_snapshot_members (organization_id, audience_snapshot_id);

create index audience_snapshot_members_customer_idx
  on public.audience_snapshot_members (organization_id, customer_id);

create trigger audience_segments_set_updated_at
  before update on public.audience_segments
  for each row execute function public.set_updated_at();

create trigger audience_segment_rules_set_updated_at
  before update on public.audience_segment_rules
  for each row execute function public.set_updated_at();

create trigger audience_static_members_set_updated_at
  before update on public.audience_static_members
  for each row execute function public.set_updated_at();

create trigger audience_snapshots_append_only
  before update or delete on public.audience_snapshots
  for each row execute function public.prevent_update_delete();

create trigger audience_snapshot_members_append_only
  before update or delete on public.audience_snapshot_members
  for each row execute function public.prevent_update_delete();

alter table public.audience_segments enable row level security;
alter table public.audience_segment_rules enable row level security;
alter table public.audience_static_members enable row level security;
alter table public.audience_snapshots enable row level security;
alter table public.audience_snapshot_members enable row level security;

revoke all on table public.audience_segments from public, anon, authenticated;
revoke all on table public.audience_segment_rules from public, anon, authenticated;
revoke all on table public.audience_static_members from public, anon, authenticated;
revoke all on table public.audience_snapshots from public, anon, authenticated;
revoke all on table public.audience_snapshot_members from public, anon, authenticated;
