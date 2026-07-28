# Migration 044 Events / Attribution Validation

**Migration:** `20260728172100_attribution_live_reminder_044.sql`
**Task:** `ENG-DB-042`
**Status:** VALIDATED
**Validated:** 2026-07-29

## Scope

- `attribution_events` append-only engagement and revenue-attribution history.
- `live_reminder_requests` explicit reminder-request history with approved offsets.
- Tenant-scoped FKs to Content, Campaign, Message, Customer, Order, and Live Link sources.
- Attribution event/model/revenue/metadata checks and reminder status/offset checks.
- RLS enabled and direct privileges revoked from `public`, `anon`, and `authenticated`.

Commerce source tables are not mutated. Provider dispatch, consent/suppression checks, scheduling, and ROI calculation remain service-owned.

## Validation Evidence

- Fresh local replay from migrations 001 through 044: **PASS**.
- Supabase security suite: **PASS**.
- Supabase workflow suite and carrier webhook E2E: **PASS**.
- Commerce integration suite: **PASS**.
- ESLint: **PASS**.
- TypeScript typecheck: **PASS**.
- Full Node test suite: **58/58 PASS**.
- `git diff --check`: **PASS**.

## Security Notes

- Both tables have RLS enabled.
- Direct browser table access remains denied until guarded event-ingest and reminder actions exist.
- Attribution events are protected by the append-only trigger.
- Reminder lifecycle and dispatch-time `LIVE_NOTIFICATION` consent/suppression checks remain outside direct table writes.

**NEXT:** Events / Attribution guarded service boundary review, then Usage Meter contract review.
