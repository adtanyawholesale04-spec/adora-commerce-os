# Phase 1D Cart / Checkout / Payment Part 1 Owner Decision Table

**Task ID:** `PHASE-1D-CHECKOUT-PART1`
**Prepared Date:** 2026-07-31
**Owner Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / D01-D24 FROZEN
**Runtime:** Local design only; cart and checkout writes remain disabled
**Migration:** None authorized
**Production:** NOT AUTHORIZED / BLOCKED BY P16
**Approved Provider Spend:** USD 0

## Objective

Prepare exact safe values for the product, security and financial decisions
identified by the validated Phase 1D Part 0 audit. Owner approval of this table
will authorize Phase 1D Part 2 Business Rules and ER design only.

This document does not authorize a migration, protected Commerce Core write,
real payment, provider account, secret, webhook, public checkout route or
production activation.

## Frozen Decisions

The Owner approved all recommended values D01-D24 on 2026-07-31. These values
are frozen for Phase 1D Part 2 Business Rules and ER design.

| ID | Decision | Recommended safe value |
|---|---|---|
| D01 | First MVP scope | Product checkout only; service, package, appointment, booking and deposit flows remain deferred until canonical sources are approved |
| D02 | Cart tenancy | One cart belongs to exactly one organization; multi-store, multi-vendor, split-order and marketplace carts are deferred |
| D03 | Checkout identity | Require an authenticated profile with active same-tenant `organization_memberships` and `customer_profile_links`; guest checkout is deferred |
| D04 | Cart ownership and reuse | Server resolves at most one active `STOREFRONT` cart per organization/customer; browser-supplied customer or tenant identity is never trusted |
| D05 | Cart lifecycle and retention | Use existing cart states; expire an inactive open cart after 30 days, retain abandoned/expired cart records for 90 days, then remove or minimize non-ledger detail through a separately approved cleanup job |
| D06 | Price authority | Server recalculates canonical variant price, promotion, coupon, shipping and total on every mutation and final submission; browser totals are display-only |
| D07 | Stock behavior | Backorder is disabled; never silently reduce quantity; reject an unavailable line with a controlled result and require explicit customer correction |
| D08 | Reservation timing and expiry | Availability check occurs on cart mutation; atomic reservation occurs only on final checkout submission; default reservation is 15 minutes with an organization-configurable 5-60 minute bound |
| D09 | Promotion and coupon | Evaluation is server-only and deterministic; one coupon code per first MVP checkout; reserve atomically at submission, consume on confirmed order, release on expiry/failure; no direct redemption write |
| D10 | Points redemption | Defer points use until a separate guarded loyalty-tender contract proves balance locking, transaction ledger, idempotency and reversal |
| D11 | Shipping charge | First MVP uses one explicitly configured organization-level flat shipping charge in THB; missing configuration fails closed; live carrier quote, optimization, pickup and multi-package pricing are deferred |
| D12 | Address handling | Customer selects an active owned address or enters checkout-only contact/address data; copy the final value to immutable `order_addresses`; do not update `customers` or `customer_addresses` implicitly |
| D13 | Order creation timing | Create the canonical order once, atomically at final checkout submission, in `PENDING_CONFIRMATION`; it becomes `CONFIRMED` only after verified payment or approved manual confirmation |
| D14 | Initial payment path | Local simulation and manual-payment review only with no real transfer or provider spend; real provider selection, sandbox credentials and production activation require separate Owner approval |
| D15 | Manual payment confirmation | Only an active actor with `payment.verify` may confirm; require proof/reference, reason, stable request ID, optimistic state check, append-only audit and transaction-backed payment aggregation; direct status edit is forbidden |
| D16 | Future provider boundary | Use a provider-neutral server adapter, server-only secrets, verified signature, timestamp/replay guard, provider-event idempotency and sanitized failure storage; provider payload is never commerce truth by itself |
| D17 | Idempotency | Cart mutation, checkout submission, order creation, payment attempt, confirmation and webhook each require a scoped stable request key; matching retry returns the original result and conflicting reuse fails closed |
| D18 | Membership after purchase | Checkout never auto-creates organization membership, customer row or profile link; store join remains a separate explicit guarded flow |
| D19 | Events | Freeze central events `checkout_started`, `checkout_completed`, `order_paid` and `payment_failed`; map attribution to existing `ORDER_PLACED`/`ORDER_PAID` only through a reviewed service boundary with minimal metadata |
| D20 | Financial history | `payment_transactions` is the money-movement evidence; order/payment aggregates are derived transactionally; corrections use reversal/refund records and never silently rewrite confirmed history |
| D21 | Entitlement | Add exact feature code `storefront.checkout`; default deny when entitlement is absent, inactive, expired or disabled; server rechecks at every protected step |
| D22 | Privacy and consent | Store only checkout-required contact/address data; never place secrets, full provider payloads or payment proof in events/audit; checkout processing does not grant marketing consent |
| D23 | Failure recovery | One database transaction covers cart finalization, stock reservation, coupon reservation, order and initial payment record; pre-commit failure rolls back all, post-commit provider failure records `FAILED` and uses explicit compensation without deleting history |
| D24 | Delivery gate | Build and validate locally with simulated/manual payment only; real provider, production migration, public checkout and Vercel activation remain blocked until security, concurrency, recovery QA, P16 and separate rollout approval pass |

