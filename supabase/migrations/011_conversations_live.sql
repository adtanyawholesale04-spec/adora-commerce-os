-- ADORA Commerce OS (ACOS)
-- 011_conversations_live.sql

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  channel_account_id uuid not null,
  external_live_id varchar(255),
  title varchar(255),
  status varchar(30) not null default 'DRAFT'
    check (status in ('DRAFT','SCHEDULED','LIVE','ENDED','CLOSED','CANCELLED')),
  payment_due_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, channel_account_id)
    references public.channel_accounts(organization_id, id) on delete restrict
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  channel_account_id uuid not null,
  customer_id uuid,
  external_conversation_id varchar(255) not null,
  status varchar(30) not null default 'OPEN'
    check (status in ('OPEN','PENDING','WAITING_CUSTOMER','RESOLVED','CLOSED')),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  last_message_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_account_id, external_conversation_id),
  unique (organization_id, id),
  foreign key (organization_id, channel_account_id)
    references public.channel_accounts(organization_id, id) on delete restrict,
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  conversation_id uuid not null,
  external_message_id varchar(255),
  direction varchar(20) not null check (direction in ('INBOUND','OUTBOUND')),
  sender_type varchar(30) not null check (sender_type in ('CUSTOMER','STAFF','SYSTEM')),
  message_type varchar(40) not null
    check (message_type in ('TEXT','IMAGE','VIDEO','AUDIO','FILE','STICKER','EVENT')),
  content_text text,
  raw_event_id uuid references public.integration_events(id) on delete set null,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id) on delete restrict
);

create table if not exists public.conversation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  conversation_id uuid not null,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id) on delete cascade
);

create table if not exists public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  conversation_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id) on delete cascade
);

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null,
  external_event_id varchar(255),
  event_type varchar(40) not null,
  external_user_id varchar(255),
  customer_identity_id uuid references public.customer_identities(id) on delete set null,
  content_text text,
  payload_json jsonb,
  event_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, live_session_id)
    references public.live_sessions(organization_id, id) on delete restrict
);

alter table public.sales_code_assignments
  add constraint sales_code_live_session_fk
  foreign key (organization_id, live_session_id)
  references public.live_sessions(organization_id, id) on delete restrict;
