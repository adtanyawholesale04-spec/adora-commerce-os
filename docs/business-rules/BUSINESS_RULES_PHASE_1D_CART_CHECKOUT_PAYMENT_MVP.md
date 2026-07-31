# Business Rules Phase 1D Cart / Checkout / Payment MVP

**Task ID:** `PHASE-1D-CHECKOUT-PART2-BUSINESS-RULES`
**Status:** OWNER APPROVED / FROZEN FOR PART 3
**Decision Source:** Owner-approved D01-D24 on 2026-07-31
**Owner Approval Date:** 2026-08-01
**Migration:** Not authorized
**Runtime:** Not authorized
**Production:** Blocked by P16 and a separate rollout approval

## 1. Scope And Authority

### CO-BR-001 - Product-only scope

The first MVP sells existing active product variants from one published
Storefront. Service, package, booking, split payment, escrow, commission,
payout, loyalty tender and guest checkout are deferred.

### CO-BR-002 - Canonical sources

The flow reuses the existing organization, Storefront, product, variant,
inventory, customer, address, cart, promotion, coupon, order, payment,
fulfillment, attribution, audit and entitlement sources. It must not create a
parallel customer, catalog, order, payment or inventory master.

### CO-BR-003 - Server authority

Browser values are intent only. The server resolves organization, customer,
variant, price, stock, promotion, coupon, shipping, totals, entitlement and
state from canonical sources before every protected mutation.

## 2. Tenant And Customer Identity

### CO-BR-004 - Single-organization cart

Every Storefront cart belongs to exactly one `organization_id`. Items,
customer, addresses, promotion, coupon, reservation, order and payment must
resolve to that same tenant. Cross-tenant input fails without partial writes.

### CO-BR-005 - Authenticated checkout identity

Checkout requires an authenticated profile, active same-tenant organization
membership, active `customer_profile_links` ownership and an active canonical
customer. Email, phone, cookie or URL parameters never establish ownership.

### CO-BR-006 - No implicit identity side effects

Cart and checkout never create an organization membership, customer, customer
profile link or marketing consent. Missing identity state fails closed and is
resolved by a separately approved guarded workflow.

### CO-BR-007 - Customer merge handling

A linked customer in `MERGED`, `BLOCKED` or `ARCHIVED` state cannot checkout.
The caller must re-resolve an active canonical customer through the approved
identity boundary; checkout does not follow or repair merge links itself.

## 3. Cart Lifecycle

### CO-BR-008 - Storefront cart source

Storefront carts use `carts.source = STOREFRONT`. Only one active cart in
`OPEN`, `READY` or `RESERVED` may exist for one organization and customer.
Concurrent creation must return the existing cart or one deterministic result.

### CO-BR-009 - Cart states

The existing cart states are used as follows:

```text
OPEN -> READY -> RESERVED -> CONVERTED
OPEN/READY/RESERVED -> CANCELLED
OPEN/READY -> ABANDONED
OPEN/READY/RESERVED -> EXPIRED
```

`CONVERTED`, `CANCELLED`, `ABANDONED` and `EXPIRED` are terminal for customer
mutation. A retry of the successful conversion returns the original order.

### CO-BR-010 - Cart lifetime and retention

An open cart expires after 30 days without a customer mutation. Abandoned and
expired carts remain available for operational evidence for 90 days, after
which a separately approved cleanup job may minimize non-financial payloads.
Converted carts and references required by orders are retained with the order.

### CO-BR-011 - Cart item mutation

Adding, changing or removing an item requires an `OPEN` cart, positive bounded
quantity, same-tenant active published product/variant and current checkout
entitlement. The server recalculates every line and cart total atomically.

### CO-BR-012 - No backorder or silent adjustment

Requested quantity must be fully available. Insufficient stock rejects the
mutation or checkout with a stable unavailable result; the system never
silently reduces quantity or permits backorder.

## 4. Pricing, Promotion And Shipping

### CO-BR-013 - Price calculation order

The server calculates in this order:

```text
eligible current variant price
  -> deterministic item promotion benefits
  -> deterministic order/coupon benefit
  -> configured flat shipping charge
  -> shipping discount, if explicitly eligible
  -> tax total (zero until a tax rule is separately frozen)
  -> grand total
```

All monetary arithmetic uses the order currency and rounds to two decimal
places using half-up rounding at each persisted line and aggregate boundary.

### CO-BR-014 - Total invariants

```text
line_total = quantity * applied_unit_price - line_discount_total
subtotal = sum(quantity * original_unit_price)
grand_total = subtotal - item_discount_total - order_discount_total
              + shipping_charge - shipping_discount_total + tax_total
amount_due = max(grand_total - amount_paid, 0)
```

Negative line totals, discounts above their eligible base or currency mismatch
fail closed.

