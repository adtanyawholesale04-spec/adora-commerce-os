# Phase 1D Manual Payment Part 1C Settlement And Failure Decision Table

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART1C`

**Prepared Date:** 2026-08-01

**Owner Approval Date:** 2026-08-01

**Status:** OWNER APPROVED / SC01-SC30 FROZEN

**Depends On:** Owner-frozen PS01-PS24 customer submission and SR01-SR24
staff review contracts

**Runtime:** NOT AUTHORIZED

**Migration:** NOT AUTHORIZED

**Production:** NOT AUTHORIZED / BLOCKED BY P16

## 1. Objective

Define the exact all-or-nothing settlement and controlled failure behavior for
an approved reference-only manual bank-transfer claim. This table proposes the
minimum changes required to preserve one financial truth across payment,
order, inventory, coupon, audit and post-commit event boundaries. It does not
authorize SQL, runtime, Storage, UI activation or Production apply.

## 2. Frozen Decisions

The Project Owner approved all recommended values SC01-SC30 on 2026-08-01.
These values are frozen for the manual payment settlement and failure contract.

| ID | Decision | Recommended safe value |
|---|---|---|
| SC01 | Settlement entry point | Keep the explicit Part 1B approve RPC as the only staff entry point; it calls one non-executable internal settlement helper in the same database transaction and exposes no generic status mutation |
| SC02 | Captured time | Capture one `statement_timestamp()` after authorization and row locks; use it for deadline, paid, verified, confirmed, converted and consumed timestamps |
| SC03 | Eligible state | Require one same-tenant `STOREFRONT` order in `PENDING_CONFIRMATION` / `UNPAID` / `UNFULFILLED`, one `UNPAID` payment, the selected `PENDING` transaction and one `PENDING` proof; any mismatch rolls back without terminal review mutation |
| SC04 | Hold/deadline amendment | Amend the frozen checkout configuration so `payment_due_minutes <= reservation_minutes`; change the safe default for `payment_due_minutes` from 60 to 15 while retaining `reservation_minutes = 15`, so every accepted payment deadline is covered by the stock hold |
| SC05 | Alignment preflight | Before DDL or runtime, fail if an active checkout setting violates the new relation or any pending Storefront order has a missing/non-active hold, mixed hold deadline, or reservation expiring before `payment_due_at`; do not rewrite existing orders, settings or financial evidence automatically |
| SC06 | Deadline race | Approval requires captured time strictly before `payment_due_at` and every active reservation expiry at or after `payment_due_at`; expiry and approval lock the order first so the first committed transition wins |
| SC07 | Deterministic lock order | Lock order, payment, selected transaction, proof, reserved coupon, reservations ordered by ID, matching inventory balances ordered by variant/warehouse, and any source-reservation allocations in that order before mutation |
| SC08 | Amount and currency invariant | Require transaction amount, payment expected amount, order grand total and order amount due to be the same positive two-decimal THB value, with payment/order received or paid amount still zero |
| SC09 | Transaction success | Change only the selected transaction `PENDING -> SUCCEEDED`, set `paid_at` to captured time and never alter amount, currency, method, external reference, creator or creation timestamp |
| SC10 | Proof verification | Change the linked proof `PENDING -> VERIFIED`, set `verified_by` and `verified_at`, and retain immutable reference-only metadata; the review reason stays in audit rather than proof metadata |
| SC11 | Payment aggregate | Recalculate received amount from same-payment `SUCCEEDED` payment transactions excluding transactions later marked `REVERSED`; require the total to equal expected amount exactly, then set payment `PAID`, received amount and updated time |
| SC12 | Partial or excess result | Partial, excess, duplicate-success or currency-mismatched totals fail closed and roll back; Part 1C never produces `PARTIALLY_PAID`, credit, change, refund or reconciliation evidence |
| SC13 | Order confirmation | Set order `PENDING_CONFIRMATION -> CONFIRMED`, payment `UNPAID -> PAID`, amount paid to grand total, amount due to zero, and `confirmed_at`/`updated_at` to captured time; fulfillment remains `UNFULFILLED` |
| SC14 | Status history | Append exactly two order-history rows for the committed settlement: domain `PAYMENT` from `UNPAID` to `PAID`, then domain `ORDER` from `PENDING_CONFIRMATION` to `CONFIRMED`, both attributed to the reviewer with one bounded reason |
| SC15 | Allocation lineage | Add nullable same-tenant `inventory_allocations.source_reservation_id` for future conversions, unique when non-null; existing allocations remain null and each new payment settlement allocation references exactly one source reservation |
| SC16 | Inventory conversion | For every active order reservation create one matching active allocation, move the balance quantity from `reserved` to `allocated` without changing `on_hand` or `available`, then set the reservation to `CONVERTED` with its existing terminal timestamp field |
| SC17 | Inventory invariants | Require positive reservation quantities, exact order/order-item/variant/warehouse links, sufficient balance reserved quantity, no existing source-reservation allocation and allocation totals equal each order-item quantity; any mismatch rolls back all settlement writes |
| SC18 | Coupon consumption | If one same-tenant order redemption exists, require exactly one `RESERVED` row and change it to `CONSUMED` with `consumed_at`; an order with no coupon proceeds, while any other coupon cardinality/state fails closed |
| SC19 | Settlement audit | Append exactly one `PAYMENT_VERIFIED` audit row in the transaction with tenant, reviewer, transaction entity, request ID, bounded before/after statuses and the approved reason; exclude reference, proof payload, customer contact and bank data |
| SC20 | Idempotency completion | Complete `PAYMENT_VERIFY` only after all settlement and audit writes succeed; a matching retry returns the original bounded terminal result and a different request/action cannot overwrite it |
| SC21 | Approval rollback | Authorization, state, deadline, hold, amount, inventory, coupon, history or audit failure rolls back the entire approval and leaves transaction/proof pending for controlled investigation or expiry; no partial paid truth is retained |
| SC22 | Rejection transaction | In one transaction change only the selected transaction `PENDING -> FAILED` and proof `PENDING -> REJECTED`, set proof reviewer/time, append `PAYMENT_REJECTED` audit and complete `PAYMENT_REJECT` idempotency |
| SC23 | Rejection non-effects | Rejection leaves payment `UNPAID`, order `PENDING_CONFIRMATION`, amounts, active reservations, reserved coupon and fulfillment unchanged; a new customer attempt remains possible before the aligned deadline |
| SC24 | Rejection deadline race | Rejection also requires the order to remain pending and captured time before `payment_due_at`; once the deadline wins, the existing expiry boundary owns hold release and later review returns `PAYMENT_ALREADY_REVIEWED` or `PAYMENT_EXPIRED` |
| SC25 | Paid attribution handoff | After a committed approval, the server-only existing attribution adapter records `ORDER_PAID` from canonical order/customer/amount data using a deterministic derived request UUID; retry independently and never compensate valid settlement for attribution failure |
| SC26 | Failed event handoff | After a committed rejection, a narrow service-role boundary records one privacy-bounded `payment_failed` cart event by resolving the canonical order/source cart and requiring the matching rejection audit; lock the transaction and treat an existing event with the same review request as a retry |
| SC27 | Post-commit failure policy | Attribution or failed-event handoff failure is observable and retryable but never rewrites the committed review, payment, inventory, coupon or order result |
| SC28 | Bounded response | Return only operation, order/payment/transaction/proof IDs, terminal transaction/proof/order/payment statuses, reviewer time, allocation count, coupon-consumed boolean and idempotency flag |
| SC29 | Controlled failures | Use the Part 1B error vocabulary plus `PAYMENT_AMOUNT_INCONSISTENT`, `PAYMENT_ALLOCATION_INCONSISTENT`, `PAYMENT_COUPON_INCONSISTENT` and `PAYMENT_SETTLEMENT_FAILED`; never expose another tenant's existence or raw database text |
| SC30 | Delivery gate | Require Owner freeze, forward-only migration review, clean preflight, fresh replay, permission/tenant/privacy tests, approve/reject/expiry races, failure injection after every mutation group, exact aggregate/allocation/coupon assertions and idempotent post-commit retries before runtime |

## 3. Proposed Approval Transaction

```text
authenticated reviewer with payment.verify
  -> resolve active profile, membership and entitlement
  -> claim PAYMENT_VERIFY idempotency
  -> lock order, payment, pending transaction and pending proof
  -> require aligned future deadline and complete active holds
  -> lock coupon, reservations, balances and allocation lineage
  -> mark transaction SUCCEEDED and proof VERIFIED
  -> derive payment received amount and require exact full payment
  -> convert every reservation to one allocation
  -> consume the reserved coupon when present
  -> mark payment PAID and order CONFIRMED
  -> append PAYMENT and ORDER status histories
  -> append PAYMENT_VERIFIED audit
  -> complete idempotency and commit
  -> retry ORDER_PAID attribution independently after commit
