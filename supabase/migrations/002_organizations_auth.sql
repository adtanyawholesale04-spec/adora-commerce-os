-- ADORA Commerce OS (ACOS)
-- 002_organizations_auth.sql

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  slug varchar(120) not null unique,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','SUSPENDED','ARCHIVED')),
  timezone varchar(80) not null default 'Asia/Bangkok',
  currency_code varchar(3) not null default 'THB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name varchar(200) not null,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status varchar(30) not null default 'INVITED'
    check (status in ('INVITED','ACTIVE','SUSPENDED','REMOVED')),
  is_default boolean not null default false,
  joined_at timestamptz,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create unique index if not exists one_default_org_per_profile_idx
on public.organization_memberships(profile_id)
where is_default = true and status = 'ACTIVE';

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email varchar(320) not null,
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','ACCEPTED','EXPIRED','REVOKED')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at before update on public.organization_memberships
for each row execute function public.set_updated_at();
