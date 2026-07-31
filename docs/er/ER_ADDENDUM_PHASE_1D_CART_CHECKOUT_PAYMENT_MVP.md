# ER Addendum Phase 1D Cart / Checkout / Payment MVP

**Task ID:** `PHASE-1D-CHECKOUT-PART2-ER`
**Status:** OWNER APPROVED / FROZEN FOR PART 3
**Depends On:** Owner-frozen D01-D24 and proposed CO-BR-001 to CO-BR-044
**Owner Approval Date:** 2026-08-01
**Migration:** Not authorized
**Runtime:** Not authorized

## Scope

Define the minimum additive persistence needed for authenticated, product-only,
single-Storefront checkout with local simulated/manual payment. Existing
Commerce Core tables remain canonical and frozen migrations are unchanged.

## Relationship Map

```text
organizations
  -> organization_checkout_settings
  -> organization_entitlements -> features(code = storefront.checkout)
  -> customers <- customer_profile_links <- profiles/auth.users
  -> carts -> cart_items -> product_variants -> inventory_balances
           -> cart_events
           -> inventory_reservations
           -> coupon_redemptions -> coupons
           -> orders -> order_items
                     -> order_addresses
                     -> order_status_history
                     -> payments -> payment_transactions -> payment_proofs
                     -> inventory_allocations
                     -> fulfillment/shipping sources

guarded operations
  -> commerce_idempotency_keys
  -> audit_logs
  -> attribution_events through the existing service boundary
```

No checkout-session table is proposed. The active cart is the pre-order
orchestration source; one atomic final submission creates the order and payment
aggregate.

## Reused Status Catalog

```text
cart:
  OPEN, READY, RESERVED, CONVERTED, ABANDONED, EXPIRED, CANCELLED

order:
  PENDING_CONFIRMATION, CONFIRMED, PAYMENT_EXPIRED, CANCELLED

order payment:
  UNPAID, PAID

payment transaction:
  PENDING, SUCCEEDED, FAILED, CANCELLED, REVERSED

inventory reservation:
  ACTIVE, CONVERTED, EXPIRED, RELEASED, CANCELLED

coupon redemption:
  RESERVED, CONSUMED, RELEASED, REVERSED
```

Existing broader statuses remain available to other Core workflows. Phase 1D
does not add or alter frozen check constraints in Part 2.

## Proposed Additive Entities

### organization_checkout_settings

One fail-closed checkout configuration row per organization.

| Column | Rule |
|---|---|
| id | UUID primary key |
| organization_id | required FK `organizations`; unique |
| status | `ACTIVE` or `INACTIVE`; default `INACTIVE` |
| currency_code | exactly `THB` for MVP |
| flat_shipping_charge | numeric(14,2), non-negative |
| reservation_minutes | integer from 5 through 60; default 15 |
| payment_due_minutes | integer from 5 through 1440; proposed default 60 |
| created_by / updated_by | nullable FK `profiles`; actor evidence |
| created_at / updated_at | managed timestamps |

Required keys:

```text
unique (organization_id)
unique (organization_id, id)
```

Absence or `INACTIVE` blocks checkout submission. This entity does not contain
provider credentials, bank account details, tax rules, carrier rates, theme,
subscription or plan configuration.

### commerce_idempotency_keys

Durable evidence for protected commerce requests.

| Column | Rule |
|---|---|
| id | UUID primary key |
| organization_id | required tenant FK |
| operation | approved bounded operation code |
| request_id | client-generated UUID |
| actor_profile_id | nullable FK `profiles`; required for authenticated customer/staff actions |
| customer_id | nullable same-tenant FK `customers`; required for customer checkout actions |
| request_hash | SHA-256 digest of canonical allowlisted intent |
| state | `IN_PROGRESS`, `SUCCEEDED` or `FAILED` |
| result_entity_type | nullable allowlisted type |
| result_entity_id | nullable UUID of cart, order, payment or transaction |
| failure_code | nullable sanitized stable code |
| started_at / completed_at | immutable lifecycle timestamps |
| expires_at | nullable cleanup boundary; never invalidates referenced financial evidence |

Required constraints:

