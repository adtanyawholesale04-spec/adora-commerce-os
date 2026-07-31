# Phase 1D Part 3A Migration Contract Review

**Task ID:** `PHASE-1D-CHECKOUT-PART3A`
**Review Date:** 2026-08-01
**Status:** OWNER APPROVED / M01-M20 FROZEN FOR PART 3B
**Owner Approval Date:** 2026-08-01
**Depends On:** Owner-frozen D01-D24, CO-BR-001 to CO-BR-044 and Phase 1D ER Addendum
**Migration File:** Not created
**Local Apply:** Not authorized
**Production Apply:** Not authorized / blocked by P16
**Provider Spend:** USD 0

## Objective

Translate the frozen Phase 1D rules and ER into an exact, forward-only database
change contract before generating SQL. Part 3A changes no schema, data, grants,
function, environment, payment provider or runtime route.

## Task Envelope

```text
PROJECT: ADORA Commerce OS
TRACK: A - Commerce Core
MODULE: Cart / Checkout / Order / Payment
PHASE: 1D Part 3A

ALLOWED:
  repository and schema audit
  migration contract documentation
  status reconciliation
  documentation regression tests

FORBIDDEN:
  create or apply migration
  edit frozen migration
  protected cart/order/payment writes
  real provider or webhook
  public checkout or Production activation
```

## Evidence And Compatibility Findings

1. `carts`, `cart_items` and `cart_events` are the canonical cart sources.
2. `orders` has no direct source-cart reference. `order_items.source_cart_item_id`
   does not prove one order per converted cart when a cart is empty, partially
   copied or queried without joining all lines.
3. `inventory_reservations` links cart and order but not `order_item`; the
   conversion function accepts an order item separately and cannot prove it
   matches the reserved variant.
4. `payment_transactions.external_reference` exists and can hold a manual
   transfer reference; no provider-intent table is needed for local MVP.
5. `coupon_redemptions` already supports `RESERVED`, `CONSUMED`, `RELEASED` and
   `REVERSED`; no coupon master or new status is needed.
6. `customer_profile_links` already proves one active same-tenant profile/customer
   ownership relation.
7. Phase 1C already uses default-deny Storefront tables, explicit service-role
   grants and feature seeding patterns.
8. Existing generic inventory transaction functions are not customer checkout
   APIs. Part 3C-3E must create narrower guarded orchestration functions rather
   than widening their grants.
9. Supabase guidance requires RLS on exposed `public` tables, least-privilege
   grants and explicit revocation of default function execution. Every future
   definer function must authenticate internally and use a fixed search path.

No checkout-session table and no provider-intent table are proposed. The
canonical cart remains the pre-order orchestration source, while existing
payment records remain the local/manual payment source.

## Frozen Decisions

| ID | Contract item | Recommended frozen value |
|---|---|---|
| M01 | Migration layering | Use four forward-only layers: foundation (3B), cart (3C), checkout (3D), manual payment/recovery (3E) |
| M02 | Foundation scope | Part 3B contains schema, constraints, indexes, triggers, RLS/grants and feature seed only; no customer action RPC |
| M03 | New entities | Create only `organization_checkout_settings` and `commerce_idempotency_keys` exactly as frozen in Part 2 |
| M04 | Cart-to-order proof | Add nullable `orders.source_cart_id` with same-tenant FK and partial unique constraint so one cart converts to at most one order |
| M05 | Reservation-to-line proof | Add nullable `inventory_reservations.order_item_id` with same-tenant FK; Phase 1D rows require it before confirmation |
| M06 | Cart line uniqueness | Enforce one row per `(organization_id, cart_id, variant_id)`; quantity changes update that row |
| M07 | Active cart uniqueness | Enforce one `STOREFRONT` cart in `OPEN`, `READY` or `RESERVED` per `(organization_id, customer_id)` |
| M08 | Warehouse allocation | Reserve across active warehouses in deterministic `(warehouse.code, warehouse.id)` order; all requested quantity succeeds or the transaction rolls back |
| M09 | Manual reference uniqueness | Prevent duplicate active `BANK_TRANSFER`/`QR` references per organization across `PENDING` and `SUCCEEDED` transactions |
| M10 | Checkout settings defaults | `INACTIVE`, THB, flat shipping 0.00, reservation 15 minutes and payment due 60 minutes; no organization row is auto-created |
| M11 | Idempotency hash | Store SHA-256 as `bytea` with `octet_length(request_hash) = 32`; canonical intent is hashed in the guarded service, never stored raw |
| M12 | Idempotency mutation | Immutable identity/hash fields; only `IN_PROGRESS -> SUCCEEDED/FAILED` is allowed; terminal rows cannot be changed or deleted by ordinary operations |
| M13 | Idempotency uniqueness | `unique (organization_id, operation, request_id)`; actor/customer remain authorization evidence, not part of retry uniqueness |
| M14 | Feature seed | Add BOOLEAN feature `storefront.checkout`; do not seed an organization entitlement or plan mapping |
| M15 | Table access | RLS enabled; revoke all from `PUBLIC`, `anon`, `authenticated`; grant only required table access to `service_role`; expose actions later through exact guarded functions |
| M16 | Function posture | Future customer functions are `SECURITY DEFINER`, fixed `search_path = public`, explicit `auth.uid()` plus active ownership checks, revoked from `PUBLIC`/`anon`, granted only to `authenticated` |
| M17 | Staff verification posture | Future payment verify/reject functions additionally require `payment.verify`; customer ownership never substitutes for staff permission |
| M18 | Existing functions | Do not replace or widen `reserve_inventory`, `release_inventory_reservation` or `convert_reservation_to_allocation`; new checkout orchestration owns stricter validation |
| M19 | Order number | Generate server-side `WEB-YYYYMMDD-<12 uppercase UUID hex>` and rely on existing `(organization_id, order_number)` uniqueness; browser input is forbidden |
| M20 | Migration application | Generate with Supabase CLI only after approval, fresh-replay locally, run security/concurrency gates, then request separate approval before any Production push |

