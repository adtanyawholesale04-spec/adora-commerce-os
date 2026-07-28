-- ADORA Commerce OS (ACOS)
-- Track B: Content Core migration 035
--
-- Owner-approved decisions:
-- - defer content_promotion_links until a verified promotions master exists;
-- - store body as jsonb;
-- - legacy *_by_user_id columns reference public.profiles;
-- - enable RLS now; policies arrive with the dedicated policy migration;
-- - deny direct browser table writes until guarded Content service/RPC contracts exist.

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  content_type text not null,
  status text not null default 'DRAFT',
  visibility text not null default 'PRIVATE_PREVIEW',
  title text,
  short_text text,
  body jsonb,
  excerpt text,
  priority integer not null default 0,
  scheduled_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint content_posts_content_type_check check (content_type in (
    'GENERAL_POST', 'PRODUCT_POST', 'PROMOTION_POST',
    'LIVE_ANNOUNCEMENT', 'ARTICLE', 'ANNOUNCEMENT'
  )),
  constraint content_posts_status_check check (status in (
    'DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'DELETED'
  )),
  constraint content_posts_visibility_check check (visibility in (
    'PUBLIC', 'PRIVATE_PREVIEW'
  )),
  constraint content_posts_scheduled_at_check check (
    status <> 'SCHEDULED' or scheduled_at is not null
  ),
  constraint content_posts_published_at_check check (
    status <> 'PUBLISHED' or published_at is not null
  ),
  constraint content_posts_deleted_at_check check (
    status <> 'DELETED' or deleted_at is not null
  )
);

create table public.content_product_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  content_post_id uuid not null,
  product_id uuid not null,
  product_variant_id uuid,
  product_name_snapshot text,
  price_snapshot numeric(14, 2),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (content_post_id, product_id, product_variant_id),
  constraint content_product_links_post_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete cascade,
  constraint content_product_links_product_fk
    foreign key (organization_id, product_id)
    references public.products (organization_id, id) on delete restrict,
  constraint content_product_links_variant_fk
    foreign key (organization_id, product_variant_id)
    references public.product_variants (organization_id, id) on delete restrict,
  constraint content_product_links_price_check check (
    price_snapshot is null or price_snapshot >= 0
  )
);

create table public.content_live_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  content_post_id uuid not null,
  live_session_id uuid,
  live_starts_at timestamptz not null,
  live_url text,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint content_live_links_post_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete cascade,
  constraint content_live_links_session_fk
    foreign key (organization_id, live_session_id)
    references public.live_sessions (organization_id, id) on delete restrict
);

create index content_posts_org_status_published_idx
  on public.content_posts (organization_id, status, published_at desc);

create index content_posts_org_type_status_idx
  on public.content_posts (organization_id, content_type, status);

create index content_posts_org_visibility_status_idx
  on public.content_posts (organization_id, visibility, status);

create index content_posts_org_scheduled_idx
  on public.content_posts (organization_id, scheduled_at)
  where status = 'SCHEDULED';

create index content_product_links_org_product_idx
  on public.content_product_links (organization_id, product_id);

create index content_product_links_post_idx
  on public.content_product_links (organization_id, content_post_id);

create index content_live_links_org_post_idx
  on public.content_live_links (organization_id, content_post_id);

create trigger content_posts_set_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();

alter table public.content_posts enable row level security;
alter table public.content_product_links enable row level security;
alter table public.content_live_links enable row level security;

revoke all on table public.content_posts from public, anon, authenticated;
revoke all on table public.content_product_links from public, anon, authenticated;
revoke all on table public.content_live_links from public, anon, authenticated;
