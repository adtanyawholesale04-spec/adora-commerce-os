-- ADORA Commerce OS (ACOS)
-- 025_shipping.sql

create table if not exists public.shipping_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider_code varchar(80) not null,
  name varchar(150) not null,
  status varchar(30) not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  config_reference text,
  capabilities_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_code),
  unique (organization_id, id)
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fulfillment_id uuid not null,
  shipping_provider_id uuid,
  shipment_number varchar(100) not null,
  tracking_number varchar(150),
  shipping_method varchar(80),
  status varchar(30) not null default 'DRAFT'
    check (status in ('DRAFT','LABEL_CREATED','READY_FOR_HANDOFF','IN_TRANSIT','DELIVERED','EXCEPTION','RTO','CANCELLED')),
  label_storage_path text,
  package_count integer not null default 1,
  actual_weight_grams integer,
  shipping_cost numeric(14,2),
  cod_amount numeric(14,2),
  provider_shipment_id varchar(255),
  created_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  unique (organization_id, shipment_number),
  unique (organization_id, id),
  foreign key (organization_id, fulfillment_id)
    references public.fulfillments(organization_id, id) on delete restrict,
  foreign key (organization_id, shipping_provider_id)
    references public.shipping_providers(organization_id, id) on delete restrict
);

create table if not exists public.shipment_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  shipment_id uuid not null,
  package_number integer not null,
  weight_grams integer,
  width_cm numeric(10,2),
  length_cm numeric(10,2),
  height_cm numeric(10,2),
  tracking_number varchar(150),
  label_storage_path text,
  created_at timestamptz not null default now(),
  unique (shipment_id, package_number),
  unique (organization_id, id),
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete cascade
);

create table if not exists public.shipment_package_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  package_id uuid not null,
  fulfillment_item_id uuid not null,
  quantity numeric(14,3) not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, package_id)
    references public.shipment_packages(organization_id, id) on delete cascade,
  foreign key (organization_id, fulfillment_item_id)
    references public.fulfillment_items(organization_id, id) on delete restrict
);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  shipment_id uuid not null,
  external_event_id varchar(255),
  event_code varchar(100) not null,
  event_description text,
  event_at timestamptz not null,
  raw_payload_json jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, shipment_id)
    references public.shipments(organization_id, id) on delete cascade
);