## Planned Migration Layers

### Layer 1 - Part 3B Foundation

Logical name passed to `supabase migration new`:

```text
phase_1d_checkout_foundation
```

The CLI-generated timestamped filename is authoritative; no filename is
invented in Part 3A.

Layer 1 contains:

1. preflight assertion blocks;
2. `organization_checkout_settings`;
3. `commerce_idempotency_keys`;
4. additive `orders.source_cart_id`;
5. additive `inventory_reservations.order_item_id`;
6. same-tenant foreign keys and uniqueness/indexes;
7. checkout settings update trigger;
8. a dedicated idempotency state/immutability trigger;
9. RLS and least-privilege grants;
10. `storefront.checkout` feature seed; and
11. comments identifying protected data and deferred runtime.

Layer 1 does not create checkout RPCs, settings mutation RPCs, plan mappings,
organization entitlements, sample carts, orders, payments or provider rows.

### Layer 2 - Part 3C Guarded Cart

Future, separately instructed functions:

```text
api_resolve_storefront_cart
api_set_storefront_cart_item
api_remove_storefront_cart_item
api_start_storefront_checkout
```

Names are contract candidates until Part 3C begins. They are not created by
Part 3B.

### Layer 3 - Part 3D Atomic Checkout

Future, separately instructed functions:

```text
api_submit_storefront_checkout
api_expire_storefront_checkout
api_compensate_storefront_checkout
```

This layer owns deterministic lock ordering, pricing/promotion evaluation,
multi-warehouse reservation, coupon reservation, order/payment creation,
events, audit and compensation.

### Layer 4 - Part 3E Manual Payment

Future, separately instructed functions:

```text
api_submit_storefront_payment_proof
api_verify_storefront_payment
api_reject_storefront_payment
```

No provider adapter, credential, webhook or network call is included.

## Exact Foundation DDL Contract

### organization_checkout_settings

```text
id uuid primary key default gen_random_uuid()
organization_id uuid not null references organizations(id) on delete restrict
status varchar(20) not null default 'INACTIVE'
currency_code varchar(3) not null default 'THB'
flat_shipping_charge numeric(14,2) not null default 0
reservation_minutes integer not null default 15
payment_due_minutes integer not null default 60
created_by uuid null references profiles(id) on delete set null
updated_by uuid null references profiles(id) on delete set null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

unique (organization_id)
unique (organization_id, id)
check status in (ACTIVE, INACTIVE)
check currency_code = THB
check flat_shipping_charge >= 0
check reservation_minutes between 5 and 60
check payment_due_minutes between 5 and 1440
```

`set_updated_at()` manages `updated_at`. No row is seeded because absence is a
deliberate fail-closed state.

### commerce_idempotency_keys

```text
id uuid primary key default gen_random_uuid()
organization_id uuid not null references organizations(id) on delete restrict
operation varchar(40) not null
request_id uuid not null
actor_profile_id uuid null references profiles(id) on delete restrict
customer_id uuid null
request_hash bytea not null
state varchar(20) not null default 'IN_PROGRESS'
result_entity_type varchar(40) null
result_entity_id uuid null
failure_code varchar(80) null
started_at timestamptz not null default now()
completed_at timestamptz null
expires_at timestamptz null

unique (organization_id, id)
unique (organization_id, operation, request_id)
foreign key (organization_id, customer_id)
  -> customers(organization_id, id) on delete restrict
check operation in approved M03 operation catalog
check octet_length(request_hash) = 32
check state in (IN_PROGRESS, SUCCEEDED, FAILED)
check terminal/completed_at consistency
check result_entity_type in (cart, order, payment, payment_transaction) or null
check failure_code is trimmed and non-empty or null
check expires_at is null or expires_at > started_at
```

The state trigger rejects changes to tenant, operation, request ID, actor,
customer, hash and start time. It permits one terminal transition and rejects
terminal update/delete. Cleanup requires a later reviewed service and cannot
delete financially referenced evidence.

### Additive Core References