```text
unique (organization_id, operation, request_id)
foreign key (organization_id, customer_id)
  -> customers(organization_id, id)
state = IN_PROGRESS -> completed_at is null
state in (SUCCEEDED, FAILED) -> completed_at is not null
request_hash is fixed length and cannot be changed
```

The table stores no full request/response body, address, contact, proof,
provider payload, credential or secret. A succeeded financial key cannot be
deleted by ordinary cleanup.

Proposed operation allowlist:

```text
CART_CREATE
CART_ITEM_SET
CART_ITEM_REMOVE
CHECKOUT_START
CHECKOUT_SUBMIT
PAYMENT_PROOF_SUBMIT
PAYMENT_VERIFY
PAYMENT_REJECT
CHECKOUT_EXPIRE
CHECKOUT_COMPENSATE
```

Future provider webhook operation codes require a separate provider contract.

## Reused Entities And Exact Role

### carts, cart_items and cart_events

- `carts` remains the sole cart master and stores server-derived totals.
- `source = STOREFRONT` identifies this channel.
- one proposed partial unique index enforces one active cart per organization
  and customer for `OPEN`, `READY` and `RESERVED`.
- `cart_items` stores current calculated price and a bounded pricing snapshot.
- `cart_events` stores `checkout_started` and `checkout_completed` with minimal
  metadata.

No profile ownership column is added. Ownership is resolved at request time
through the canonical active `customer_profile_links` relation.

### inventory_balances, inventory_reservations and inventory_allocations

Balances remain authoritative. Final submission creates same-tenant active
reservations linked to cart and order; confirmation converts them to matching
order-item allocations. Existing movement/allocation sources remain the stock
ledger and no checkout inventory table is added.

Migration design must add the minimum indexes/uniqueness needed to ensure one
active reservation result per order item without changing historical rows.

### promotions, coupons and redemptions

Existing campaign/rule/action/benefit sources calculate the commercial result.
`coupon_redemptions` carries reservation, consumption, release and reversal.
A future migration may add only indexes or idempotency constraints proven
necessary for one active coupon use per cart/order; no coupon master is added.

### orders and order snapshots

`orders` remains the sole order master. `order_items`, `order_addresses`,
`promotion_applied_benefits` and `order_status_history` preserve the immutable
commercial and lifecycle result. `source_cart_item_id` traces each line to the
converted cart.

Part 3 must establish one deterministic link from a converted Storefront cart
to its order without creating a second order master. The preferred additive
constraint is an explicit same-tenant cart/order conversion reference only if
existing item references cannot prove uniqueness safely.

### payments, payment_transactions and payment_proofs

`payments` remains one aggregate per order. `payment_transactions` is the
append-only money evidence and `payment_proofs` is review evidence. Aggregates
are transactionally derived from successful non-reversed transactions.

No provider-intent table is proposed for the local/manual MVP. Provider-neutral
request/reference persistence is deferred until a real provider is selected
and separately approved.

### order_addresses and customer_addresses

An active owned `customer_addresses` row may be selected as input, but its
normalized value is copied to `order_addresses`. The order snapshot does not
retain a mutable address foreign key and checkout never modifies CRM data.

### features and organization_entitlements

Proposed additive feature seed:

```text
features.code = storefront.checkout
features.feature_type = BOOLEAN
features.status = ACTIVE
```

An enabled currently valid entitlement is mandatory at every protected step.
No plan mapping, commercial price or automatic entitlement grant is approved.

### audit_logs and attribution_events

`audit_logs` records the approved Part 2 action catalog and request ID. Existing
attribution service boundaries receive only `ORDER_PLACED` and `ORDER_PAID`.
No duplicate checkout audit or attribution master is proposed.

## Guarded Service Direction

Part 3 may draft exact server/database contracts for:

```text
resolve or create active Storefront cart
set/remove cart item
start checkout
submit checkout atomically
submit manual payment proof/reference
verify or reject manual payment
expire pending checkout/payment
compensate post-commit failure
```

Every operation must:

1. claim the scoped idempotency key;
2. resolve an active profile and same-tenant active membership;
3. resolve active customer ownership for customer actions;
4. enforce `storefront.checkout` and lifecycle state;
5. re-resolve all tenant-owned references;
6. lock mutable stock/coupon/cart/payment rows in deterministic order;
7. write business state, event and audit atomically where applicable;
8. return an exact bounded shape; and
9. complete or fail the idempotency record without leaking private data.

