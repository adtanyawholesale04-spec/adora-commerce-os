# Phase 1D Manual Payment Part 1A Customer Submission Decision Table

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART1A`

**Prepared Date:** 2026-08-01

**Owner Approval Date:** 2026-08-01

**Status:** OWNER APPROVED / PS01-PS24 FROZEN

**Runtime:** NOT AUTHORIZED

**Migration:** NOT AUTHORIZED

**Storage:** PRIVATE PROOF UPLOAD DEFERRED / NOT AUTHORIZED

**Production:** NOT AUTHORIZED / BLOCKED BY P16

## 1. Objective

Define the safest exact customer-facing contract for submitting local manual
bank-transfer evidence against the canonical pending Storefront order. Approval
of this table freezes contract values only. It does not authorize SQL, a guarded
function, Storage, UI activation, a provider call or Production apply.

## 2. Frozen Decisions

The Project Owner approved all recommended values PS01-PS24 on 2026-08-01.
These values are frozen for the manual payment customer-submission contract.

| ID | Decision | Recommended safe value |
|---|---|---|
| PS01 | Executable MVP method | Accept local `BANK_TRANSFER` reference submission only; `QR`, cash, COD, provider payment and real transfer execution remain deferred |
| PS02 | Authentication | Require `auth.uid()`, an active profile, active same-tenant organization membership and active `customer_profile_links` ownership |
| PS03 | Trusted identity | Resolve profile and customer on the server; never accept `customer_id`, profile ID or membership role from the browser |
| PS04 | Eligible order | Require the customer's same-tenant `STOREFRONT` order in `PENDING_CONFIRMATION`, `UNPAID`, `UNFULFILLED`, with non-null future `payment_due_at` |
| PS05 | Payment aggregate | Require exactly one same-tenant `payments` row for the order in `UNPAID`, with expected amount/currency matching the order; add uniqueness only through a future forward-only migration after preflight |
| PS06 | Candidate RPC | Reserve `api_submit_storefront_payment_proof(p_organization_id uuid, p_order_id uuid, p_payment_reference text, p_request_id uuid) returns jsonb`; do not accept amount, customer, status, provider or storage path |
| PS07 | Reference normalization | Trim outer whitespace, uppercase ASCII letters, allow `A-Z`, `0-9`, `.`, `_`, `/`, `-`, require 6-100 characters and reject all other input; store only the normalized value |
| PS08 | Reference privacy | Do not accept free-form notes, bank account data, payer name or provider payload; never copy the reference into audit, event, idempotency response or logs |
| PS09 | Transaction amount | Derive the full amount from locked canonical `payments.amount_expected` / `orders.amount_due`; the browser cannot submit or override amount and partial payment is disabled |
| PS10 | Currency | Require canonical order and payment currency to be `THB`; the browser cannot choose currency |
| PS11 | Pending evidence | Create one `payment_transactions` row with type `PAYMENT`, method `BANK_TRANSFER`, normalized external reference, canonical full amount, `THB` and status `PENDING`; server owns timestamps and creator |
| PS12 | Idempotency scope | Use `commerce_idempotency_keys` operation `PAYMENT_PROOF_SUBMIT`; hash schema version, organization, resolved customer, order, method and normalized reference with the stable request UUID |
| PS13 | Same-request replay | Matching retry returns the original bounded result; reuse of the request UUID with different normalized input fails with `IDEMPOTENCY_CONFLICT` and creates nothing |
| PS14 | Duplicate reference | Return the existing result only when the active reference belongs to the same owned order/customer; collision with another order returns `PAYMENT_REFERENCE_CONFLICT` without revealing the other record |
| PS15 | Active attempt cardinality | Permit at most one active `PENDING` transaction per payment aggregate; a new reference is allowed only after the previous attempt is terminally rejected/failed/cancelled under a reviewed boundary |
| PS16 | Deadline check | Lock order then payment before checking `statement_timestamp() < payment_due_at`; submission at or after the deadline fails closed even if the expiry job has not run |
| PS17 | Expiry race | Database row locks decide the race; submission never revives or mutates an expired/cancelled order and never extends reservation/payment deadlines |
| PS18 | Reference-only proof record | Create one `payment_proofs` review row for the pending transaction with `storage_path = null` and bounded metadata `{schema_version: 1, evidence_type: REFERENCE_ONLY}`; authorize the required nullable/check change only in a future forward-only migration |
| PS19 | Binary proof | Keep image/PDF upload disabled until a separate private Storage, MIME, size, path, malware, read authorization, retention and deletion contract is Owner approved |
| PS20 | Database security | Future RPC is authenticated `SECURITY DEFINER`, uses an empty or explicitly safe search path, performs all ownership checks itself, revokes `PUBLIC`/`anon`, and grants only `authenticated`; direct table writes remain denied |
| PS21 | Audit | Append exactly one `PAYMENT_PROOF_SUBMITTED` audit row with tenant, actor, transaction/proof IDs, evidence type and request ID; exclude reference, proof, contact, address and bank data |
| PS22 | Events | Emit no revenue or paid event on submission; `ORDER_PAID` remains a separately retryable post-verification service action |
| PS23 | Bounded response/errors | Return only operation, order/payment/transaction/proof IDs, `PENDING`, evidence type, payment deadline and `idempotency_reused`; map failures to allowlisted codes without row-existence leakage |
| PS24 | Validation/delivery gate | Require fresh replay, ownership/tenant denial, direct-write denial, normalization, duplicate/replay, active-attempt and submission-versus-expiry concurrency tests; Production, UI and provider activation remain separately gated |

## 3. Proposed Reference-Only Flow

```text
authenticated customer
  -> server resolves active profile, membership and customer link
  -> guarded boundary locks owned pending order and its payment aggregate
  -> validates deadline, canonical amount/currency and normalized reference
  -> claims PAYMENT_PROOF_SUBMIT idempotency
  -> creates one PENDING BANK_TRANSFER transaction
  -> creates one REFERENCE_ONLY proof review row with no binary path
  -> appends privacy-bounded PAYMENT_PROOF_SUBMITTED audit
  -> returns bounded pending result