### CO-BR-015 - Price snapshot

`cart_items.pricing_snapshot_json` contains a minimal, versioned server snapshot
of evaluated price inputs and applied rule identifiers. Final order lines and
`promotion_applied_benefits` preserve the immutable commercial result. Cost,
margin, secrets and private customer data are forbidden in the snapshot.

### CO-BR-016 - Promotion eligibility

Only same-tenant active campaigns with one effective published/active version
may be evaluated. Rule ordering is deterministic by campaign priority, rule
priority and stable identifier. Unsupported or ambiguous rules fail closed.

### CO-BR-017 - One coupon in MVP

At most one normalized coupon code may be applied. The server checks tenant,
status, effective dates, customer restriction and usage limits. Coupon
reservation, consumption and release use existing `coupon_redemptions` and are
atomic with checkout state.

### CO-BR-018 - Shipping configuration

Each organization has one non-negative flat shipping charge in THB and a
reservation duration of 15 minutes by default, configurable from 5 through 60
minutes. Missing or inactive checkout configuration blocks final submission.
Live carrier quote, pickup and multi-package pricing are deferred.

## 5. Checkout And Inventory

### CO-BR-019 - Checkout start

Starting checkout revalidates identity, Storefront publication, organization,
entitlement, cart ownership and non-empty cart, then changes `OPEN` to `READY`
and appends `checkout_started`. No stock or coupon is reserved at this step.

### CO-BR-020 - Address validation and snapshot

The customer selects an active same-tenant owned address or submits
checkout-only contact/address fields. Required values are recipient, phone,
address line 1 and country. The final normalized value is copied to immutable
`order_addresses`; checkout never updates `customers` or `customer_addresses`.

### CO-BR-021 - Atomic final submission

One database transaction must lock and revalidate the cart, variant inventory,
coupon limits and idempotency record; recalculate totals; create reservations;
create one order and its immutable lines/address; create one payment aggregate;
append histories/events/audit; and mark the cart `CONVERTED`.

### CO-BR-022 - Reservation behavior

Final submission creates active `inventory_reservations` for the full quantity
with one bounded expiry. Availability updates and reservation rows must remain
consistent under concurrent checkout attempts. Reservation expiry or failure
releases stock and coupon through an explicit idempotent operation.

### CO-BR-023 - Reservation conversion

Verified payment or approved manual confirmation converts each reservation to
an inventory allocation for the matching order item in the same transaction as
order confirmation. Conversion is all-or-nothing and never duplicates an
allocation on retry.

## 6. Order And Payment Lifecycle

### CO-BR-024 - Order creation

Final submission creates the canonical order once with:

```text
source = STOREFRONT
order_status = PENDING_CONFIRMATION
payment_status = UNPAID
fulfillment_status = UNFULFILLED
```

The order becomes `CONFIRMED` only after verified payment or an approved manual
confirmation. `order_status_history` records each transition.

### CO-BR-025 - Initial payment aggregate

Exactly one existing `payments` row is created for the order with expected
amount equal to the order grand total, received amount zero and matching
currency. The aggregate is derived from successful, non-reversed payment
transactions and is not independently edited by the browser.

### CO-BR-026 - Local payment path

Part 2 permits design for local simulation and manual bank-transfer review
only. It authorizes no provider selection, credential, network call, transfer,
fee or production payment.

### CO-BR-027 - Manual payment submission

A customer may submit a stable payment reference and optional proof only for
their own pending same-tenant order before `payment_due_at`. The server creates
a `PENDING` payment transaction and proof record; duplicate reference or
request returns the existing result.

### CO-BR-028 - Manual payment verification

Only an active same-tenant actor with `payment.verify` may approve or reject a
pending payment. Verification requires a reason, stable request ID, optimistic
state check and proof/reference evidence. Direct status or amount edits are
forbidden.

### CO-BR-029 - Successful payment transition

Successful payment records immutable transaction evidence, recalculates
payment/order aggregates, confirms the order when fully paid, converts stock
reservations, consumes the coupon, appends status/audit evidence and emits
`order_paid` exactly once. Partial payment does not confirm the MVP order.

### CO-BR-030 - Failure, expiry and reversal

A rejected, failed or expired payment never confirms an order. Expiry moves a
still-pending order to `PAYMENT_EXPIRED`, releases reservations and coupon and
retains all history. Corrections use reversal/refund records; successful
financial evidence is never silently rewritten or deleted.

## 7. Idempotency, Events And Audit

### CO-BR-031 - Scoped idempotency

Cart mutation, checkout start, checkout submission, payment submission,
payment verification, expiry/compensation and future webhook operations require
a caller-supplied UUID request ID. Uniqueness is scoped by organization,
operation and actor/customer context.

