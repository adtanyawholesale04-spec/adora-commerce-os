# Migration 043 Message Dispatch Validation

**Migration:** `20260728171400_message_dispatch_043.sql`
**Task:** `ENG-DB-041`
**Status:** VALIDATED
**Validated:** 2026-07-29

## Scope

- `message_jobs` persistence for idempotent outbound message intent.
- `message_delivery_attempts` append-only provider attempt history.
- Tenant-scoped campaign, customer, content, and delivery-attempt foreign keys.
- Job status/channel/purpose checks, timestamp gates, JSON object checks, and retry idempotency.
- RLS enabled and direct privileges revoked from `public`, `anon`, and `authenticated`.

Provider credentials, provider API calls, queue workers, and dispatch lifecycle RPCs remain outside this migration.

## Validation Evidence

- Fresh local replay from migrations 001 through 043: **PASS**.
- Supabase security suite: **PASS**.
- Supabase workflow suite and carrier webhook E2E: **PASS**.
- Commerce integration suite: **PASS**.
- ESLint: **PASS**.
- TypeScript typecheck: **PASS**.
- Full Node test suite: **58/58 PASS**.
- `git diff --check`: **PASS**.

## Security Notes

- `message_jobs` and `message_delivery_attempts` have RLS enabled.
- Direct browser table access remains denied until guarded dispatch service contracts exist.
- Delivery attempts use `public.prevent_update_delete()` for append-only history.
- Consent, suppression, tenant quota, and provider readiness remain mandatory dispatch-time service checks.

**NEXT:** Events / attribution migration contract review (`ENG-DB-042`).
