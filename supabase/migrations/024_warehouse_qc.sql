-- ADORA Commerce OS (ACOS)
-- 024_warehouse_qc.sql

create table if not exists public.fulfillment_qc_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fulfillment_id uuid not null,
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','IN_PROGRESS','PASSED','FAILED','CANCELLED')),
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, fulfillment_id)
    references public.fulfillments(organization_id, id) on delete restrict
);

create unique index if not exists one_active_qc_session_per_fulfillment_idx
on public.fulfillment_qc_sessions(fulfillment_id)
where status in ('PENDING','IN_PROGRESS');

create table if not exists public.fulfillment_qc_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  qc_session_id uuid not null,
  fulfillment_item_id uuid,
  variant_id uuid,
  scan_type varchar(30) not null
    check (scan_type in ('BARCODE','STOCK_CODE','SALE_CODE','MANUAL')),
  scan_value varchar(255) not null,
  expected_variant_id uuid,
  matched boolean not null default false,
  quantity_increment numeric(14,3) not null default 0,
  scanned_by uuid references public.profiles(id) on delete set null,
  scanned_at timestamptz not null default now(),
  error_code varchar(60),
  metadata_json jsonb,
  foreign key (organization_id, qc_session_id)
    references public.fulfillment_qc_sessions(organization_id, id) on delete cascade,
  foreign key (organization_id, fulfillment_item_id)
    references public.fulfillment_items(organization_id, id) on delete restrict,
  foreign key (organization_id, variant_id)
    references public.product_variants(organization_id, id) on delete restrict,
  foreign key (organization_id, expected_variant_id)
    references public.product_variants(organization_id, id) on delete restrict
);

create table if not exists public.fulfillment_qc_item_totals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  qc_session_id uuid not null,
  fulfillment_item_id uuid not null,
  required_quantity numeric(14,3) not null,
  scanned_quantity numeric(14,3) not null default 0,
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','PARTIAL','PASSED','FAILED')),
  updated_at timestamptz not null default now(),
  unique (qc_session_id, fulfillment_item_id),
  foreign key (organization_id, qc_session_id)
    references public.fulfillment_qc_sessions(organization_id, id) on delete cascade,
  foreign key (organization_id, fulfillment_item_id)
    references public.fulfillment_items(organization_id, id) on delete restrict
);
