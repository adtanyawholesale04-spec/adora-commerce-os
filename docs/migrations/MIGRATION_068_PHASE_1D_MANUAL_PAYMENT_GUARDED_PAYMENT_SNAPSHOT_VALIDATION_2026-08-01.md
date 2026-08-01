# Migration 068 Phase 1D Manual Payment Guarded Payment Snapshot Validation

**Date:** 2026-08-01

**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

**Migration:** `20260801054812_phase_1d_manual_payment_guarded_payment_snapshot.sql`

## Scope

Implements the Owner-frozen MR01-MR24 customer-owned Storefront order payment
snapshot. The migration adds one authenticated read-only RPC and creates no
table, column, index, policy, seed, repair or source-table grant.

## Security Contract

- Resolves `auth.uid()`, active profile, same-tenant membership and active
  customer ownership inside the database boundary.
- Requires active organization, published Storefront, active THB checkout
  settings and active boolean `storefront.checkout` entitlement.
- Returns the exact allowlisted order and pending-attempt fields only.
- Uses a non-enumerating unavailable envelope for missing, other-customer,
  cross-tenant, non-Storefront and draft orders.
- Uses `STABLE SECURITY DEFINER`, empty search path, fully qualified objects,
  exact revokes and authenticated-only execution.
- Creates no event, audit, ledger, consent, idempotency or status evidence for
  the read.

## Local Evidence

| Gate | Result |
|---|---|
| Fresh migration replay | PASS |
| Dependency and duplicate-function preflight | PASS |
| Function volatility, security and exact grants | PASS |
| Authenticated customer-owned snapshot | PASS |
| Exact response key and two-decimal money shape | PASS |
| Reference, transaction and proof identifier privacy | PASS |
| Missing, other-customer, cross-tenant, non-Storefront and draft non-enumeration | PASS |
| Canonical payment inconsistency fail-closed behavior | PASS |
| Pending reference-only attempt derivation | PASS |
| No event, audit, ledger or idempotency write | PASS |
| Snapshot-versus-submission concurrency and committed refresh | PASS |
| Supabase database lint | PASS |
| Manual Payment customer submission regression | PASS |
| Manual Payment additive schema regression | PASS |
| Atomic checkout and coupon-race regression | PASS |
| Storefront boundary regression | PASS |
| Supabase security and workflow regressions | PASS |
| Carrier webhook local E2E | PASS |
| Commerce integration regression | PASS |
| Static contract tests (310/310) | PASS |
| ESLint, TypeScript and Next.js production build | PASS |

## Deferred Gates

- Part 3D-B server read service and Storefront route/form implementation.
- Part 3D-C responsive, accessibility and workflow QA.
- Bank instruction configuration and private binary proof Storage.
- Staff verification and settlement boundaries.
- Production preflight and migration apply.
- Public activation; P16 remains mandatory.
