# Phase 1D Cart / Checkout / Payment Part 0 Repository And Dependency Audit

**Task ID:** `PHASE-1D-CHECKOUT-PART0`
**Audit Date:** 2026-07-31
**Status:** VALIDATED / OWNER DECISIONS REQUIRED / IMPLEMENTATION BLOCKED
**Runtime:** Audit only; no cart, checkout or payment runtime enabled
**Migration:** Not required or authorized for Part 0
**Production:** NOT AUTHORIZED / BLOCKED BY P16
**Approved Provider Spend:** USD 0

## Objective

Determine which existing ACOS Commerce Core sources can support a safe
single-store Storefront cart, checkout and payment path, and identify every
decision or missing boundary that must be frozen before protected commerce or
financial implementation begins.

Part 0 changes no schema, frozen migration, RLS policy, permission, payment
provider, financial state, Storefront runtime or production configuration.

## Evidence Reviewed

The audit follows:

1. `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`;
2. `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`;
3. `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`;
4. `docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_AI_EXECUTION_PROMPT.md`;
5. Phase 1D in
   `docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_GROWTH_GUIDE.md`;
6. `reference/BUSINESS_RULES_V13.md`, which is review evidence with
   `PROPOSED` rules and is not a frozen Phase 1D rule set;
7. the frozen schema baseline and forward-only migrations through Phase 1C;
   and
8. the implemented Storefront, Customer Portal, inventory, promotion, order,
   payment, fulfillment, shipping, attribution and audit boundaries.

## Canonical Source Map

| Capability | Canonical source or evidence | Part 0 disposition |
|---|---|---|
| Store and tenant | `organizations`, `organization_storefronts` | REUSE; checkout must resolve the published Storefront to exactly one organization |
| Public product and variant selection | Phase 1C guarded Storefront read RPCs, `products`, `product_variants`, `storefront_product_listings` | REUSE; never accept browser-supplied price, cost, tenant or publication truth |
| Inventory availability | `inventory_balances` | REUSE through a bounded server check; do not expose warehouse rows or exact stock publicly |
| Inventory hold | `inventory_reservations`, `reserve_inventory`, `release_inventory_reservation`, `convert_reservation_to_allocation` | REUSE CONCEPT; existing authenticated staff wrappers require `inventory.adjust` and are not a customer checkout boundary |
| Cart | `carts`, `cart_items`, `cart_events` | REUSE as the only cart masters; no customer-facing ownership, idempotency or guarded mutation contract exists |
| Purchase grouping | `purchase_sessions`, `purchase_session_events`, `purchase_session_orders` | REUSE only if Part 1 freezes its role; it is not a substitute for a checkout orchestration source |
| Customer | `customers`, `customer_profile_links`, `organization_memberships` | REUSE; active same-tenant ownership must be proven and no email/phone inference or duplicate customer is allowed |
| Address | `customer_addresses`, `order_addresses` | REUSE; selected or submitted checkout data must become an immutable order snapshot without silently rewriting the customer master |
| Promotion | `promotion_campaigns` and related rule/benefit tables | REUSE only through a reviewed server evaluator; no approved checkout calculation boundary exists |
| Coupon | `coupons`, `coupon_redemptions` | REUSE; reservation/consumption/release must be atomic and retry-safe |
| Loyalty | `loyalty_accounts`, append-only `loyalty_transactions` | REUSE later; redemption is financial tender and has no approved guarded checkout boundary |
| Order | `orders`, `order_items`, `order_addresses`, `order_status_history` | REUSE as the only order masters; no atomic Storefront order-creation service exists |
| Payment | `payments`, `payment_transactions`, `payment_proofs` | REUSE as the only payment masters; current records require an order and no provider-intent or customer payment-request boundary exists |
| Refund | `refunds`, `refund_transactions`, `api_process_refund` | REUSE after payment only; refund is outside initial checkout creation |
| Fulfillment and tracking | `fulfillments`, `shipments`, `tracking_events` and guarded shipping wrappers | REUSE after order confirmation; do not duplicate shipment or tracking sources |
| Attribution | append-only `attribution_events`, guarded service RPC | REUSE for approved `ORDER_PLACED` and `ORDER_PAID`; no frozen checkout-started event exists |
| Audit | append-only `audit_logs` | REUSE for every protected transition and idempotency correlation |
| Entitlement | `features`, `organization_entitlements`, Phase 1C Storefront entitlement | REUSE framework; an exact checkout/payment entitlement code is not frozen |