Manual verification additionally requires `payment.verify`. Direct browser
table writes and direct service-role mutation without application authorization
remain forbidden.

## RLS And Grant Direction

1. Enable RLS on both proposed tables.
2. Revoke insert, update and delete from `PUBLIC`, `anon` and `authenticated`.
3. Do not expose `commerce_idempotency_keys` through browser select policies.
4. Keep checkout configuration Admin reads permission-aware and field-bounded.
5. Grant guarded function execution only to exact runtime roles.
6. Use fixed `search_path` and schema-qualified objects.
7. Validate active profile, membership and tenant inside every definer boundary.
8. Preserve existing permission-aware Core RLS; never weaken it for checkout.

## Calculation And Snapshot Contract

The orchestration service persists server-calculated values into existing cart
and order columns. Snapshot JSON is versioned and allowlisted:

```text
schema_version
currency_code
price_source_type
price_source_id
promotion_campaign_id
promotion_version_id
rule_id
action_id
calculated_at
```

Fields are present only when applicable. The snapshot does not replace
relational order/promotion evidence and is never accepted from the browser.

## Index And Concurrency Direction

Part 3 must prove and may add forward-only indexes/constraints for:

```text
one active STOREFRONT cart per (organization_id, customer_id)
cart_items lookup by (organization_id, cart_id, variant_id)
active inventory reservations by tenant/cart/order/variant
coupon redemptions by tenant/cart/order/status
one idempotency row per (organization_id, operation, request_id)
pending manual transaction reference lookup
payment/order expiry scan
```

Exact DDL remains unauthorized until Owner freeze and Part 3 instruction.

## Delete And Retention Direction

- checkout settings are deactivated, not deleted by ordinary UI;
- idempotency evidence tied to order/payment/audit is retained with that
  evidence;
- non-financial expired keys may be cleaned only after their bounded retention;
- converted carts and order/payment/inventory/coupon histories are retained;
- payment proof binaries require a later approved retention/legal policy; and
- no cascade may erase confirmed financial evidence.

## Validation Matrix

Part 3 and later runtime must validate:

1. same-tenant customer ownership and cross-tenant denial;
2. direct browser write denial on all Core/additive tables;
3. inactive/missing entitlement and checkout settings fail closed;
4. deterministic price, promotion, coupon, shipping, rounding and totals;
5. duplicate active cart prevention and conflicting idempotency rejection;
6. concurrent stock and coupon attempts without oversell/overuse;
7. atomic rollback at every pre-commit failure point;
8. idempotent post-commit compensation without history deletion;
9. one order/payment result under retries;
10. manual verification permission, evidence, reason and optimistic state;
11. transaction-derived payment/order aggregates and reversal behavior;
12. exact event/audit allowlists with no private/provider payload leakage;
13. immutable order address and no implicit CRM/consent/membership update;
14. fresh migration replay, RLS, security, concurrency and workflow suites; and
15. P16 and production rollout gates remain closed.

## Explicitly Deferred

```text
guest checkout
service/package/booking checkout
multi-store cart
backorder
loyalty points tender
live carrier quote and pickup
tax engine
partial-payment confirmation
real payment provider and webhook
split payment, escrow, commission and payout
public production checkout
```

## Migration Direction

After explicit Owner freeze and a separate Part 3 instruction, a forward-only
migration may:

1. create the two proposed entities;
2. seed `storefront.checkout` without plan or price mapping;
3. add proven uniqueness/index constraints;
4. apply RLS, grants and append-only/idempotency protection;
5. add guarded orchestration functions and exact audit/event behavior; and
6. add focused tenant, financial, concurrency, retry and recovery validation.

No frozen migration or existing canonical master may be rewritten.

## Owner Approval

The Project Owner approved this ER addendum in full on 2026-08-01. The two
additive entities, exact columns and statuses, no-checkout-session and
no-provider-table direction, `storefront.checkout` feature code, operation,
event and audit catalogs, canonical reuse map, retention direction and future
migration scope are frozen for Phase 1D Part 3.

Part 3 is ready but requires a separate explicit instruction. Migration
generation/application, protected runtime, real provider work, public checkout
and Production activation remain unauthorized until their later gates.
