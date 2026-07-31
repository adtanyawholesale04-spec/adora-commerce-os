# Phase 1D Part 3D Atomic Checkout Contract Review

**Task ID:** `PHASE-1D-CHECKOUT-PART3D`
**Review Date:** 2026-08-01
**Status:** OWNER FROZEN / AC01-AC30 APPROVED / IMPLEMENTED / LOCAL VALIDATED / PRODUCTION NOT APPLIED
**Depends On:** Owner-frozen D01-D24, CO-BR-001 to CO-BR-044, Phase 1D ER Addendum, M01-M20, PE01-PE24 and locally validated Parts 3B-3C
**Migration:** `supabase/migrations/20260731195612_phase_1d_atomic_checkout_layer3.sql`
**Local Apply:** Validated by fresh replay on 2026-08-01
**Production Apply:** Not authorized / blocked by P16
**Provider Spend:** USD 0

## Implementation Reconciliation

The separately authorized forward migration now implements the three frozen
Layer 3 APIs, deterministic inventory reservations, optional coupon evaluation,
order/payment/evidence creation, idempotent expiry and Owner-approved
compensation code `CHECKOUT_POST_COMMIT_FAILED`. Focused functional, reprice,
expiry, compensation, privacy, role-grant, rollback and competing-coupon tests
pass locally. No provider call, payment transaction/proof, Production apply or
public activation was included.

## Objective

Define the exact Layer 3 transaction before any protected SQL is generated.
Part 3D submits one customer-owned `READY` Storefront cart, reserves inventory
and an optional coupon, creates one canonical pending order and payment
aggregate, writes immutable snapshots/evidence and converts the cart without a
provider call. Expiry and post-commit compensation are separately guarded.

This review creates no migration, function, route, order, payment, reservation,
entitlement, provider configuration or Production change.

## Task Envelope

```text
PROJECT: ADORA Commerce OS
TRACK: A - Commerce Core
MODULE: Cart / Checkout / Order / Payment
PHASE: 1D Part 3D
TASK ID: PHASE-1D-CHECKOUT-PART3D

ALLOWED:
  canonical schema and frozen contract audit
  exact atomic transaction and lock design
  address, coupon, reservation and snapshot input design
  idempotency, event, audit, expiry and compensation design
  Owner decision table, documentation tests and status reconciliation

FORBIDDEN:
  migration or RPC generation before Owner freeze
  invent coupon or promotion arithmetic
  edit a frozen migration
  direct browser writes to Commerce Core
  payment transaction, proof, verification or provider work
  public checkout or Production apply
```

## Repository Findings

1. `orders`, `order_items`, `order_addresses`, `order_status_history` and
   `payments` are the canonical order/payment aggregate sources. Part 3D must
   not create a checkout-session, order or payment master.
2. Part 3B already added `orders.source_cart_id`,
   `inventory_reservations.order_item_id`, source-cart uniqueness, checkout
   settings, canonical `commerce_idempotency_keys` evidence and required lookup
   indexes.
3. Part 3C provides the frozen promotion evaluator and guarded cart lifecycle.
   Part 3D must recompute under locks and cannot trust cart totals as authority.
4. Generic `reserve_inventory`, `release_inventory_reservation` and
   `convert_reservation_to_allocation` functions do not validate customer,
   entitlement, order item or complete checkout context. M18 forbids widening
   them; the atomic checkout orchestration must remain narrower.
5. `coupon_redemptions` can represent reservation/consumption/release, but the
   current schema has no frozen coupon arithmetic, normalized-code uniqueness
   or one-active-redemption constraint.
6. A coupon points to `promotion_campaign_versions`, while the Part 3C
   evaluator is approved for automatic item promotions only. The current
   schema alone cannot distinguish executable automatic and coupon-triggered
   campaign semantics safely.
7. `payments` is unique by order and can store the required `UNPAID` aggregate.
   Part 3D does not need or authorize a `payment_transactions` row.
8. `api_record_attribution_event` is a service-role boundary that verifies the
   JWT role. It cannot be invoked as part of an authenticated customer RPC.
   `ORDER_PLACED` therefore remains a retryable server follow-up after the
   commerce transaction, not authority for checkout success.
9. Existing tables permit the frozen order/cart/inventory/coupon statuses. No
   new status, role, permission, provider table or tax formula is required.

