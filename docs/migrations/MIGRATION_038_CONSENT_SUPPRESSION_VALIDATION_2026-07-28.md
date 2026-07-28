# Migration 038 Consent / Suppression Validation

**Migration:** `20260728163536_consent_suppression_038.sql`
**Task:** `ENG-DB-038`
**Status:** VALIDATED
**Date:** 2026-07-28

## Replay

- `npx supabase db reset --local --yes` completed successfully.
- All migrations from `001` through `20260728163536_consent_suppression_038.sql` applied successfully.
- Historical migrations `001-034` were not modified.

## Schema Checks

- Created `customer_consents`, `customer_consent_events`, and `customer_suppressions`.
- Supported channel, purpose, status, actor type, suppression type, and timestamp checks exist.
- Expression uniqueness protects the current consent key with nullable destination handling.
- Composite tenant FKs protect customer, consent, and actor references.
- Suppression indexes support customer, destination, and active-source lookup.

## Append-Only and Access Boundary

- `customer_consent_events` has the append-only `prevent_update_delete()` trigger.
- RLS is enabled on all three tables.
- `anon` and `authenticated` have no direct table privileges.
- No dispatch, provider call, campaign send, or consent inference from Follow was introduced.

## Evidence

- Local catalog query confirmed RLS on all three tables.
- Constraint catalog query confirmed current-key, lifecycle, scope, and composite FK constraints.
- Trigger catalog query confirmed `customer_consent_events_append_only`.
- Grants query returned no rows for `anon` or `authenticated`.
- Repository test suite passed: `58/58`.
