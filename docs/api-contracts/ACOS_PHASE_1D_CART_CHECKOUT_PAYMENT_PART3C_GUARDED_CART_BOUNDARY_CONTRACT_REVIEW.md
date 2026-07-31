# Phase 1D Part 3C Guarded Cart Boundary Contract Review

**Task ID:** `PHASE-1D-CHECKOUT-PART3C`
**Review Date:** 2026-08-01
**Status:** OWNER APPROVED / C01-C24 FROZEN / SQL BLOCKED BY PROMOTION CONTRACT
**Owner Approval Date:** 2026-08-01
**Depends On:** Owner-frozen D01-D24, CO-BR-001 to CO-BR-044, Phase 1D ER Addendum, M01-M20 and locally validated Part 3B foundation
**Migration:** Not created
**Local Apply:** Not authorized until the promotion evaluator contract is Owner-frozen
**Production Apply:** Not authorized / blocked by P16
**Provider Spend:** USD 0

## Objective

Define the exact customer-owned guarded cart boundary before creating Layer 2
SQL. This review covers cart resolution, item set/remove and checkout start. It
does not create an RPC, route, direct browser write, order, payment, inventory
reservation, coupon reservation, provider integration or Production change.

## Task Envelope

```text
PROJECT: ADORA Commerce OS
TRACK: A - Commerce Core
MODULE: Cart / Checkout
PHASE: 1D Part 3C

ALLOWED:
  canonical schema and contract audit
  guarded function signatures and behavior design
  authorization, entitlement and idempotency design
  transaction, event, privacy and validation design
  documentation tests and status reconciliation

FORBIDDEN:
  create or apply migration before Owner freeze
  invent promotion rule/action semantics
  direct browser writes to Commerce Core
  reserve inventory or coupons
  create order, payment or financial evidence
  provider, webhook, secret, network or Production work
```

## Repository Findings

1. `carts`, `cart_items` and `cart_events` are the canonical cart sources.
2. Part 3B enforces one active Storefront cart per organization/customer and
   one item per cart/variant.
3. Ownership is resolved through active `profiles`, `organization_memberships`,
   `customer_profile_links` and `customers`; no customer identity is accepted
   from browser input.
4. A protected action must find a published `organization_storefronts` row,
   active checkout settings and an active `storefront.checkout` entitlement.
5. Product eligibility requires a visible Storefront listing plus active
   product and variant in the same organization.
6. Availability is the sum of `inventory_balances.available` in active
   warehouses. Part 3C checks availability but does not reserve it.
7. `commerce_idempotency_keys` already freezes the four Part 3C operations and
   can return the cart as the bounded result entity.
8. The frozen event catalog permits `checkout_started` for this layer. The
   frozen audit catalog does not add item-mutation audit actions.
9. Promotion condition, rule, action, target and mapping types are open text or
   JSON contracts in the current schema. No approved evaluator catalog defines
   their executable meaning. Implementing promotion arithmetic now would
   invent financial behavior.

## Owner-Frozen Decisions

