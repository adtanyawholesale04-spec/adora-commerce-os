-- ADORA Commerce OS (ACOS)
-- 003_roles_permissions.sql

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(60) not null,
  name varchar(120) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code varchar(120) not null unique,
  name varchar(200) not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.membership_roles (
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create trigger roles_set_updated_at before update on public.roles
for each row execute function public.set_updated_at();