## Recommended First-MVP Flow

```text
Published product detail
  -> authenticated customer adds/updates cart
  -> server revalidates tenant, product, price and availability
  -> customer selects address and submits checkout
  -> one transaction recalculates totals, reserves stock/coupon,
     creates PENDING_CONFIRMATION order and initial payment record
  -> local simulated/manual review records a payment transaction
  -> payment.verify confirms payment with audit/idempotency
  -> order becomes CONFIRMED and reservations become allocations
  -> existing fulfillment/shipping/tracking workflows continue
```

No step grants direct browser write access to Commerce Core tables.

## Decision Consequences

### Canonical Sources Reused

```text
organizations
organization_storefronts
products
product_variants
inventory_balances
inventory_reservations
carts
cart_items
cart_events
customers
customer_profile_links
customer_addresses
promotion and coupon sources
orders
order_items
order_addresses
order_status_history
payments
payment_transactions
payment_proofs
fulfillment and shipping sources
attribution_events
audit_logs
organization_entitlements
```

### Part 2 Design Candidates

Part 2 may determine the minimum additive design for:

```text
checkout orchestration/session lifecycle
organization checkout settings
provider-neutral payment request/reference
scoped idempotency evidence
checkout event persistence or approved event mapping
guarded customer cart/checkout/payment-confirmation operations
```

These are design candidates, not approved table or function names. Part 2 must
first prove which requirements can safely reuse existing columns and append-only
audit evidence.

## Control Matrix

| Control | Frozen direction after Owner approval |
|---|---|
| Migration | Additive and forward-only only after separate Part 2 freeze and Part 3 instruction |
| Event | Required for checkout completion and payment success/failure; minimal allowlisted metadata |
| Audit | Required for checkout submission, order creation, payment review, confirmation, failure and compensation |
| Ledger | Existing inventory and loyalty ledgers remain authoritative; payment transaction history is mandatory and reversal-based |
| Consent | Checkout processing remains separate from marketing consent; no implicit opt-in |
| Entitlement | `storefront.checkout`, default deny and server-enforced |

## Forbidden Interpretations

- Approval does not enable a public cart or checkout route.
- A pending order is not paid or confirmed.
- A payment provider callback is not trusted without signature, replay and
  idempotency validation.
- A cart price or total from the browser is never authoritative.
- A Storefront purchase does not automatically create membership or consent.
- `payment_status` must not be selected manually without transaction evidence.
- Failed checkout must not leave hidden stock/coupon holds or delete financial
  history.
- Existing frozen migrations must not be edited.
- Service, booking, split payment, escrow, automatic commission and payout are
  not included.

## Owner Approval

The Project Owner explicitly approved all recommended values D01-D24 on
2026-07-31. Any change requires a new explicit Owner decision record and must
not silently alter this frozen baseline.

This approval authorizes Part 2 contract design only:

```text
Phase 1D Part 1: OWNER APPROVED / FROZEN
Phase 1D Part 2: READY
migration: NOT AUTHORIZED
protected cart/order writes: NOT AUTHORIZED
real payment/provider work: NOT AUTHORIZED
production activation: BLOCKED BY P16
```

## Next Gate

Phase 1D Part 2 Business Rules and ER addendum design is **READY**. Part 2 must
translate D01-D24 into exact lifecycle, calculation, tenant, RLS, permission,
event, audit, ledger, consent, entitlement, idempotency and failure contracts.
It must stop again for Owner approval before any migration is generated.
