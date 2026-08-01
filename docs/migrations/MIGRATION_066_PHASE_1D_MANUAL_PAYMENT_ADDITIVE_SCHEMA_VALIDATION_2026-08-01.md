# Migration 066 Phase 1D Manual Payment Additive Schema Validation

**Date:** 2026-08-01

**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

## Migration File

- `20260731220202_phase_1d_manual_payment_additive_schema.sql`

## Owner-Frozen Source

- `ACOS_PHASE_1D_MANUAL_PAYMENT_PART2B_ADDITIVE_SCHEMA_CONTRACT.md`
- AS01-AS24 approved in full on 2026-08-01

## Preflight Evidence

The existing local database was queried before replay with two count-only,
read-only catalogs:

| Catalog | Checks | Blocking findings |
|---|---:|---:|
| Part 2A commerce-state preflight | 18 blockers + 2 expected schema gaps | 0 |
| Part 2C compatibility preflight | 7 blockers | 0 |

The two Part 2A expected gaps were the exact nullable reference-only proof and
allocation lineage changes implemented by this migration. Production was not
queried.

## Local Replay Result

A fresh `supabase db reset --local` replayed migrations `001` through the new
Part 2C migration successfully. No frozen migration was edited.

Validated behavior includes:

- aligned 15-minute reservation and payment deadline defaults;
- enforced `payment_due_minutes <= reservation_minutes`;
- exclusive binary-path or exact `REFERENCE_ONLY` proof evidence;
- one pending proof per transaction;
- one pending bank-transfer attempt per payment;
- normalized active bank-reference uniqueness while preserving the older exact
  manual-reference index;
- nullable legacy-safe allocation lineage with a same-tenant reservation FK;
- exactly one allocation per non-null source reservation;
- preserved RLS posture with no new policy, grant, function, table or Storage
  object; and
- no automatic data repair or lineage backfill.

## Concurrency Evidence

Independent competing database connections proved exactly one winner for:

1. two pending bank-transfer attempts against one payment;
2. two pending proofs against one transaction;
3. two normalized-equivalent active references against different payments; and
4. two allocations against one source reservation.

## Regression Gates

The following local gates passed:

- focused Part 2C schema and concurrency suite;
- PostgreSQL database lint;
- Phase 1D checkout foundation;
- guarded cart RPC and active-cart concurrency;
- atomic checkout, coupon and competing-transaction validation;
- Supabase security suite;
- Supabase workflow suite, including carrier webhook E2E;
- Commerce integration suite; and
- project tests, lint, typecheck and diff checks.

The existing atomic-checkout fixture was reconciled from a legacy 15/60-minute
pair to the Owner-frozen 15/15-minute contract. No frozen migration or runtime
function was changed.

## Remaining Gates

Customer submission, staff verification, atomic settlement, private proof
Storage, Storefront checkout UI activation, Production preflight/apply and
public activation remain separately unauthorized. P16 remains mandatory for
Production.