## Owner Decision Freeze

On 2026-08-01, the Project Owner approved the recommended values for AC01-AC30
in full. These values are frozen as the Layer 3 atomic checkout contract. This
approval authorizes the next Coupon Evaluation Subcontract Review only. It does
not authorize SQL generation, migration apply, payment/provider work or
Production activation.

## Frozen Owner Decision Table

| ID | Contract item | Recommended safe value |
|---|---|---|
| AC01 | Layer 3 API surface | Limit SQL candidates to `api_submit_storefront_checkout`, `api_expire_storefront_checkout` and `api_compensate_storefront_checkout` |
| AC02 | Submit signature | `(p_organization_id uuid, p_cart_id uuid, p_customer_address_id uuid, p_checkout_address jsonb, p_coupon_code text, p_request_id uuid) returns jsonb` |
| AC03 | Expiry signature | `(p_organization_id uuid, p_order_id uuid, p_request_id uuid) returns jsonb`; executable only by `service_role` through a reviewed scheduled/server boundary |
| AC04 | Compensation signature | `(p_organization_id uuid, p_order_id uuid, p_failure_code text, p_request_id uuid) returns jsonb`; executable only by `service_role`; `p_failure_code` is one sanitized allowlisted code, never free-form provider text |
| AC05 | Submit caller and ownership | Grant submit only to `authenticated`; require `auth.uid()`, active profile, active same-tenant membership, one active customer link and active canonical customer on every call |
| AC06 | Availability gates | Recheck active organization, published Storefront, active THB checkout settings and active currently valid `storefront.checkout` entitlement inside the transaction |
| AC07 | Submit cart state | Accept only the caller-owned, non-empty `STOREFRONT` cart in `READY`; `OPEN` must call checkout start first and all other states fail closed |
| AC08 | Address input union | Require exactly one of an active owned `p_customer_address_id` or `p_checkout_address`; never accept customer/profile identity in the JSON |
| AC09 | Checkout-only address shape | Allow exactly `recipient_name`, `phone`, `address_line1`, optional `address_line2`, `subdistrict`, `district`, `province`, `postal_code`, and required `country_code`; reject unknown keys and blank required values |
| AC10 | Address normalization | Trim strings, convert empty optional values to null, uppercase two-letter country code, permit `TH` only for the first flat-shipping MVP, enforce existing column lengths and cap each text address line at 500 characters; never update CRM address data |
| AC11 | Repricing and customer confirmation | Recompute every line with the PE01-PE24 evaluator at one captured database timestamp; if any persisted line/totals differ, update the `READY` cart to the newly calculated values, return `CHECKOUT_REPRICE_REQUIRED`, and create no hold/order/payment |
| AC12 | Coupon gate | Accept zero or one trimmed uppercase coupon code; before SQL, freeze a separate Coupon Evaluation Subcontract and harden automatic promotion evaluation so coupon-linked campaign versions cannot apply without a submitted code |
| AC13 | Coupon normalization DDL gate | Preflight case-insensitive normalized coupon duplicates; only after a clean preflight may a forward migration add the proven normalized lookup/uniqueness and one-active-redemption controls |
| AC14 | Calculation order | Preserve CO-BR-013 exactly: automatic item benefit, approved coupon/order benefit, configured flat shipping, zero shipping discount unless the coupon subcontract explicitly supports it, zero tax, then grand total; round half-up at persisted boundaries |
| AC15 | Inventory allocation algorithm | Lock active warehouse balances ordered by variant ID, warehouse code and warehouse ID; reserve from each row in that order until the full line quantity is covered; reject the whole submission if any line cannot be fully covered |
| AC16 | Reservation evidence | Create one `ACTIVE` reservation per warehouse/variant/order-item slice, linked to cart, order and order item, with one `reserved_until = statement_timestamp() + reservation_minutes`; update `reserved` and `available` in the same transaction |
| AC17 | Order identity and state | Generate `WEB-YYYYMMDD-<12 uppercase UUID hex>` server-side; create one order linked by `source_cart_id` with `PENDING_CONFIRMATION`, `UNPAID`, `UNFULFILLED`, THB and configured `payment_due_at` |
| AC18 | Order item snapshot | Create one order item per cart item with canonical product/variant names and SKU, quantity and recomputed commercial values; retain `source_cart_item_id`; leave nullable `unit_cost_snapshot` null until a separate accounting/cost-snapshot contract is approved |
| AC19 | Promotion benefit evidence | Persist one immutable `promotion_applied_benefits` row per applied automatic action using only IDs and bounded evaluator output; coupon benefit evidence is defined by the separate coupon subcontract |
| AC20 | Address snapshot | Create exactly one immutable `order_addresses` row with `address_type = SHIPPING`; billing address remains deferred and no customer address foreign key is retained |
| AC21 | Coupon reservation | When an approved coupon applies, create exactly one `RESERVED` redemption linked to customer, cart and order; consume only on payment confirmation and release only through expiry/compensation |
| AC22 | Payment aggregate | Create exactly one `payments` row with `status = UNPAID`, expected amount equal to order grand total, received amount zero and THB; create no transaction, proof, provider or fee row |
| AC23 | Cart transition | Within the same transaction move `READY -> RESERVED` only after all holds exist, then `RESERVED -> CONVERTED` after order/payment/evidence writes succeed; retain `reserved_until` and set no provider state |
| AC24 | Lifecycle evidence | Append initial `order_status_history` to `PENDING_CONFIRMATION`, one `checkout_completed` cart event, and audits `STOREFRONT_CHECKOUT_SUBMITTED` plus `STOREFRONT_ORDER_CREATED`; allow only opaque IDs, statuses, currency, bounded totals and request ID |
| AC25 | Attribution handoff | After commit, a server-only service-role adapter records `ORDER_PLACED` through existing `api_record_attribution_event` with a deterministic derived request ID; failure is retried independently and never rolls back or compensates valid commerce truth |
| AC26 | Idempotency | `CHECKOUT_SUBMIT` claims the key before cart mutation; canonical SHA-256 intent covers version, organization, resolved customer, cart, normalized address digest, normalized coupon or null; matching retry returns the original order and conflicting reuse fails |
| AC27 | Success response | Return only `ok`, operation, cart/order/payment IDs, order number/status, currency, persisted totals, `reserved_until`, `payment_due_at` and `idempotency_reused`; exclude address, contact, coupon code, cost and internal warehouse slices |
| AC28 | Expiry behavior | For a still-unpaid `PENDING_CONFIRMATION` order past `payment_due_at`, atomically set `PAYMENT_EXPIRED`, release active reservations and reserved coupon, retain payment/history, append `CHECKOUT_EXPIRED`; cart remains `CONVERTED` and is never reopened |
| AC29 | Compensation behavior | Permit only an unpaid `PENDING_CONFIRMATION` order with active holds; atomically set `CANCELLED`, release active reservations/coupon, retain payment/order history, append `CHECKOUT_COMPENSATED`; repeated calls are a bounded no-op and paid/confirmed orders fail closed |
| AC30 | Delivery gate | Owner-freeze AC01-AC30, freeze/implement the coupon subcontract and automatic/coupon separation, then generate one CLI-named Layer 3 migration and pass fresh replay, failure-injection and competing-transaction gates before any Production request |