No new customer, product, variant, inventory, cart, order, payment, refund,
fulfillment, shipment, coupon or loyalty master may be created.

## Repository Gaps

| Gap | Evidence | Required resolution |
|---|---|---|
| Frozen Phase 1D rules | No Phase 1D Business Rules document exists | Part 1 decisions followed by a separately approved Business Rules freeze |
| Frozen Phase 1D ER | No Phase 1D ER addendum exists | Design only after Part 1; do not infer additive entities |
| Checkout orchestration | No canonical checkout session source or guarded service exists | Decide whether an additive checkout session is required and define its lifecycle |
| Cart ownership | `carts` has customer context but no authenticated profile or opaque session ownership contract | Freeze authenticated/guest scope and server-side ownership proof |
| Customer-facing cart writes | Generic tenant RLS and staff inventory wrappers are not a customer boundary | Add a guarded server contract; never grant direct browser writes to core tables |
| Atomic conversion | No transaction composes price, promotion, coupon, stock, address, order and payment state | Define one retry-safe orchestration boundary with rollback/compensation rules |
| Pricing engine | Promotion data exists but no approved checkout evaluator is implemented | Freeze calculation order, snapshots, rounding and conflict behavior |
| Shipping charge | Shipping operations exist but no checkout rate/configuration source is frozen | Freeze the first-MVP shipping policy before calculating totals |
| Payment request before order | `payments.order_id` is mandatory | Freeze order timing or approve an additive provider-neutral request/intention reference |
| Provider boundary | No payment provider adapter, secret destination, webhook verifier or provider idempotency map exists | Owner selection and separate protected/provider review required |
| Manual confirmation | `payment.verify` exists, but no guarded confirmation workflow or audit contract exists | Freeze actor, evidence, transition and duplicate-confirmation behavior |
| Event coverage | Current attribution allowlist starts at order placement/payment | Freeze checkout and payment lifecycle event names and payload allowlists |
| Financial invariants | Payment aggregates and order payment state are mutable but no settlement aggregator is approved | Define transaction-derived totals, immutable history and reconciliation rules |
| Store membership side effect | No approved order-to-membership creation contract exists | Explicit Owner decision; default must be no implicit membership |
| Service/booking | No canonical frozen service, package, appointment or booking source exists | Defer from the first product checkout; never invent parallel masters |

The generic organization-member RLS baseline and authenticated Admin grants do
not authorize customer checkout. A future browser route must call a reviewed
server boundary that re-resolves tenant, customer, product, price, stock,
promotion, address and entitlement on every protected step.

## Dependency Order

```text
Part 0 repository audit
  -> Part 1 Owner Decision Freeze
  -> Part 2 Phase 1D Business Rules and ER addendum
  -> Part 3 additive migration and guarded orchestration contract
  -> Part 4 local cart/checkout UI
  -> Part 5 local manual/sandbox payment path
  -> Part 6 end-to-end, security, concurrency and recovery QA
  -> production remains blocked until P16 and separate rollout approval
```

Skipping Part 1 or Part 2 would require guessing protected commercial and
financial behavior and is forbidden.

## Part 1 Owner Decision Inputs

The following items are decision inputs, not approved rules:

