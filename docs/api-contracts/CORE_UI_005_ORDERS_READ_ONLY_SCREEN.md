# CORE-UI-005 Orders Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Provide a read-only Admin Orders screen at `/admin/orders` for inspecting recent order state without enabling any order mutation workflows.

This task is intentionally read-first. Create, edit, cancel, reprice, payment settlement, and fulfillment state changes remain outside this screen until approved service contracts or guarded wrappers are available.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`
- `supabase/migrations/014_orders.sql`
- `supabase/migrations/20260726192643_permission_aware_domain_rls.sql`

---

## 3. Read Contract

Primary read:

```text
orders
```

Selected fields:

```text
id
customer_id
order_number
source
currency_code
order_status
payment_status
fulfillment_status
grand_total
amount_paid
amount_due
payment_due_at
confirmed_at
cancelled_at
completed_at
created_at
updated_at
```

Optional read, only when the active membership also has `customer.view`:

```text
customers
```

Selected fields:

```text
id
customer_code
first_name
last_name
display_name
phone
```

Customer labels are hidden when `customer.view` is not present. The screen falls back to `customer_id`.

---

## 4. Authorization Boundary

The read model runs server-side through `getOrdersReadModel()`.

Required checks:

1. Supabase public environment is configured.
2. User is authenticated.
3. User has active organization membership.
4. Active membership includes `order.view`.
5. Database RLS restricts rows to the active organization and `order.view`.

No client-provided `organization_id` is trusted.

Supabase Data API exposure remains controlled by grants plus RLS, matching Supabase guidance that grants decide whether an object is reachable and RLS decides which rows can be accessed.

---

## 5. Explicitly Forbidden In This Screen

The UI does not provide buttons or server actions for:

```text
order create
order edit
order cancel
order reprice
payment verification / settlement
refund processing
fulfillment state transitions
order_items mutation
order_status_history mutation
```

These remain gated by future order/payment/fulfillment service contracts or existing guarded wrappers where applicable.

---

## 6. Related Reads Deferred

The first read model does not select these related tables:

```text
order_items
order_addresses
order_status_history
payments
payment_transactions
fulfillments
shipments
returns
```

Reason:

- `order_items` contains `unit_cost_snapshot`; cost-sensitive reads need explicit cost-safe contracts.
- Detail timelines, payment history, fulfillment history, and return history should be added through separate read contracts to avoid accidental workflow or privacy leakage.

---

## 7. UI Scope

Implemented:

- `/admin/orders` route
- latest order metric cards
- latest order cards
- order list table
- order, payment, and fulfillment status badges
- customer label visibility boundary
- mutation lockout panel
- snapshot scope panel
- Thai and English copy
- light and dark visual system compatibility

Snapshot limits:

```text
orders: 75 latest by created_at
customers: 75 matching customer labels when customer.view is granted
```

---

## 8. Validation

Expected validation gates:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/orders returns 200 when the local dev server is running
```

---

## 9. Next Recommended Task

Proceed with:

```text
CORE-UI-006 Payments read-only screen
```
