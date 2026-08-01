# Migration 067 Phase 1D Manual Payment Customer Submission Validation

**Date:** 2026-08-01

**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

**Migration:** `20260801023901_phase_1d_manual_payment_customer_submission_boundary.sql`

## Scope

Implements the Owner-frozen PS01-PS24 reference-only customer submission
boundary. The migration adds one authenticated guarded RPC and one internal
response helper. It creates no payment, order or customer master and does not
enable provider calls, binary proof Storage, staff verification, UI or
Production activation.

## Security Contract

- Resolves `auth.uid()`, active profile, same-tenant membership and active
  customer ownership inside the database boundary.
- Accepts only organization ID, order ID, payment reference and request UUID.
- Derives customer, amount, currency, method, actor and state from canonical
  Commerce Core records.
- Uses `SECURITY DEFINER` with an empty search path, schema-qualified objects,
  explicit revokes and authenticated-only execution.
- Keeps direct customer writes behind existing permission-aware RLS.
- Excludes payment reference, proof payload, bank and contact data from audit,
  idempotency results and RPC responses.

## Local Evidence

| Gate | Result |
|---|---|
| Fresh migration replay | PASS |
| Function security and exact grants | PASS |
| Authenticated owned-order submission | PASS |
| Canonical amount/currency derivation | PASS |
| Reference normalization and validation | PASS |
| Same-request deterministic retry | PASS |
| Changed-input idempotency conflict | PASS |
| Duplicate reference and pending-attempt denial | PASS |
| Other-customer and cross-tenant denial | PASS |
| Expired-order denial | PASS |
| Direct payment transaction write denial | PASS |
| Privacy-bounded audit and response | PASS |
| Competing customer submissions | PASS |
| Submission-versus-expiry race | PASS |
| Supabase database lint | PASS |
| Supabase security and workflow regressions | PASS |
| Commerce integration regression | PASS |
| Manual-payment additive schema regression | PASS |
| Atomic checkout and coupon race regression | PASS |
| Static contract tests (285/285) | PASS |
| ESLint, TypeScript and Next.js build | PASS |
| Supabase security and workflow regressions | PASS |
| Commerce integration regression | PASS |
| Manual-payment additive schema regression | PASS |
| Atomic checkout and coupon race regression | PASS |
| Static contract tests (285/285) | PASS |
| ESLint, TypeScript and Next.js build | PASS |

## Deferred Gates

- Customer submission service/API adapter and UI enablement.
- Private binary proof Storage, MIME/size/path controls and retention.
- Staff approve/reject and atomic settlement boundaries.
- Production preflight and migration apply.
- Public activation; P16 remains mandatory.
