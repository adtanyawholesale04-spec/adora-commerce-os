-- ADORA Commerce OS (ACOS)
-- Track B: Follow / Interest migration 037
--
-- Owner-approved decisions:
-- - follow timestamps are checked against the current status;
-- - BLOCKED is stored as a follow state and suppression is deferred to migration 038;
-- - customer interest opt-out retains the row with opted_in = false;
-- - slug normalization is service-enforced before database uniqueness;
-- - enable RLS and deny direct browser table access until guarded actions exist.

create table public.merchant_follows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  status text not null default 'FOLLOWING',
  followed_at timestamptz,
  unfollowed_at timestamptz,
  blocked_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, customer_id),
  constraint merchant_follows_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint merchant_follows_status_check check (status in ('FOLLOWING', 'UNFOLLOWED', 'BLOCKED')),
  constraint merchant_follows_timestamp_check check (
    (status <> 'FOLLOWING' or followed_at is not null)
    and (status <> 'UNFOLLOWED' or unfollowed_at is not null)
    and (status <> 'BLOCKED' or blocked_at is not null)
  )
);

create table public.interest_topics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, slug),
  constraint interest_topics_name_check check (length(trim(name)) > 0),
  constraint interest_topics_slug_check check (length(trim(slug)) > 0),
  constraint interest_topics_sort_order_check check (sort_order >= 0)
);

create table public.customer_interests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  interest_topic_id uuid not null,
  opted_in boolean not null default true,
  source text,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, customer_id, interest_topic_id),
  constraint customer_interests_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete restrict,
  constraint customer_interests_topic_fk
    foreign key (organization_id, interest_topic_id)
    references public.interest_topics (organization_id, id) on delete restrict,
  constraint customer_interests_opt_out_check check (
    opted_in or opted_out_at is not null
  )
);

create index merchant_follows_org_status_idx
  on public.merchant_follows (organization_id, status);

create index merchant_follows_customer_status_idx
  on public.merchant_follows (customer_id, status);

create index interest_topics_org_active_sort_idx
  on public.interest_topics (organization_id, is_active, sort_order);

create index customer_interests_org_customer_opted_idx
  on public.customer_interests (organization_id, customer_id, opted_in);

create index customer_interests_org_topic_opted_idx
  on public.customer_interests (organization_id, interest_topic_id, opted_in);

create trigger merchant_follows_set_updated_at
  before update on public.merchant_follows
  for each row execute function public.set_updated_at();

create trigger interest_topics_set_updated_at
  before update on public.interest_topics
  for each row execute function public.set_updated_at();

create trigger customer_interests_set_updated_at
  before update on public.customer_interests
  for each row execute function public.set_updated_at();

alter table public.merchant_follows enable row level security;
alter table public.interest_topics enable row level security;
alter table public.customer_interests enable row level security;

revoke all on table public.merchant_follows from public, anon, authenticated;
revoke all on table public.interest_topics from public, anon, authenticated;
revoke all on table public.customer_interests from public, anon, authenticated;
