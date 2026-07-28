# Migration 035 Content Core Validation

**Migration:** `20260728161057_content_core_035.sql`
**Task:** `ENG-DB-035`
**Status:** VALIDATED
**Date:** 2026-07-28

## Replay

- `npx supabase db reset --local --yes` completed successfully.
- All migrations from `001` through `20260728161057_content_core_035.sql` applied successfully.
- Historical migrations `001-034` were not modified.

## Schema Checks

- Created `content_posts`, `content_product_links`, and `content_live_links`.
- `content_promotion_links` is intentionally deferred until a verified `promotions` master exists.
- All three tables have RLS enabled.
- Content lifecycle checks, tenant-scoped foreign keys, product/variant links, and live-session links exist.
- No public PostgreSQL enum or duplicate Core master was introduced.

## Access Boundary

- `anon` and `authenticated` have no direct table privileges on the new Content Core tables.
- No public-read policy or browser write policy was introduced.
- Future public reads must go through the approved controlled boundary and enforce published/public/non-deleted conditions.

## Evidence

- Local catalog query confirmed `relrowsecurity = true` for all three tables.
- Constraint catalog query confirmed lifecycle checks and composite tenant FKs.
- Grants query returned no rows for `anon` or `authenticated`.
- Repository test suite passed: `58/58`.
