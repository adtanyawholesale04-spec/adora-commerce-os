-- Phase 1C product-only Storefront schema boundary.
-- Additive only: Core organization, product, variant and inventory sources
-- remain authoritative.

create table public.organization_storefronts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  publication_status varchar(20) not null default 'PRIVATE'
    check (publication_status in ('PRIVATE', 'PUBLISHED')),
  tagline varchar(160),
  description text,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  unique (organization_id, id),
  check (
    tagline is null
    or (
      char_length(trim(tagline)) between 1 and 160
      and tagline = trim(tagline)
    )
  ),
  check (
    description is null
    or (
      char_length(trim(description)) between 1 and 1000
      and description = trim(description)
    )
  ),
  check (
    (
      publication_status = 'PRIVATE'
      and published_at is null
      and published_by is null
    )
    or (
      publication_status = 'PUBLISHED'
      and published_at is not null
      and published_by is not null
    )
  )
);

create table public.storefront_product_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  storefront_id uuid not null,
  product_id uuid not null,
  public_handle varchar(63) not null,
  visibility varchar(20) not null default 'HIDDEN'
    check (visibility in ('HIDDEN', 'VISIBLE')),
  sort_order integer not null default 0 check (sort_order >= 0),
  visible_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id),
  unique (organization_id, public_handle),
  foreign key (organization_id, storefront_id)
    references public.organization_storefronts(organization_id, id)
    on delete restrict,
  foreign key (organization_id, product_id)
    references public.products(organization_id, id)
    on delete restrict,
  check (
    char_length(public_handle) between 3 and 63
    and public_handle ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    and public_handle not like '%--%'
  ),
  check (
    (visibility = 'HIDDEN' and visible_at is null)
    or (visibility = 'VISIBLE' and visible_at is not null)
  )
);

create table public.storefront_slug_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  old_slug varchar(63) not null unique,
  new_slug varchar(63) not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null unique,
  changed_at timestamptz not null default now(),
  check (
    char_length(old_slug) between 3 and 63
    and old_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    and old_slug not like '%--%'
  ),
  check (
    char_length(new_slug) between 3 and 63
    and new_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    and new_slug not like '%--%'
  ),
  check (old_slug <> new_slug)
);

create index organization_storefronts_publication_idx
on public.organization_storefronts(publication_status, organization_id);

create index storefront_product_listings_public_idx
on public.storefront_product_listings(
  storefront_id,
  visibility,
  sort_order,
  product_id
);

create index storefront_slug_history_org_idx
on public.storefront_slug_history(organization_id, changed_at desc);

create trigger organization_storefronts_set_updated_at
before update on public.organization_storefronts
for each row execute function public.set_updated_at();

create trigger storefront_product_listings_set_updated_at
before update on public.storefront_product_listings
for each row execute function public.set_updated_at();

create trigger storefront_slug_history_append_only
before update or delete on public.storefront_slug_history
for each row execute function public.prevent_update_delete();

alter table public.organization_storefronts enable row level security;
alter table public.storefront_product_listings enable row level security;
alter table public.storefront_slug_history enable row level security;

revoke all on table public.organization_storefronts
  from public, anon, authenticated;
revoke all on table public.storefront_product_listings
  from public, anon, authenticated;
revoke all on table public.storefront_slug_history
  from public, anon, authenticated;

-- Read RPCs are SECURITY INVOKER and executable only by service_role.
grant select on table public.organization_storefronts to service_role;
grant select on table public.storefront_product_listings to service_role;
grant select on table public.storefront_slug_history to service_role;
grant select on table public.organizations to service_role;
grant select on table public.products to service_role;
grant select on table public.product_variants to service_role;
grant select on table public.categories to service_role;
grant select on table public.brands to service_role;
grant select on table public.warehouses to service_role;
grant select on table public.inventory_balances to service_role;
grant select on table public.features to service_role;
grant select on table public.organization_entitlements to service_role;

insert into public.features (
  code,
  name,
  description,
  feature_type,
  unit,
  status
)
values (
  'storefront',
  'Storefront',
  'Product-only public Storefront',
  'BOOLEAN',
  null,
  'ACTIVE'
)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    feature_type = excluded.feature_type,
    unit = excluded.unit,
    status = excluded.status;

insert into public.permissions (code, name, description)
values
  (
    'storefront.view',
    'View Storefront settings',
    'View private Storefront settings and product listings'
  ),
  (
    'storefront.manage',
    'Manage Storefront settings',
    'Edit Storefront settings and product listings'
  ),
  (
    'storefront.publish',
    'Publish Storefront',
    'Publish, unpublish and change the public Storefront slug'
  )
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;
