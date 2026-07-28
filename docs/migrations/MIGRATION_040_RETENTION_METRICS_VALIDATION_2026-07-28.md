# Migration 040 Retention Metrics Validation

**Migration:** `20260728164249_retention_metrics_040.sql`
**Task:** `ENG-DB-039`
**Status:** VALIDATED
**Date:** 2026-07-28

## Replay

- `npx supabase db reset --local --yes` completed successfully.
- All migrations from `001` through `20260728164249_retention_metrics_040.sql` applied successfully.
- Historical migrations `001-034` were not modified.

## Schema Checks

- Created rebuildable `customer_retention_metrics` projection.
- Composite tenant/customer FK and unique `(organization_id, customer_id)` exist.
- Non-negative value/count checks, score ranges, and approved segment labels exist.
- `calculation_version` is required and engagement fields remain nullable.
- Lookup indexes and updated-at trigger exist.
- No Orders, Payments, Returns, or financial source mutation was introduced.

## Access Boundary

- RLS is enabled on `public.customer_retention_metrics`.
- `anon` and `authenticated` have no direct table privileges.
- Refresh scheduling, qualifying-order reads, currency handling, and calculation logic remain outside the migration.

## Evidence

- Local catalog query confirmed RLS.
- Constraint catalog query confirmed projection, score, segment, and composite FK constraints.
- Trigger catalog query confirmed `customer_retention_metrics_set_updated_at`.
- Grants query returned no rows for `anon` or `authenticated`.
- Repository test suite passed: `58/58`.