| ID | Contract item | Approved frozen value |
|---|---|---|
| C01 | Public RPC surface | Create only `api_resolve_storefront_cart`, `api_set_storefront_cart_item`, `api_remove_storefront_cart_item` and `api_start_storefront_checkout` in Layer 2 |
| C02 | Caller identity | Require `auth.uid()`, active profile, active same-tenant membership, one active profile/customer link and an `ACTIVE` canonical customer on every call |
| C03 | Browser identity input | Accept no profile ID or customer ID; `p_organization_id` is intent and must be proven from the active membership/link |
| C04 | Resolve signature | `(p_organization_id uuid, p_request_id uuid) returns jsonb` |
| C05 | Set signature | `(p_organization_id uuid, p_cart_id uuid, p_variant_id uuid, p_quantity numeric, p_request_id uuid) returns jsonb` |
| C06 | Remove signature | `(p_organization_id uuid, p_cart_id uuid, p_variant_id uuid, p_request_id uuid) returns jsonb` |
| C07 | Start signature | `(p_organization_id uuid, p_cart_id uuid, p_request_id uuid) returns jsonb` |
| C08 | Availability gates | Every call requires active organization, published Storefront, active checkout settings and active enabled `storefront.checkout` entitlement within its validity window |
| C09 | Cart resolution | Return the caller's existing `OPEN`, `READY` or `RESERVED` Storefront cart; if none exists, atomically create one `OPEN` THB cart; never accept a browser-supplied customer |
| C10 | Inactive cart handling | Mark an `OPEN` cart `EXPIRED` when its last customer mutation is at least 30 days old before creating a replacement; never reopen or rewrite terminal carts |
| C11 | Mutation state | Set and remove are allowed only while the owned cart is `OPEN`; `READY`, `RESERVED` and terminal states return `CART_NOT_MUTABLE` |
| C12 | Quantity contract | Accept a positive value with at most three decimal places and a maximum of `999.000` per variant; reject instead of clamp, round or partially fulfill |
| C13 | Product eligibility | Require a same-tenant visible listing, active product, active variant belonging to that product and active published Storefront |
| C14 | Stock check | Sum only active-warehouse `inventory_balances.available`; require full requested quantity and return `ITEM_UNAVAILABLE` without changing the cart when insufficient |
| C15 | Pricing authority | Full deterministic promotion evaluation remains mandatory under D06/CO-BR-013 to CO-BR-016; base-price-only fallback is forbidden when an applicable active promotion exists |
| C16 | Promotion blocker | Freeze a separate Part 3C Promotion Evaluation Subcontract before SQL, defining supported condition/rule/action/mapping types, stacking, exclusivity and snapshots; unsupported or ambiguous configuration fails closed |
| C17 | Cart totals | In the same transaction recalculate every line and derive subtotal, discount, configured flat shipping and grand total in THB with two-decimal half-up rounding; never trust browser totals |
| C18 | Pricing snapshot | Store only version, original/applied unit prices and opaque applied rule identifiers; exclude cost, margin, customer data, secrets and raw promotion JSON |
| C19 | Remove behavior | Delete only the matching item from an owned `OPEN` cart, then reprice the remaining cart; a missing item is a successful idempotent no-op returning the current cart |
| C20 | Checkout start | Lock and revalidate a non-empty owned `OPEN` cart, reprice it, transition it to `READY`, append one `checkout_started` cart event and create no inventory/coupon hold |
| C21 | Idempotency | Require a UUID request ID for all four calls; use operations `CART_CREATE`, `CART_ITEM_SET`, `CART_ITEM_REMOVE`, `CHECKOUT_START`; matching retry returns the original cart and conflicting intent returns `IDEMPOTENCY_CONFLICT` |
| C22 | Canonical request hash | SHA-256 an explicit versioned canonical tuple of operation, organization, resolved customer, cart, variant and normalized quantity as applicable; store no raw intent or PII |
| C23 | Function security | `SECURITY DEFINER`, fixed `search_path = public`, schema-qualified relations, execute revoked from `PUBLIC`/`anon` and granted only to `authenticated`; direct Core table writes stay denied |
| C24 | Delivery gate | Generate one CLI-named forward migration only after C01-C24 and the promotion evaluator are Owner-frozen; fresh replay plus tenant, RLS, idempotency, concurrency, pricing, stock and regression gates must pass before any Production request |

## Success Response Contract

Each function returns a bounded JSON object with the same top-level shape:

```json
{
  "ok": true,
  "operation": "CART_ITEM_SET",
  "cart_id": "uuid",
  "status": "OPEN",
  "currency_code": "THB",
  "subtotal": "0.00",
  "discount_total": "0.00",
  "shipping_estimate": "0.00",
  "grand_total": "0.00",
  "items": [],
  "idempotency_reused": false
}
```

Items are ordered by `variant_id` and contain only opaque product/variant IDs,
quantity, original/applied unit price, line discount, line total and the bounded
pricing snapshot. Product labels and media remain read-model concerns.

## Controlled Error Catalog

