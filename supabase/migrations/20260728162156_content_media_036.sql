-- ADORA Commerce OS (ACOS)
-- Track B: Content Media migration 036
--
-- Owner-approved decisions:
-- - upload status is PENDING, UPLOADED, FAILED, or DELETED;
-- - unattached draft metadata is allowed only through the guarded service boundary;
-- - storage keys are unique within an organization and bucket;
-- - MIME/file-size limits remain service-enforced for entitlement-aware overrides;
-- - enable RLS and deny direct browser table access until guarded media actions exist.

create table public.content_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  content_post_id uuid,
  media_type text not null,
  variant text not null,
  storage_bucket text not null,
  storage_key text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  width integer,
  height integer,
  checksum text,
  alt_text text,
  sort_order integer not null default 0,
  upload_status text not null default 'PENDING',
  uploaded_by_user_id uuid not null references public.profiles(id) on delete restrict,
  attached_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, storage_bucket, storage_key),
  constraint content_media_post_fk
    foreign key (organization_id, content_post_id)
    references public.content_posts (organization_id, id) on delete set null,
  constraint content_media_media_type_check check (media_type in ('IMAGE', 'DOCUMENT')),
  constraint content_media_variant_check check (variant in ('original', 'thumbnail', 'feed', 'large')),
  constraint content_media_upload_status_check check (
    upload_status in ('PENDING', 'UPLOADED', 'FAILED', 'DELETED')
  ),
  constraint content_media_file_size_check check (file_size_bytes >= 0),
  constraint content_media_dimensions_check check (
    (width is null or width > 0) and (height is null or height > 0)
  ),
  constraint content_media_sort_order_check check (sort_order >= 0),
  constraint content_media_storage_bucket_check check (length(trim(storage_bucket)) > 0),
  constraint content_media_storage_key_check check (length(trim(storage_key)) > 0),
  constraint content_media_attached_at_check check (
    content_post_id is not null or attached_at is null
  )
);

create index content_media_org_post_sort_idx
  on public.content_media (organization_id, content_post_id, sort_order);

create index content_media_org_created_idx
  on public.content_media (organization_id, created_at desc);

create index content_media_unattached_idx
  on public.content_media (organization_id, created_at)
  where content_post_id is null and attached_at is null and deleted_at is null;

alter table public.content_media enable row level security;

revoke all on table public.content_media from public, anon, authenticated;