### CO-BR-032 - Retry and conflict result

The server stores a canonical request hash and bounded result reference. A
matching retry returns the original result; reuse with different intent fails
with `IDEMPOTENCY_CONFLICT`. An in-progress duplicate does not execute twice.

### CO-BR-033 - Commerce events

The central lifecycle names are:

```text
checkout_started
checkout_completed
order_paid
payment_failed
```

Checkout events use `cart_events`. `ORDER_PLACED` and `ORDER_PAID` attribution
are emitted only through the existing reviewed attribution service. Event
metadata may contain opaque entity IDs, currency, bounded amount and source,
but never address, phone, email, proof, secret or provider payload.

### CO-BR-034 - Audit actions

The append-only `audit_logs` source records:

```text
STOREFRONT_CHECKOUT_SUBMITTED
STOREFRONT_ORDER_CREATED
PAYMENT_PROOF_SUBMITTED
PAYMENT_VERIFIED
PAYMENT_REJECTED
CHECKOUT_COMPENSATED
CHECKOUT_EXPIRED
```

Each record includes tenant, actor type/profile where applicable, entity,
reason for staff decisions, request ID and bounded before/after state.

## 8. Permission, RLS, Entitlement And Privacy

### CO-BR-035 - Customer guarded boundary

Customer cart, checkout and payment-proof actions run through reviewed server
services and guarded database functions. They prove active profile, membership,
customer link, tenant ownership and exact resource state. Direct browser writes
to Commerce Core tables remain denied.

### CO-BR-036 - Staff permission boundary

Customer actions do not inherit staff permissions. Manual payment review
requires `payment.verify`; operational reads keep their existing permission
requirements. `service_role` is not a substitute for application-level
authorization checks.

### CO-BR-037 - Checkout entitlement

Protected steps require an active enabled organization entitlement for exact
feature code `storefront.checkout`. Missing, inactive, disabled, not-yet-valid
or expired entitlement denies the action. Every protected step rechecks it.

### CO-BR-038 - RLS posture

All additive tenant tables require `organization_id`, composite same-tenant
foreign keys where possible, RLS and revoked direct writes for `PUBLIC`, `anon`
and `authenticated`. Guarded functions use a fixed search path and exact grants.

### CO-BR-039 - Privacy and consent separation

Only checkout-required contact/address and minimal payment evidence are stored.
Checkout is contractual processing and never grants marketing consent. Events,
audit and idempotency results must exclude contact/address/proof/provider
payload data.

### CO-BR-040 - Retention boundary

Order, payment transaction, proof metadata, audit, coupon and inventory history
follow their financial/legal retention sources and are not removed by cart
cleanup. Proof binary retention and legal deletion require a later approved
policy; Part 2 does not invent one.

## 9. Recovery And Delivery Gates

### CO-BR-041 - Pre-commit rollback

Any failure before final transaction commit rolls back cart transition,
reservation, coupon, order, payment, event and audit success evidence together.
No hidden hold or partial order may remain.

### CO-BR-042 - Post-commit compensation

A failure after commit records an explicit failed attempt and runs an
idempotent compensation operation. Compensation releases eligible stock and
coupon holds, retains the pending/failed order and payment history, and appends
failure/audit evidence.

### CO-BR-043 - Concurrency invariants

Locks and unique constraints must prevent duplicate active carts, overselling,
coupon overuse, duplicate order conversion, duplicate payment evidence and
double compensation. Tests must exercise competing transactions, not only
serial requests.

### CO-BR-044 - Local and production gate

Development remains local with simulated/manual payment. Migration generation,
protected runtime, public checkout, provider integration and production apply
each require their later explicit gate. Production remains blocked by P16 and
separate rollout/rollback approval.

## 10. Part 2 Exit Gate

Part 2 exits only after the Owner approves:

1. rules CO-BR-001 through CO-BR-044;
2. reuse of every canonical Core master;
3. the two minimum additive entities in the ER addendum;
4. exact status, calculation, idempotency, event and audit contracts;
5. feature code `storefront.checkout` and existing `payment.verify` boundary;
6. the no-checkout-session and no-provider-table MVP decisions; and
7. migration, runtime, provider and production gates remaining closed.

## 11. Owner Approval

The Project Owner approved CO-BR-001 through CO-BR-044 in full on 2026-08-01.
The scope, canonical reuse, lifecycle, calculation, inventory, promotion,
shipping, order, payment, idempotency, event, audit, permission, entitlement,
privacy, recovery and delivery rules are frozen for Phase 1D Part 3.

This approval authorizes Part 3 migration and guarded orchestration **design
only after an explicit Part 3 instruction**. It does not authorize migration
generation/application, protected runtime, a real payment provider, public
checkout or Production activation by itself.