```text
AUTH_REQUIRED
ACTIVE_MEMBERSHIP_REQUIRED
ACTIVE_CUSTOMER_LINK_REQUIRED
CHECKOUT_NOT_AVAILABLE
CART_NOT_FOUND
CART_NOT_MUTABLE
QUANTITY_INVALID
ITEM_NOT_AVAILABLE
PROMOTION_CONFIGURATION_UNSUPPORTED
IDEMPOTENCY_CONFLICT
REQUEST_IN_PROGRESS
```

Authorization and cross-tenant failures must not reveal whether another
tenant's cart, customer or variant exists. Unexpected database errors are not
returned verbatim to the browser.

## Transaction And Lock Contract

Part 3C uses one transaction per RPC and locks in this order when present:

```text
customer/profile ownership context
idempotency key
cart
cart items ordered by variant_id
eligible product/listing/variant rows
inventory balances ordered by warehouse.code, warehouse.id, variant_id
applicable promotion rows in deterministic campaign/rule/action order
```

The active-cart and cart-item unique indexes remain the final concurrency
authority. A create race catches the unique conflict, re-resolves the owned
active cart and returns one deterministic result. No stock balance is mutated.

## Idempotency State Contract

1. Validate authentication, membership, ownership and coarse input shape.
2. Build the canonical request hash from server-resolved identity and normalized
   intent.
3. Insert or lock the `(organization_id, operation, request_id)` evidence.
4. Return the stored cart on a matching `SUCCEEDED` retry.
5. Return `REQUEST_IN_PROGRESS` without executing on a matching in-progress
   duplicate.
6. Reject a different hash, actor or customer as `IDEMPOTENCY_CONFLICT`.
7. Mark `SUCCEEDED` with `result_entity_type = cart` only after the cart
   mutation/event commits.
8. Mark `FAILED` only for a controlled terminal business failure that is safe
   to replay; transaction/system failures roll back the in-progress insert.

## Event, Audit And Privacy Contract

- `api_start_storefront_checkout` appends one `cart_events.event_type =
  checkout_started` with actor type `USER`, actor profile ID and bounded payload
  containing only request ID, customer/cart IDs, currency and totals.
- Resolve, set and remove create no new event or audit action because the frozen
  catalogs do not authorize one. Their retry evidence remains in
  `commerce_idempotency_keys`.
- No call stores email, phone, address, consent, proof, cost, margin, token,
  provider payload or browser-supplied customer identity in event, audit,
  snapshot or idempotency evidence.
- Part 3C never changes consent, membership, customer profile data or CRM data.

## Validation Matrix For A Future Layer 2 Migration

1. unauthenticated, inactive profile and inactive membership denial;
2. missing/revoked customer link and non-active customer denial;
3. cross-tenant organization, cart and variant denial without existence leak;
4. missing/private Storefront, inactive settings and invalid entitlement denial;
5. one active cart under concurrent resolve calls;
6. matching retry, conflicting hash and in-progress duplicate behavior;
7. quantity precision/boundary and no-clamp behavior;
8. hidden/inactive/mismatched product and variant denial;
9. full availability check across active warehouses without reservation writes;
10. concurrent set/remove on one variant with deterministic final state;
11. exact pricing, promotion ordering, stacking and half-up totals after the
    evaluator catalog is frozen;
12. remove missing item as an idempotent no-op;
13. `OPEN -> READY` only, non-empty cart and exactly one checkout event;
14. direct browser table writes and unauthorized function execution denied;
15. event, snapshot and response privacy field allowlists;
16. fresh migration replay, DB lint, security, workflow, Commerce, tests, lint,
    typecheck and build; and
17. no Production apply or public checkout activation.

## Review Outcome

The four guarded cart candidates are compatible with the frozen cart and
foundation model. The Project Owner approved C01-C24 in full on 2026-08-01.
These signatures, lifecycle, ownership, quantity, availability, pricing,
idempotency, security, privacy and delivery decisions are frozen for the
remaining Part 3C design and implementation gates.

Layer 2 SQL remains **BLOCKED** until a Promotion Evaluation Subcontract freezes
the executable promotion catalog required by D06 and CO-BR-013 to CO-BR-016.

This review does not authorize a migration, runtime route, provider or
Production change.
