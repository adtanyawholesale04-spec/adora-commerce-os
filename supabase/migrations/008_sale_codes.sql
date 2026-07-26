-- ADORA Commerce OS (ACOS)
-- 008_sale_codes.sql

create table if not exists public.sales_code_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sale_code varchar(80) not null,
  variant_id uuid not null,
  context_type varchar(30) not null
    check (context_type in ('GLOBAL','CHANNEL','LIVE_SESSION','PURCHASE_SESSION')),
  channel_account_id uuid,
  live_session_id uuid,
  purchase_session_id uuid,
  active_from timestamptz,
  active_until timestamptz,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','EXPIRED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict,
  foreign key (organization_id, channel_account_id)
    references public.channel_accounts(organization_id, id) on delete restrict,
  check (length(trim(sale_code)) > 0)
);

create unique index if not exists active_global_sale_code_unique_idx
on public.sales_code_assignments(organization_id, lower(sale_code))
where context_type = 'GLOBAL' and status = 'ACTIVE';

create unique index if not exists active_channel_sale_code_unique_idx
on public.sales_code_assignments(organization_id, channel_account_id, lower(sale_code))
where context_type = 'CHANNEL' and status = 'ACTIVE';

create index if not exists sales_code_lookup_idx
on public.sales_code_assignments(organization_id, lower(sale_code), status);
