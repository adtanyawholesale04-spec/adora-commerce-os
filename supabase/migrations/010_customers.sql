-- ADORA Commerce OS (ACOS)
-- 010_customers.sql

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_code varchar(100) not null,
  first_name varchar(150),
  last_name varchar(150),
  display_name varchar(200),
  phone varchar(50),
  phone_normalized varchar(50),
  email varchar(320),
  email_normalized varchar(320),
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','MERGED','BLOCKED','ARCHIVED')),
  merged_into_customer_id uuid references public.customers(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, customer_code),
  unique (organization_id, id)
);

create table if not exists public.customer_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  provider varchar(50) not null,
  channel_account_id uuid,
  external_user_id varchar(255) not null,
  display_name varchar(255),
  profile_image_url text,
  verification_status varchar(30) not null default 'UNVERIFIED'
    check (verification_status in ('UNVERIFIED','VERIFIED','MANUAL')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, channel_account_id)
    references public.channel_accounts(organization_id, id) on delete restrict
);

create unique index if not exists customer_identities_provider_unique_idx
on public.customer_identities(
  organization_id, provider,
  coalesce(channel_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  external_user_id
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  label varchar(100),
  recipient_name varchar(200) not null,
  phone varchar(50) not null,
  address_line1 text not null,
  address_line2 text,
  subdistrict varchar(150),
  district varchar(150),
  province varchar(150),
  postal_code varchar(20),
  country_code varchar(2) not null default 'TH',
  is_default boolean not null default false,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(80) not null,
  name varchar(120) not null,
  status varchar(30) not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.customer_tag_links (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (customer_id, tag_id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade,
  foreign key (organization_id, tag_id)
    references public.customer_tags(organization_id, id) on delete cascade
);

create table if not exists public.customer_merge_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_customer_id uuid not null,
  target_customer_id uuid not null,
  merged_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, source_customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, target_customer_id)
    references public.customers(organization_id, id) on delete restrict
);