```text
orders.source_cart_id uuid null
foreign key (organization_id, source_cart_id)
  -> carts(organization_id, id) on delete restrict
unique index on (organization_id, source_cart_id)
  where source_cart_id is not null

inventory_reservations.order_item_id uuid null
foreign key (organization_id, order_item_id)
  -> order_items(organization_id, id) on delete restrict
```

Part 3D enforces that a Phase 1D reservation's cart, order, order item and
variant all match. These columns stay nullable for historical and non-Storefront
Core workflows.

## Exact Index Contract

```text
carts (organization_id, customer_id)
  unique where source = STOREFRONT
    and customer_id is not null
    and status in (OPEN, READY, RESERVED)

cart_items (organization_id, cart_id, variant_id)
  unique

inventory_reservations
  (organization_id, cart_id, status, expires_at)
  (organization_id, order_id, order_item_id, status)

coupon_redemptions
  (organization_id, cart_id, status)
  (organization_id, order_id, status)

payment_transactions
  unique (organization_id, payment_method, external_reference)
  where external_reference is not null
    and payment_method in (BANK_TRANSFER, QR)
    and status in (PENDING, SUCCEEDED)

payments (organization_id, status, updated_at)
orders (organization_id, order_status, payment_due_at)
commerce_idempotency_keys (organization_id, customer_id, started_at desc)
commerce_idempotency_keys (state, expires_at)
```

Index names are chosen only in the generated migration and must be globally
unique, descriptive and validated against `pg_indexes` first.

## Preflight Contract

Part 3B must stop before DDL if any query returns an unsafe row:

1. duplicate active Storefront carts per organization/customer;
2. duplicate cart item variants per organization/cart;
3. one cart already inferred to multiple orders through source cart items;
4. mismatched organization/cart/variant/order references;
5. duplicate active manual transfer/QR references;
6. a conflicting `features.code = storefront.checkout` definition;
7. target tables, columns, constraints or index semantics already present with
   an incompatible definition; or
8. missing dependency tables/functions/extensions.

Preflight reports counts and opaque IDs only. It never repairs, merges, deletes
or rewrites production data automatically.

## RLS And Grant Contract

```text
alter table <new table> enable row level security
revoke all from PUBLIC, anon, authenticated
grant select, insert, update on both new tables to service_role
grant delete on neither table
no anon/authenticated table policy in Part 3B
```

Checkout settings Admin access and every customer mutation arrive only through
later guarded functions. Every future definer function must:

- check `auth.uid()` before any privileged read/write;
- resolve `current_profile_id()` and active organization membership;
- verify the active `customer_profile_links` row for customer actions;
- recheck `storefront.checkout` and resource tenant ownership;
- use schema-qualified relations and a fixed search path;
- revoke execute from `PUBLIC` and `anon` immediately after creation;
- grant only the exact required role; and
- never expose `service_role` credentials to the browser.

## Transaction And Lock Contract

Part 3D must lock in this deterministic order:

```text
idempotency key
cart
cart items ordered by variant_id
eligible inventory balances ordered by warehouse.code, warehouse.id, variant_id
coupon and redemption counters
order/payment rows when already present on retry
```

All-or-nothing submission runs in one PostgreSQL transaction. Constraint errors,
stock shortage, coupon race, price change or authorization change roll back the
entire submission. Post-commit failures use the separately instructed
compensation function and never delete financial evidence.

## Rollback And Recovery Contract

ACOS remains forward-only:

- a failed transactional migration rolls back automatically;
- no old migration is edited;
- before runtime, rollback means a new forward migration that disables the
  feature and revokes new function execution while retaining additive tables;
- after any financial row exists, tables/columns/history are never dropped as
  an operational rollback;
- Production apply requires backup/recovery evidence, advisor review, P16 and a
  separate explicit Owner approval.

## Validation Gates For Part 3B

1. migration is generated by `supabase migration new`, not handwritten name;
2. fresh local replay succeeds from an empty database;
3. preflight passes on the current linked schema before any remote apply;
4. RLS is enabled and direct `anon`/`authenticated` access is denied;
5. service-role grants are exact and delete remains absent;
6. immutable idempotency fields and terminal transitions are enforced;
7. active cart, cart item, source cart/order and manual reference races resolve
   through database constraints;
8. tenant-mismatched composite references fail;
9. `storefront.checkout` is seeded without entitlement or plan mapping;
10. existing Storefront, Customer Portal, Admin and shipping tests remain green;
11. Supabase security/advisor, full tests, lint, typecheck and build pass; and
12. no Production push occurs.

## Owner Approval

The Project Owner approved M01-M20 in full on 2026-08-01. The two additive Core
references, uniqueness decisions, deterministic multi-warehouse reservation,
manual-reference uniqueness, idempotency transition protection, RLS/grant
posture, preflight, rollback and four-layer migration sequence are frozen for
Phase 1D Part 3B.

This approval authorizes **Part 3B migration generation and local validation
only**. It does not authorize Production apply, Part 3C-3E runtime, a real
provider or public checkout.
