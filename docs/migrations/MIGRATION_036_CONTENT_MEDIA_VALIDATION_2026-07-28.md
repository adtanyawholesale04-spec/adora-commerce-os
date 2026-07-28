# Migration 036 Content Media Validation

**Migration:** `20260728162156_content_media_036.sql`
**Task:** `ENG-DB-036`
**Status:** VALIDATED
**Date:** 2026-07-28

## Replay

- `npx supabase db reset --local --yes` completed successfully.
- All migrations from `001` through `20260728162156_content_media_036.sql` applied successfully.
- Historical migrations `001-034` were not modified.

## Schema Checks

- Created metadata-only `content_media`.
- Binary upload, bucket creation, image processing, native video hosting, quota, and cleanup execution remain outside this migration.
- Type, variant, upload status, non-negative file size, dimensions, storage key, and attachment invariants exist.
- Composite tenant FK to `content_posts` and uploader FK to `profiles` exist.
- Indexes support tenant/post sorting, recent media, and unattached cleanup candidates.

## Access Boundary

- RLS is enabled on `public.content_media`.
- `anon` and `authenticated` have no direct table privileges.
- No storage bucket policy, signed URL path, public media read policy, or browser write policy was introduced.

## Evidence

- Local catalog query confirmed `relrowsecurity = true`.
- Constraint catalog query confirmed lifecycle, storage, dimension, and composite FK constraints.
- Grants query returned no rows for `anon` or `authenticated`.
- Index catalog query confirmed the unattached cleanup index.
- Repository test suite passed: `58/58`.