## Proposed Submit Transaction

```text
authenticate and resolve customer ownership
  -> validate coarse address/coupon/request shape
  -> claim or lock CHECKOUT_SUBMIT idempotency evidence
  -> lock READY cart
  -> lock cart items ordered by variant_id
  -> lock product/listing/variant and applicable promotion rows
  -> reprice and stop with CHECKOUT_REPRICE_REQUIRED on drift
  -> lock inventory balances in deterministic allocation order
  -> lock normalized coupon/counters/redemptions when present
  -> generate opaque order/item/payment IDs
  -> insert canonical order, items and shipping address
  -> create inventory and optional coupon reservations
  -> update inventory balances
  -> persist automatic/coupon benefit evidence
  -> create UNPAID payment aggregate and order history
  -> append checkout event and two audit records
  -> transition READY -> RESERVED -> CONVERTED
  -> complete idempotency with result_entity_type = order
  -> commit
```

Any controlled or database failure before commit rolls back every line above.
`ORDER_PLACED` attribution is a post-commit service handoff and is not part of
commerce truth.

## Deterministic Lock Order

```text
identity and entitlement context
commerce idempotency key
cart
cart items by variant_id
product/listing/variant and promotion rows by frozen evaluator order
inventory balances by variant_id, warehouse.code, warehouse.id
coupon then usage/redemption rows by opaque ID
existing order/payment rows on retry, expiry or compensation
```

