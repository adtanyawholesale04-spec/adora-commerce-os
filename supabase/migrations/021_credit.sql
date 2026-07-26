-- ADORA Commerce OS (ACOS)
-- 021_credit.sql

create table if not exists public.customer_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  currency_code varchar(3) not null default 'THB',
  available_balance numeric(14,2) not null default 0,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','SUSPENDED','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, customer_id, currency_code),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict
);

create table if not exists public.customer_credit_lots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  credit_account_id uuid not null,
  lot_type varchar(30) not null check (lot_type in ('PRINCIPAL','BONUS','REFUND','COMPENSATION')),
  source_type varchar(50) not null,
  source_id uuid,
  original_amount numeric(14,2) not null,
  remaining_amount numeric(14,2) not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, credit_account_id)
    references public.customer_credit_accounts(organization_id, id) on delete restrict
);

create table if not exists public.customer_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  credit_account_id uuid not null,
  lot_id uuid,
  transaction_type varchar(40) not null,
  amount_delta numeric(14,2) not null check (amount_delta <> 0),
  order_id uuid,
  payment_transaction_id uuid,
  source_type varchar(50) not null,
  source_id uuid,
  reversal_of_transaction_id uuid references public.customer_credit_transactions(id) on delete restrict,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, credit_account_id)
    references public.customer_credit_accounts(organization_id, id) on delete restrict,
  foreign key (organization_id, lot_id)
    references public.customer_credit_lots(organization_id, id) on delete restrict,
  foreign key (organization_id, order_id)
    references public.orders(organization_id, id) on delete restrict,
  foreign key (organization_id, payment_transaction_id)
    references public.payment_transactions(organization_id, id) on delete restrict
);

create table if not exists public.credit_lot_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  payment_transaction_id uuid not null,
  credit_lot_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  foreign key (organization_id, payment_transaction_id)
    references public.payment_transactions(organization_id, id) on delete restrict,
  foreign key (organization_id, credit_lot_id)
    references public.customer_credit_lots(organization_id, id) on delete restrict
);

create table if not exists public.credit_topup_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code varchar(100) not null,
  name varchar(200) not null,
  eligible_tier_id uuid,
  min_topup numeric(14,2) not null,
  bonus_type varchar(30) not null check (bonus_type in ('PERCENT','FIXED')),
  bonus_value numeric(14,2) not null,
  max_bonus numeric(14,2),
  bonus_expires_days integer,
  starts_at timestamptz,
  ends_at timestamptz,
  status varchar(30) not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE','ENDED')),
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.credit_topup_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  campaign_id uuid,
  payment_transaction_id uuid not null,
  principal_amount numeric(14,2) not null,
  bonus_amount numeric(14,2) not null default 0,
  status varchar(30) not null default 'COMPLETED'
    check (status in ('PENDING','COMPLETED','REVERSED','CANCELLED')),
  created_at timestamptz not null default now()
);
