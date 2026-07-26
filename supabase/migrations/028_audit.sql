-- ADORA Commerce OS (ACOS)
-- 028_audit.sql

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_type varchar(30) not null
    check (actor_type in ('USER','SYSTEM','INTEGRATION','JOB','PLATFORM_SUPPORT')),
  entity_type varchar(60) not null,
  entity_id uuid not null,
  action varchar(80) not null,
  before_json jsonb,
  after_json jsonb,
  reason text,
  request_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx
on public.audit_logs(organization_id, entity_type, entity_id, created_at desc);
