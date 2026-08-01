# Phase 1D Manual Payment Part 2A Schema And Preflight Review

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART2A`

**Review Date:** 2026-08-01

**Status:** COMPLETE / LOCAL PREFLIGHT PASSED / 0 BLOCKERS

**Depends On:** Owner-frozen PS01-PS24, SR01-SR24 and SC01-SC30

**Preflight Artifact:**
`supabase/validation/sql/phase-1d-manual-payment-part2a-preflight.sql`

**DDL / Migration:** NOT AUTHORIZED

**Production:** NOT RUN / NOT AUTHORIZED / BLOCKED BY P16

## 1. Objective

Freeze non-destructive evidence about the current local schema and data before
Part 2B proposes additive DDL. The preflight returns only check ID, severity and
finding count. It returns no organization, customer, order, payment,
transaction, reference, proof or inventory identifiers and performs no write.

## 2. Classification

| Classification | Meaning | Required action |
|---|---|---|
| `BLOCKER` | Existing data would make the frozen contract unsafe or ambiguous | Stop before DDL; investigate and obtain an explicit repair decision |
| `EXPECTED_GAP` | Current schema intentionally lacks an Owner-frozen additive capability | Part 2B may design the exact additive change; no data repair is implied |
| `WARNING` | Non-blocking operational evidence requiring documented follow-up | Record ownership and validation before implementation |

Any non-zero blocker stops Part 2B implementation and migration generation.
The preflight never repairs data automatically.

## 3. Read-Only Preflight Catalog

| ID | Severity | Scope |
|---|---|---|
| PF01 | BLOCKER | Checkout settings where payment deadline exceeds reservation duration |
| PF02 | BLOCKER | Pending Storefront order without `payment_due_at` |
| PF03 | BLOCKER | Pending Storefront order without exactly one payment aggregate |
| PF04 | BLOCKER | Payment/order amount, currency or unpaid-state mismatch |
| PF05 | BLOCKER | Pending order without active inventory reservations |
| PF06 | BLOCKER | Active reservation that does not cover `payment_due_at` |
| PF07 | BLOCKER | Mixed active reservation deadlines for one order |
| PF08 | BLOCKER | Reservation/order-item/variant lineage mismatch |
| PF09 | BLOCKER | Inventory balance reserved quantity below active reservation evidence |
| PF10 | BLOCKER | Allocation already present before payment settlement |
| PF11 | BLOCKER | More than one pending transaction for one payment |
| PF12 | BLOCKER | Pending manual transaction shape, amount, currency or reference mismatch |
| PF13 | BLOCKER | Pending transaction without exactly one proof |
| PF14 | BLOCKER | Pending transaction linked to a non-pending proof |
| PF15 | BLOCKER | Duplicate normalized active bank-transfer reference |
| PF16 | BLOCKER | More than one coupon redemption for a pending order |
| PF17 | BLOCKER | Pending order coupon redemption outside `RESERVED` |
| PF18 | BLOCKER | Successful payment evidence on an unpaid pending order |
| PF19 | EXPECTED_GAP | `payment_proofs.storage_path` still requires a value |
| PF20 | EXPECTED_GAP | `inventory_allocations.source_reservation_id` does not exist |

## 4. Local Evidence

The preflight ran against the current local Supabase database on 2026-08-01.

```text
BLOCKER checks:       18
BLOCKER findings:      0
EXPECTED_GAP checks:   2
EXPECTED_GAP findings: 2
WARNING findings:      0
```

The two expected findings match the frozen Part 1 contracts:

1. reference-only proof submission needs a nullable, constrained
   `payment_proofs.storage_path`; and
2. exact reservation-to-allocation idempotency needs additive
   `inventory_allocations.source_reservation_id` lineage.

This is local evidence only. It is not evidence that Production data is clean,
and it does not authorize a Production query or migration.

## 5. Repository Schema Findings

1. `organization_checkout_settings` currently defaults reservation to 15
   minutes and payment due to 60 minutes, so Part 2B must propose the frozen
   15-minute default amendment and relational check.
2. `payments` already has a unique `order_id`; Part 2B must preserve it rather
   than create a duplicate payment master or overlapping uniqueness source.
3. `commerce_idempotency_keys` already allows `PAYMENT_PROOF_SUBMIT`,
   `PAYMENT_VERIFY` and `PAYMENT_REJECT`; future helper changes must reuse that
   catalog.
4. the current active manual-reference index uses the stored reference value;
   Part 2B must design a preflighted normalized active-reference invariant.
5. `inventory_reservations.order_item_id` already provides same-tenant order
   line evidence; only allocation source lineage remains additive.
6. `payment_proofs` has no reference-only nullable/check contract yet.

## 6. Part 2B Handoff

Part 2B may now design, but not implement:

- the hold/deadline default and relational constraint;
- reference-only proof nullability and evidence check;
- normalized active reference and one-pending-attempt constraints;
- allocation source-reservation lineage and uniqueness;
- exact index/constraint names, dependency order and rollback posture; and
- a repeated zero-blocker preflight gate immediately before future DDL.

No SQL migration, data repair, function, grant, RLS, application runtime,
Storage, UI or Production work is authorized by Part 2A.
