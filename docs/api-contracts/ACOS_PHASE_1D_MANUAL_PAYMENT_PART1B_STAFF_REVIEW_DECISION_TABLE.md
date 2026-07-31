# Phase 1D Manual Payment Part 1B Staff Review Decision Table

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART1B`

**Prepared Date:** 2026-08-01

**Owner Approval Date:** 2026-08-01

**Status:** OWNER APPROVED / SR01-SR24 FROZEN

**Depends On:** Owner-frozen PS01-PS24 customer submission contract

**Runtime:** NOT AUTHORIZED

**Migration:** NOT AUTHORIZED

**Production:** NOT AUTHORIZED / BLOCKED BY P16

## 1. Objective

Define the safest staff review contract for approving or rejecting a pending
reference-only manual bank-transfer claim. Approval of this table freezes
review values only. Settlement details remain Part 1C, and no SQL, RPC, Admin
action, Storage access or Production apply is authorized here.

## 2. Frozen Decisions

The Project Owner approved all recommended values SR01-SR24 on 2026-08-01.
These values are frozen for the manual payment staff-review contract.

| ID | Decision | Recommended safe value |
|---|---|---|
| SR01 | Review actions | Expose two explicit operations, approve and reject; no generic status-update operation and no browser table mutation |
| SR02 | Reviewer identity | Require `auth.uid()`, active profile and active same-tenant organization membership; resolve actor identity server-side |
| SR03 | Exact permission | Require `payment.verify` for both approve and reject; `service_role`, role name, UI visibility and `payment.view` alone are not authorization substitutes |
| SR04 | Entitlement | Recheck active `storefront.checkout` entitlement at review time; missing, disabled, expired or out-of-window entitlement fails closed |
| SR05 | Candidate signatures | Reserve `api_verify_storefront_payment(p_organization_id uuid, p_payment_transaction_id uuid, p_expected_status text, p_reason text, p_request_id uuid)` and matching `api_reject_storefront_payment`; both return bounded `jsonb` |
| SR06 | Reason | Require a trimmed reason of 8-500 characters; reject blank/oversized values and prohibit proof content, reference, bank data, contact data, secrets or provider payloads |
| SR07 | Eligible evidence | Require same-tenant `PAYMENT` / `BANK_TRANSFER` transaction in `PENDING`, one linked proof in `PENDING`, and canonical payment/order links without mismatch |
| SR08 | Review read posture | Review UI uses existing `payment.view` through server reads; the guarded action independently requires `payment.verify` and returns only the evidence needed for the decision |
| SR09 | Maker-checker rule | Reviewer profile must differ from `payment_transactions.created_by`; self-verification and self-rejection fail with `PAYMENT_REVIEW_SELF_ACTION_DENIED` |
| SR10 | Amount authority | Reviewer cannot enter or edit amount/currency; approval uses the locked canonical full transaction amount and requires exact THB equality with payment expected/order due amount |
| SR11 | Payable order state | Require `PENDING_CONFIRMATION`, `UNPAID`, `UNFULFILLED`, future `payment_due_at`, and active linked reservation/coupon evidence; never revive expired/cancelled/confirmed orders |
| SR12 | Hold/deadline alignment gate | Before implementation, Part 1C must align every order reservation hold through `payment_due_at`; if any hold can expire earlier than the review deadline, migration preflight and runtime fail closed |
| SR13 | Optimistic state | Require caller-supplied expected status exactly `PENDING`, then lock and recheck transaction, proof, payment and order state inside the database transaction |
| SR14 | Competing reviewers | First committed terminal decision wins; matching retry returns the original result, while a different request/action receives `PAYMENT_ALREADY_REVIEWED` without overwriting history |
| SR15 | Approval semantics | Approval has no intermediate editable verified state; it must invoke the Part 1C all-or-nothing settlement in the same database transaction or roll back completely |
| SR16 | Rejection semantics | Atomically set the pending transaction to `FAILED`, proof to `REJECTED`, record reviewer/time/reason evidence and leave payment `UNPAID` plus order `PENDING_CONFIRMATION` |
| SR17 | Retry after rejection | Rejection does not release inventory/coupon early; before `payment_due_at`, the customer may submit one new reference after the rejected attempt is terminal |
| SR18 | Idempotency | Use `PAYMENT_VERIFY` or `PAYMENT_REJECT` in `commerce_idempotency_keys`; hash version, organization, reviewer, transaction, expected status and normalized reason |
| SR19 | Audit | Append exactly one `PAYMENT_VERIFIED` or `PAYMENT_REJECTED` audit with tenant, reviewer, opaque entity IDs, bounded statuses, reason and request ID; exclude payment reference and proof payload |
| SR20 | Events and attribution | Approval hands off post-commit `ORDER_PAID` through the existing service boundary; rejection schedules privacy-bounded `payment_failed`; event failure never rewrites the committed review result |
| SR21 | Proof privacy | Reference-only reviewer output may expose the normalized reference only to an authorized review screen; never expose another tenant's row or place the reference in URL, audit, event or application logs |
| SR22 | Bounded result/errors | Return only operation, order/payment/transaction/proof IDs, terminal review status, order/payment status, reviewer time and idempotency flag; use allowlisted non-leaking errors |
| SR23 | Function security | Future functions are authenticated `SECURITY DEFINER`, use empty or explicitly safe search path, perform membership/permission/tenant/state checks internally, revoke `PUBLIC`/`anon`, and grant only `authenticated` |
| SR24 | Validation/delivery gate | Require permission matrix, cross-tenant denial, self-review denial, reason privacy, optimistic conflict, competing approve/reject, deadline/expiry, rollback and idempotency tests before migration/runtime; Production remains separate |

## 3. Proposed Review Flow

```text
staff payment queue (payment.view)
  -> select one PENDING reference-only claim
  -> submit explicit approve or reject action with reason and request UUID
  -> guarded boundary resolves active reviewer and payment.verify
  -> locks and rechecks order, payment, transaction, proof and hold state
  -> approve delegates to Part 1C atomic settlement
     OR reject terminally records FAILED / REJECTED evidence
  -> append one privacy-bounded audit
  -> after commit, retry the appropriate event independently