```

This flow records a customer claim. It does not mark money received, change an
order, convert inventory, consume a coupon or emit `ORDER_PAID`.

## 4. Required Future Additive Schema Decisions

After Owner freeze, Part 2 may propose one forward-only migration that:

1. proves there is at most one current payment aggregate per order before adding
   an exact uniqueness constraint;
2. proves active pending-attempt cardinality before adding a partial unique
   constraint on `payment_transactions(payment_id)` for `PENDING` payment rows;
3. makes `payment_proofs.storage_path` nullable and adds a check requiring either
   a valid private storage path or exact `REFERENCE_ONLY` metadata; and
4. creates the guarded submission function with explicit revokes/grants.

No frozen migration is edited. No bucket or Storage policy is included.

## 5. Controlled Error Vocabulary

```text
AUTH_REQUIRED
MEMBERSHIP_REQUIRED
CUSTOMER_LINK_REQUIRED
CHECKOUT_NOT_ENABLED
ORDER_NOT_PAYABLE
PAYMENT_EXPIRED
PAYMENT_REFERENCE_INVALID
PAYMENT_REFERENCE_CONFLICT
PAYMENT_ATTEMPT_PENDING
PAYMENT_STATE_INCONSISTENT
IDEMPOTENCY_CONFLICT
PAYMENT_SUBMISSION_FAILED
```

Ownership failures may collapse to `ORDER_NOT_PAYABLE` at the application edge
to avoid revealing cross-tenant or other-customer existence.

## 6. Explicit Non-Scope

- Staff approval/rejection and settlement transitions, which belong to Parts
  1B and 1C.
- Binary proof upload, signed URLs, Storage access or legal deletion.
- Provider selection, credentials, API calls, webhooks, fees, refunds or payout.
- Partial payment, overpayment, underpayment, multiple simultaneous attempts or
  customer-selected amount/currency.
- Public checkout activation, Vercel rollout and Production migration apply.

## 7. Owner Approval

The Project Owner explicitly approved PS01-PS24 in full on 2026-08-01. Any
change requires a new explicit Owner decision record and must not silently alter
this frozen baseline. This approval authorizes Part 1B contract design only; it
does not authorize migration, RPC, Storage, UI, provider or Production work.
