# Phase 1D Manual Payment Part 0 Repository Audit

**Status:** AUDIT COMPLETE / CONTRACT DECISIONS REQUIRED / NO SQL AUTHORIZED

**Date:** 2026-08-01

**Authority:** `ACOS_IMPLEMENTATION_STATUS.md`, frozen Phase 1D Business Rules and ER addendum

## 1. Scope

This read-only audit determines whether the approved local manual bank-transfer
MVP can reuse the current Commerce Core without creating a second order,
payment, inventory, coupon, customer or attribution source.

It does not authorize a migration, Storage bucket, upload policy, guarded RPC,
Server Action, staff verification UI, provider integration or Production apply.

## 2. Canonical Source Inventory

| Concern | Canonical source | Audit result |
|---|---|---|
| Customer ownership | `profiles`, `customers`, `customer_profile_links` | REUSE; customer submission must prove an active same-tenant profile link |
| Checkout order | `orders`, `order_items`, `order_status_history` | REUSE; Layer 3 creates `PENDING_CONFIRMATION` / `UNPAID` / `UNFULFILLED` orders |
| Payment aggregate | `payments` | REUSE; one aggregate is created by atomic checkout, but a database uniqueness guarantee on order is still absent |
| Money evidence | `payment_transactions` | REUSE; supports `BANK_TRANSFER`, external reference and the approved pending/success/failure lifecycle |
| Proof review evidence | `payment_proofs` | REUSE; currently requires a non-null `storage_path`, so it cannot represent a reference-only submission by itself |
| Inventory hold | `inventory_reservations`, `inventory_allocations`, `inventory_balances` | REUSE; checkout creates split reservations that payment success must convert atomically |
| Coupon lifecycle | `coupon_redemptions` | REUSE; checkout creates `RESERVED` evidence that payment success must consume atomically |
| Idempotency | `commerce_idempotency_keys` | REUSE; operations already include `PAYMENT_PROOF_SUBMIT`, `PAYMENT_VERIFY` and `PAYMENT_REJECT` |
| Permission | `permissions`, `has_org_permission` | REUSE; staff verification is governed by exact permission `payment.verify` |
| Audit | `audit_logs` | REUSE; approved action vocabulary is `PAYMENT_PROOF_SUBMITTED`, `PAYMENT_VERIFIED`, `PAYMENT_REJECTED` |
| Attribution | `attribution_events`, `api_record_attribution_event` | REUSE through the separate service-role boundary for retryable `ORDER_PAID` recording |

No duplicate commerce master is required or permitted.

## 3. Existing Safeguards

1. `payment_transactions_active_manual_reference_uidx` prevents duplicate active
   `BANK_TRANSFER` or `QR` references inside one organization.
2. The payment tables are tenant-keyed and have permission-aware RLS for Admin
   reads and `payment.verify` writes.
3. Direct customer table inserts are not available. A future customer action
   therefore requires a narrow authenticated `SECURITY DEFINER` boundary with
   explicit profile-link, order ownership, tenant and expiry checks.
4. Low-level inventory functions are not public customer APIs. Existing
   authenticated wrappers require staff permissions and are not suitable as the
   payment-confirmation orchestrator.
5. The checkout idempotency ledger is private to `service_role` and already
   protects immutable request identity and terminal outcomes.
6. `ORDER_PAID` is accepted by the existing attribution recorder, but that
   recorder is intentionally service-role-only and must remain an independently
   retryable post-commit action.

## 4. Contract Gaps

| Gap | Classification | Required treatment before implementation |
|---|---|---|
| Exactly one `payments` row per order is not enforced by a unique database constraint | Protected schema | Non-destructive duplicate preflight, then forward-only uniqueness after Owner freeze |
| Reference-only submission and optional binary proof do not map cleanly to mandatory `payment_proofs.storage_path` | Private data / Storage | Freeze whether V1 is reference-only first or includes private binary upload; never invent a path or bucket |
| No private payment-proof Storage bucket, object naming contract, MIME/size limits, RLS policies or deletion process exists | Private data / retention | Separate Owner-approved Storage and retention contract; remain blocked until approved |
| No guarded customer payment submission RPC exists | Protected payment write | Freeze signature, ownership, amount/reference rules, expiry race and replay result |
| No guarded staff approve/reject RPC exists | Protected payment write | Freeze `payment.verify`, reason, optimistic state, amount policy and concurrent-review behavior |
| No single settlement boundary atomically updates payment, order, reservations, coupon and histories | Transaction-critical core | Define one lock order and one all-or-nothing boundary; generic inventory wrappers are insufficient |
| No exact-once payment audit/event projection is implemented | Audit / event | Freeze request-id mapping and retry behavior; do not put proof data in audit/event payloads |
| No payment due/verification race decision is executable | Concurrency | Define lock ordering and which state wins when expiry and verification compete |

## 5. Reuse and Isolation Rules

- A future payment boundary must lock and validate the existing order, payment,
  transaction, reservation and coupon rows in deterministic order.
- It must not call browser-facing generic inventory wrappers as a shortcut.
- It must not grant direct customer writes to payment tables or expose
  `service_role` to the client.
- It must not copy proof binaries, bank details or unrestricted metadata into
  audit logs, events, idempotency evidence or attribution.
- Rejection and failure remain evidence-preserving transitions. Corrections use
  reversal/refund boundaries rather than destructive edits.
- Provider payment, fees, payout, ads and external messaging are outside this
  local manual-payment scope.

## 6. Recommended Delivery Parts

### Part 1A - Customer Submission Decision Table

Freeze reference normalization, payment method, amount policy, optional-proof
posture, ownership, payment deadline, duplicate behavior, request hashing and
safe response fields. This is the next authorized planning step only.

### Part 1B - Staff Review Decision Table

Freeze approve/reject signatures, `payment.verify`, mandatory reason, optimistic
state, concurrent review behavior and safe proof access.

### Part 1C - Settlement and Failure Decision Table

Freeze the atomic lock order and exact transitions for payment aggregate, order,
inventory allocation, coupon consumption, histories, audit and post-commit
`ORDER_PAID` attribution.

### Part 2 - Forward-only Database Boundary

Only after Owner freeze: generate a new migration, add approved constraints and
guarded functions, revoke `PUBLIC`/`anon`, grant only reviewed roles and validate
fresh replay plus concurrency. Production apply remains separately gated.

### Part 3 - Server Runtime and UI

Only after the database boundary passes: add disabled-by-default server services,
customer submission UI and permission-aware staff review UI. Private binary proof
upload remains a separately approved Storage part if selected.

## 7. Required Validation

- Static contract test proving canonical source reuse and the blocked boundaries.
- Fresh migration replay after any future schema work.
- Customer ownership, cross-tenant denial and direct-table-write denial tests.
- Same-request replay, conflicting-request and duplicate-reference tests.
- Verification-versus-expiry and competing-verifier concurrency tests.
- Atomic success/failure tests across payment, order, inventory and coupon rows.
- Audit privacy and exact-once event/attribution reconciliation tests.
- Private Storage MIME, size, path, read, delete and retention tests if binary
  proof upload is later approved.

## 8. Audit Outcome

The canonical model is reusable and the next contract-review step is ready. The
protected manual payment implementation remains **BLOCKED** until Parts 1A-1C
are Owner approved. Binary payment proof remains additionally blocked on a
private Storage and retention decision. No migration, runtime, provider,
entitlement, UI activation or Production change was made by this audit.