```

## 4. Lock And Race Posture

Part 1C must freeze the full settlement lock order. Part 1B requires at least:

1. lock the canonical order and reject non-payable state;
2. lock its single payment aggregate;
3. lock the selected pending transaction and linked proof;
4. lock reservations, balances, allocations and reserved coupon in the Part 1C
   deterministic order before approval mutation; and
5. let the first committed review or expiry transition win without a later
   overwrite.

The current checkout contract permits `reservation_minutes` and
`payment_due_minutes` to differ. Staff review must remain blocked until Part 1C
defines and validates one consistent hold deadline through `payment_due_at`.

## 5. Controlled Error Vocabulary

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
IDEMPOTENCY_CONFLICT
PAYMENT_REVIEW_FAILED
```

Cross-tenant, unauthorized and nonexistent evidence may collapse to
`PAYMENT_REVIEW_NOT_FOUND` at the application edge.

## 6. Explicit Non-Scope

- Exact success settlement writes, inventory conversion, coupon consumption,
  aggregate calculation and order confirmation, which belong to Part 1C.
- Binary proof upload, signed URLs, private Storage or retention policy.
- Direct amount/status correction, refund, reversal or provider reconciliation.
- Provider APIs, webhook, fee, payout, notification delivery or Production.
- Admin review UI implementation or enabling any currently disabled action.

## 7. Owner Approval

The Project Owner explicitly approved SR01-SR24 in full on 2026-08-01. Any
change requires a new explicit Owner decision record and must not silently alter
this frozen baseline. This approval authorizes Part 1C contract design only; it
does not authorize migration, RPC, Admin action, Storage, provider or Production
work.
