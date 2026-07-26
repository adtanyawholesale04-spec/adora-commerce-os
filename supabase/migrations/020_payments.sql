-- ADORA Commerce OS (ACOS)
-- 020_payments.sql

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  status varchar(40) not null default 'UNPAID',
  amount_expected numeric(14,2) not null,
  amount_received numeric(14,2) not null default 0,
  currency_code varchar(3) not null default 'THB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  payment_id uuid not null,
  transaction_type varchar(40) not null
    check (transaction_type in ('PAYMENT','ADDITIONAL_PAYMENT','STORE_CREDIT','COD_COLLECTION','REVERSAL')),
  payment_method varchar(40) not null
    check (payment_method in ('BANK_TRANSFER','QR','CASH','COD','STORE_CREDIT','OTHER')),
  amount numeric(14,2) not null check (amount > 0),
  currency_code varchar(3) not null default 'THB',
  provider varchar(60),
  external_reference varchar(255),
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','SUCCEEDED','FAILED','CANCELLED','REVERSED')),
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, payment_id)
    references public.payments(organization_id, id) on delete restrict
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  payment_transaction_id uuid not null,
  storage_path text not null,
  mime_type varchar(100),
  submitted_by_type varchar(30) not null,
  submitted_at timestamptz not null default now(),
  verification_status varchar(30) not null default 'PENDING'
    check (verification_status in ('PENDING','VERIFIED','REJECTED','DUPLICATE')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  metadata_json jsonb,
  foreign key (organization_id, payment_transaction_id)
    references public.payment_transactions(organization_id, id) on delete restrict
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null,
  return_id uuid,
  payment_transaction_id uuid,
  refund_number varchar(100) not null,
  amount numeric(14,2) not null check (amount > 0),
  refund_method varchar(40) not null,
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, refund_number),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, payment_transaction_id)
    references public.payment_transactions(organization_id, id) on delete restrict
);

create table if not exists public.refund_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  refund_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  provider varchar(60),
  provider_reference varchar(255),
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING','SUCCEEDED','FAILED','CANCELLED')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, refund_id)
    references public.refunds(organization_id, id) on delete restrict
);
