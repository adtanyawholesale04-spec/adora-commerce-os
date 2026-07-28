# Track B Content Media Migration Contract Review

**Task:** `ENG-DB-036`
**Status:** APPROVED / IMPLEMENTED
**SQL status:** VALIDATED in local fresh replay
**Track:** Track B - Customer Engagement Platform
**Scope:** Media metadata boundary after validated Content Core migration 035

## Source Baseline

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md`
- `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md`
- `docs/api-contracts/A3_TRACK_B_CONTENT_CORE_MIGRATION_CONTRACT_REVIEW.md`
- validated migration `20260728161057_content_core_035.sql`

## Proposed Migration Scope

Create only:

```text
content_media
```

The table stores media metadata and object-storage keys only. This migration must not upload objects, create buckets, process images, host video, calculate quota, rate-limit uploads, or perform malware scanning.

## Proposed Metadata Contract

```text
id uuid primary key
organization_id uuid required
content_post_id uuid nullable during draft upload
media_type IMAGE or DOCUMENT
variant original / thumbnail / feed / large
storage_bucket required
storage_key required
mime_type required
file_size_bytes required and non-negative
width / height nullable
checksum nullable
alt_text nullable
sort_order default 0
upload_status default UPLOADED
uploaded_by_user_id references profiles
attached_at nullable
created_at default now
deleted_at nullable
```

Native hosted video remains deferred. `DOCUMENT` remains metadata-supported but must follow the approved file-size policy.

## Verified Dependencies

| Dependency | Repository target | Result |
|---|---|---|
| Tenant | `organizations(id)` | READY |
| Content parent | `content_posts(organization_id, id)` | READY after migration 035 |
| Uploader | `profiles(id)` | READY; no public `users` table |
| Object storage | Supabase Storage runtime boundary | Service boundary only; no bucket/table change in this migration |

The parent reference must be a composite `(organization_id, content_post_id)` FK so media cannot attach across tenants. Nullable `content_post_id` is allowed only for an unattached draft upload.

## Required Rules

- Binary content stays outside PostgreSQL.
- Supported media types are `IMAGE` and optional `DOCUMENT`; native video is deferred.
- Image variants are `original`, `thumbnail`, `feed`, and `large`.
- `file_size_bytes` must be non-negative; approved limits are image <= 10 MB and document <= 20 MB.
- MIME type, extension, dimensions, organization, and uploader permission are validated by the upload service boundary.
- Orphan cleanup queries must be possible for unattached media older than 24 hours.
- Soft deletion uses `deleted_at`; object deletion is a later service workflow.

## Owner Decisions Required Before SQL

1. **Upload status vocabulary:** approve `PENDING`, `UPLOADED`, `FAILED`, and `DELETED`, or provide the canonical status set.
2. **Unattached upload policy:** approve nullable `content_post_id` with service-only cleanup, or require a separate upload-session reference before metadata creation.
3. **Storage key uniqueness:** approve unique `(organization_id, storage_bucket, storage_key)` to prevent duplicate metadata for one object.
4. **File-size enforcement layer:** approve database checks for the 10/20 MB limits in addition to service validation, or keep MIME-dependent limits service-only.
5. **RLS staging:** approve RLS enabled with no direct browser policies, with storage access and metadata writes handled by a guarded server/storage boundary.

## Owner Approval Record

Owner approval recorded 2026-07-28:

- use `PENDING`, `UPLOADED`, `FAILED`, and `DELETED` upload statuses;
- allow nullable `content_post_id` for unattached draft metadata through the guarded service boundary;
- enforce unique `(organization_id, storage_bucket, storage_key)`;
- keep MIME/file-size limits service-enforced for entitlement-aware overrides while retaining database invariants for non-negative size;
- enable RLS and deny direct browser table access until guarded media actions exist.

## Security Requirements

- Enable RLS on `public.content_media`.
- Revoke direct table privileges from `public`, `anon`, and `authenticated` until dedicated policies and guarded upload actions exist.
- Use composite tenant FKs for content attachment.
- Do not expose `storage_key` or signed URL generation through an unguarded browser table path.
- Public media reads must be derived from an approved published-content boundary, not from broad table access.

## Acceptance Gate

After the five decisions were recorded, migration `20260728162156_content_media_036.sql` was generated with the Supabase CLI, replayed from `001` through current, and validated for media type/variant/status checks, file-size invariants, orphan query support, composite FKs, RLS, and direct-role denial.

## Current Result

`ENG-DB-036` is `VALIDATED`. The migration creates metadata-only Content Media storage with no object upload, bucket, image processing, video hosting, quota, or public-read surface.

**NEXT:** Contract review for `ENG-DB-037` Follow / Interest.