No checkout function invokes or widens the generic inventory functions.
Database constraints remain the final authority for source-cart/order,
payment/order and idempotency uniqueness.

## Controlled Result Catalog

```text
AUTH_REQUIRED
ACTIVE_MEMBERSHIP_REQUIRED
ACTIVE_CUSTOMER_LINK_REQUIRED
CHECKOUT_NOT_AVAILABLE
CART_NOT_FOUND
CART_NOT_READY
ADDRESS_REQUIRED
ADDRESS_INVALID
COUPON_INVALID
COUPON_UNAVAILABLE
ITEM_UNAVAILABLE
PROMOTION_CONFIGURATION_UNSUPPORTED
PROMOTION_PRICE_FLOOR_VIOLATION
CHECKOUT_REPRICE_REQUIRED
IDEMPOTENCY_CONFLICT
REQUEST_IN_PROGRESS
ORDER_NOT_EXPIRABLE
ORDER_NOT_COMPENSATABLE
```

Authorization and cross-tenant failures must not disclose whether a foreign
cart, address, coupon, order, inventory row or customer exists.

## Event, Audit And Privacy Contract

- `checkout_completed` contains request, cart, order and customer opaque IDs,
  THB totals and source only.
- `STOREFRONT_CHECKOUT_SUBMITTED` and `STOREFRONT_ORDER_CREATED` contain bounded
  before/after states and request ID, never contact/address/coupon text.
- `CHECKOUT_EXPIRED` and `CHECKOUT_COMPENSATED` contain order status, released
  hold counts and one sanitized reason/failure code.
- Address and phone exist only in the immutable order address snapshot.
- Coupon code is used transiently for lookup and excluded from event, audit,
  idempotency and response payloads; its digest may contribute to the request
  hash.
- Cost, margin, provider payload, proof, credential, IP and user agent are not
  written by the Part 3D customer boundary.
- Checkout processing does not grant or modify marketing consent.

## Validation Matrix

1. unauthenticated, inactive profile/membership/link/customer denial;
2. missing/private Storefront, settings or entitlement denial;
3. foreign cart/address/coupon/order denial without existence leakage;
4. exact address union, key allowlist, lengths and Thailand-only gate;
5. `READY` and non-empty cart requirements;
6. reprice drift updates only the cart and creates no hold/order/payment;
7. exact promotion and future coupon arithmetic with privacy-safe evidence;
8. multi-warehouse split reservation and full-quantity rejection;
9. simultaneous checkouts cannot oversell or overuse a coupon;
10. failure injection after each write proves complete transaction rollback;
11. matching retry returns one order/payment and conflict does not execute;
12. one source cart/order and one payment/order under competing requests;
13. immutable order item/address/benefit snapshots;
14. one checkout event and exact audit allowlists;
15. expiry releases all eligible holds once and retains financial history;
16. compensation is idempotent and cannot touch paid/confirmed orders;
17. no payment transaction/proof/provider/consent/CRM mutation;
18. direct browser table writes and unauthorized helper execution denied;
19. attribution retry failure cannot alter valid order/payment truth; and
20. fresh replay, DB lint, Supabase regressions, tests, lint, typecheck and build.

## Blocking Decisions And Dependencies

Part 3D SQL remains **BLOCKED** until all of the following are true:

1. a Coupon Evaluation Subcontract freezes code normalization, eligibility,
   arithmetic, usage counters, stacking with automatic promotions, benefit
   evidence and release/consume behavior;
2. automatic promotion evaluation is proven to exclude coupon-linked campaign
   versions unless the approved coupon path invokes them;
3. required normalized coupon and active-redemption constraints pass a
   non-destructive preflight; and
4. migration generation/local apply is separately authorized.

This is an expected design gate, not a runtime defect and not permission to
repair data or modify a frozen migration.

## Review Outcome

The canonical schema can support Layer 3 without a duplicate master or provider
table. AC01-AC30 now freeze a conservative, local-only transaction and recovery
posture. The Coupon Evaluation Subcontract Review is the next authorized design
step, but no financial SQL is authorized while coupon semantics and
automatic/coupon campaign separation are unresolved.
