-- ADORA Commerce OS (ACOS)
-- 013_purchase_sessions.sql

create table if not exists public.purchase_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  session_number varchar(100) not null,
  source_context varchar(40),
  status varchar(30) not null default 'OPEN'
    check (status in ('OPEN','PENDING_CLOSE','CLOSED','CANCELLED')),
  opened_at timestamptz not null default now(),
  close_due_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_number),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.purchase_session_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_session_id uuid not null,
  event_type varchar(50) not null,
  reference_type varchar(50),
  reference_id uuid,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, purchase_session_id)
    references public.purchase_sessions(organization_id, id) on delete cascade
);

alter table public.sales_code_assignments
  add constraint sales_code_purchase_session_fk
  foreign key (organization_id, purchase_session_id)
  references public.purchase_sessions(organization_id, id) on delete restrict;