| ID | Decision to freeze | Safe starting direction for Owner review |
|---|---|---|
| D01 | First MVP scope | Product checkout only; defer service, package and booking |
| D02 | Cart tenancy | One organization per cart; multi-store cart deferred |
| D03 | Checkout identity | Authenticated customer with active same-tenant customer link; guest checkout deferred |
| D04 | Cart ownership and reuse | One server-resolved active Storefront cart per customer and organization |
| D05 | Cart lifetime | Explicit open/abandoned/expired lifecycle with bounded retention |
| D06 | Price authority | Server recalculates from canonical sources on every mutation and before conversion |
| D07 | Stock behavior | No backorder and no silent quantity reduction; atomic availability recheck required |
| D08 | Reservation timing | Reserve only at the approved checkout step with configurable expiry; never hard-code policy silently |
| D09 | Promotion and coupon | Server-only evaluation with deterministic snapshots and atomic coupon reservation |
| D10 | Points redemption | Defer until a guarded loyalty-tender boundary is separately frozen |
| D11 | Shipping charge | Use one explicitly configured first-MVP policy; no inferred carrier optimization |
| D12 | Address handling | Use or capture a customer-owned address and copy it to `order_addresses`; no implicit CRM overwrite |
| D13 | Order creation timing | Freeze whether a draft/pending order precedes payment or an additive request precedes order creation |
| D14 | Payment path | Local manual/sandbox path first; no real provider or spend without separate approval |
| D15 | Manual confirmation | Require `payment.verify`, evidence, reason, idempotency and audit; no direct status edit |
| D16 | Provider integration | Provider-neutral adapter, server-only secrets, signed webhook and provider-event deduplication |
| D17 | Order and request idempotency | Stable request key with conflict detection; duplicate retries return the original result |
| D18 | Store membership after purchase | No automatic membership unless a separate guarded policy is approved |
| D19 | Events | Freeze checkout, order and payment lifecycle names; retain minimal allowlisted payloads |
| D20 | Financial history | Transaction-derived payment state, immutable evidence and explicit reversal path |
| D21 | Entitlement | Default deny with an exact checkout feature code and fail-closed server check |
| D22 | Privacy and retention | Minimize contact/address/cart data and freeze expiry, cleanup and audit retention |
| D23 | Failure recovery | Define atomic rollback or compensation for stock, coupon, order and payment failures |
| D24 | Delivery gate | Local-only until security/concurrency/recovery QA passes; production remains blocked by P16 |

## Migration And Control Classification

| Control | Part 0 | Expected later requirement |
|---|---|---|
| Migration | No | Likely additive after Owner-frozen rules/ER; never edit frozen migrations |
| Event | No new event | Yes for approved checkout, order and payment lifecycle transitions |
| Audit | Documentation evidence only | Yes for protected cart conversion, manual payment, order and compensation transitions |
| Ledger | No | Inventory, coupon, loyalty and payment history must reuse or extend approved immutable transaction evidence |
| Consent | No new consent | Checkout processing and marketing consent must remain distinct; provider messaging rechecks consent/suppression |
| Entitlement | No new seed | Yes; exact default-deny code requires Owner freeze |

## Validation Required Before Runtime

1. Authenticated customer ownership, tenant isolation and cross-store denial.
2. Direct `anon` and authenticated browser writes to protected core tables
   remain denied.
3. Canonical server revalidation of publication, product, variant, price,
   promotion, coupon, stock, customer, address and entitlement.
4. Duplicate and conflicting idempotency requests, concurrent stock attempts
   and coupon races.
5. Atomic success and rollback/compensation across cart, reservation, order and
   payment failure points.
6. No overselling, negative balances, silent quantity reduction or expired-link
   payment acceptance.
7. No duplicate order, payment transaction, coupon redemption or financial
   event from retries/webhooks.
8. Payment success/failure event and append-only audit evidence with no secret,
   address, proof or provider-payload leakage.
9. Order totals and payment state reconcile from approved transaction sources;
   no silent historical rewrite.
10. Storefront order links the correct organization and canonical customer.
11. Thai/English, light/dark, mobile/desktop, keyboard, loading, expired,
    unavailable, payment-pending, success and failure UI states.
12. Fresh migration replay, RLS/security, concurrency, workflow, lint,
    typecheck, full tests, build and browser QA.
13. Production remains disabled until P16 and a separate rollout/rollback
    approval are complete.

## Gate Result

Phase 1D Part 0 is **complete**. Core sources are reusable and duplication is
forbidden, but Phase 1D implementation is **BLOCKED** because protected
commercial and financial behavior is not frozen and no customer-facing
checkout orchestration boundary exists.

Part 1 Owner Decision Freeze for D01-D24 is **ready**. No migration, provider
integration, protected write, production apply or public checkout route is
authorized by this audit.
