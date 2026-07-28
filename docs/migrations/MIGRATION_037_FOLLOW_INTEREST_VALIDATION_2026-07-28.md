# Migration 037 Follow / Interest Validation

**Migration:** `20260728163005_follow_interest_037.sql`
**Task:** `ENG-DB-037`
**Status:** VALIDATED
**Date:** 2026-07-28

## Replay

- `npx supabase db reset --local --yes` completed successfully.
- All migrations from `001` through `20260728163005_follow_interest_037.sql` applied successfully.
- Historical migrations `001-034` were not modified.

## Schema Checks

- Created `merchant_follows`, `interest_topics`, and `customer_interests`.
- Composite tenant FKs protect customer and topic references.
- Follow status and timestamp checks exist for `FOLLOWING`, `UNFOLLOWED`, and `BLOCKED`.
- Interest topic and customer-interest uniqueness constraints exist.
- Opt-out retains the row and requires `opted_out_at`.
- Updated-at triggers and feed/audience lookup indexes exist.
- Consent and suppression tables were not created.

## Access Boundary

- RLS is enabled on all three tables.
- `anon` and `authenticated` have no direct table privileges.
- No browser write policy, consent bypass, or suppression side effect was introduced.

## Evidence

- Local catalog query confirmed RLS on all three tables.
- Constraint catalog query confirmed lifecycle, uniqueness, and composite tenant FK constraints.
- Grants query returned no rows for `anon` or `authenticated`.
- Repository test suite passed: `58/58`.