```

No intermediate verified-but-unsettled state is committed.

## 4. Proposed Rejection Transaction

```text
authenticated reviewer with payment.verify
  -> claim PAYMENT_REJECT idempotency
  -> lock and recheck pending order/payment/transaction/proof
  -> require the aligned review deadline has not elapsed
  -> mark transaction FAILED and proof REJECTED
  -> retain UNPAID order/payment and every stock/coupon hold
  -> append PAYMENT_REJECTED audit
  -> complete idempotency and commit
  -> retry payment_failed cart event independently after commit
```

Rejection is terminal only for that submitted attempt. It is not checkout
expiry, cancellation, reservation release, refund or reversal.

## 5. Required Future Additive Changes

Only after Owner freeze, a later migration review may propose:

1. a preflighted `payment_due_minutes <= reservation_minutes` constraint and a
   safe 15-minute `payment_due_minutes` default;
2. a nullable same-tenant `source_reservation_id` lineage column plus a unique
   non-null index on `inventory_allocations`;
3. the Part 1A reference-only proof and active-pending-attempt constraints;
4. guarded submission, explicit approve/reject and non-executable settlement
   helpers with exact revokes/grants;
5. a narrow post-commit `payment_failed` event recording boundary; and
6. extensions to the existing checkout idempotency helpers for the already
   frozen `PAYMENT_PROOF_SUBMIT`, `PAYMENT_VERIFY` and `PAYMENT_REJECT` catalog.

No frozen migration is edited, and no existing order, payment, transaction,
allocation or configuration row is silently repaired.

## 6. Controlled Error Vocabulary

```text
AUTH_REQUIRED
MEMBERSHIP_REQUIRED
PAYMENT_VERIFY_PERMISSION_REQUIRED
CHECKOUT_NOT_ENABLED
PAYMENT_REVIEW_NOT_FOUND
PAYMENT_REVIEW_SELF_ACTION_DENIED
PAYMENT_REASON_INVALID
PAYMENT_STATE_CONFLICT
PAYMENT_ALREADY_REVIEWED
PAYMENT_EXPIRED
PAYMENT_HOLD_INCONSISTENT
PAYMENT_AMOUNT_INCONSISTENT
PAYMENT_ALLOCATION_INCONSISTENT
PAYMENT_COUPON_INCONSISTENT
IDEMPOTENCY_CONFLICT
PAYMENT_SETTLEMENT_FAILED
```

## 7. Explicit Non-Scope

- Binary proof upload, signed URLs, private Storage and proof retention.
- Partial/over/under payment, provider reconciliation, fee, refund or reversal.
- Fulfillment creation, picking, QC, shipment or customer notification.
- Automatic data repair for existing configuration or commerce evidence.
- Admin review UI implementation, public checkout or Production apply.

## 8. Owner Approval

The Project Owner explicitly approved SC01-SC30 in full on 2026-08-01. Any
change requires a new explicit Owner decision record and must not silently alter
this frozen baseline. This approval authorizes Part 2 migration contract review
only; it does not authorize SQL generation/application, runtime, Storage, UI,
provider work or Production. Production remains blocked by P16 and its separate
rollout gate.
