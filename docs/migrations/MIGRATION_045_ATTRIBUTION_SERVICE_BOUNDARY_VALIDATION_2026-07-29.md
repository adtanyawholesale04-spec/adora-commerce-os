# Migration 045 Attribution Service Boundary Validation

**Migration:** `20260728172741_attribution_guarded_service_boundary_045.sql`
**Task:** `ENG-SVC-001`
**Status:** VALIDATED
**Validated:** 2026-07-29

## Scope

- Server/service-role-only `api_record_attribution_event` RPC.
- Event vocabulary, identity anchor, source semantics, model, revenue, and metadata validation.
- Audit-backed idempotency using `client_request_id`.
- Append-only attribution history and no new permission seed.
- Reminder scheduling, customer reminder writes, provider calls, and revenue mutation remain disabled.

## Validation Evidence

- Fresh local replay from migrations 001 through 045: **PASS**.
- Focused attribution boundary validation: **PASS**.
- Supabase security suite: **PASS**.
- Supabase workflow suite and carrier webhook E2E: **PASS**.
- Commerce integration suite: **PASS**.
- ESLint: **PASS**.
- TypeScript typecheck: **PASS**.
- Full Node test suite: **58/58 PASS**.
- `git diff --check`: **PASS**.

## Security Notes

- RPC execute is granted to `service_role` only; `public`, `anon`, and `authenticated` are denied.
- Event recording requires server service boundary and an idempotency key.
- Attribution event updates/deletes remain blocked by the append-only trigger.
- The security baseline now expects 34 public `SECURITY DEFINER` functions after this approved boundary.

**NEXT:** Usage Meter contract review.
