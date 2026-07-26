-- ADORA Commerce OS (ACOS)
-- 027_notifications.sql

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_type varchar(60) not null,
  title varchar(255) not null,
  body text,
  reference_type varchar(60),
  reference_id uuid,
  severity varchar(20) not null default 'INFO'
    check (severity in ('INFO','WARNING','CRITICAL')),
  scheduled_at timestamptz,
  triggered_at timestamptz,
  due_at timestamptz,
  action_required boolean not null default false,
  action_status varchar(30),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  escalation_at timestamptz,
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','ACTIVE','ACTIONED','DISMISSED','EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null,
  recipient_type varchar(30) not null
    check (recipient_type in ('PROFILE','TEAM','ROLE')),
  profile_id uuid references public.profiles(id) on delete set null,
  team_id uuid,
  status varchar(30) not null default 'UNREAD'
    check (status in ('UNREAD','READ','ACTIONED','DISMISSED')),
  read_at timestamptz,
  actioned_at timestamptz,
  foreign key (organization_id, notification_id)
    references public.notifications(organization_id, id) on delete cascade
);

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null,
  channel varchar(30) not null
    check (channel in ('IN_APP','EMAIL','LINE','GOOGLE_CALENDAR','BROWSER_PUSH')),
  destination text,
  status varchar(30) not null
    check (status in ('PENDING','SENT','DELIVERED','FAILED','CANCELLED')),
  provider_reference varchar(255),
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_message text,
  foreign key (organization_id, notification_id)
    references public.notifications(organization_id, id) on delete cascade
);
