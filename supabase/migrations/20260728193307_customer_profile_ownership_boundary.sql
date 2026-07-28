-- Customer Portal ownership boundary.
-- This is an association boundary only; customers remain the canonical master.

create table if not exists public.customer_profile_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  profile_id uuid not null,
  link_status varchar(20) not null default 'PENDING'
    check (link_status in ('PENDING', 'ACTIVE', 'REVOKED')),
  link_source varchar(30) not null
    check (link_source in ('OWNER', 'VERIFIED_SIGNUP', 'IMPORT', 'PROVIDER_LINK')),
  verification_method varchar(50),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, profile_id)
    references public.organization_memberships(organization_id, profile_id) on delete restrict,
  check (
    (link_status = 'ACTIVE' and verified_at is not null and revoked_at is null)
    or (link_status = 'PENDING' and revoked_at is null)
    or (link_status = 'REVOKED' and revoked_at is not null)
  )
);

create unique index if not exists customer_profile_links_active_customer_uidx
on public.customer_profile_links (organization_id, customer_id)
where link_status = 'ACTIVE';

create unique index if not exists customer_profile_links_active_profile_uidx
on public.customer_profile_links (organization_id, profile_id)
where link_status = 'ACTIVE';

create index if not exists customer_profile_links_profile_idx
on public.customer_profile_links (organization_id, profile_id, link_status);

create index if not exists customer_profile_links_customer_idx
on public.customer_profile_links (organization_id, customer_id, link_status);

create trigger customer_profile_links_set_updated_at
before update on public.customer_profile_links
for each row execute function public.set_updated_at();

alter table public.customer_profile_links enable row level security;

revoke all on table public.customer_profile_links from anon, authenticated;
grant select, insert, update on table public.customer_profile_links to service_role;
