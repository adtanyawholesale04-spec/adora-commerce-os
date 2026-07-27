# CORE-UI-010 Returns Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Provide a read-only Admin Returns screen at `/admin/returns` for inspecting RMA, exchange, RTO, return items, status history, inspection dispositions, and exchange replacement trace without enabling return creation, approval, rejection, inspection mutation, restock movement, refund processing, or replacement fulfillment from the browser.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`
- `supabase/migrations/026_returns.sql`
- `supabase/migrations/20260726200055_operations_permission_rls.sql`

---

## 3. Read Contract

Primary reads, requiring `return.view`:

```text
returns
return_items
return_status_history
return_inventory_dispositions
exchange_replacements
```

Optional reads:

```text
orders.id/order_number                  requires order.view
order_items snapshot labels             requires order.view
product_variants replacement labels     requires product.view
```

Sensitive or mutation-driving behavior intentionally excluded:

```text
return creation / approval / rejection
inspection write
disposition write
inventory movement creation
refund transaction creation
replacement order / fulfillment creation
promotion clawback calculation
loyalty reversal calculation
```

---

## 4. Authorization Boundary

The read model runs server-side through `getReturnsReadModel()`.

Required checks:

1. Supabase public environment is configured.
2. User is authenticated.
3. User has active organization membership.
4. Active membership includes `return.view`.
5. Database RLS restricts rows to the active organization and return permission policies.

`return.inspect` and `return.manage` are surfaced only as boundary signals. The page does not call mutation services or wrappers.

Supabase Data API exposure is treated as grants plus RLS. Both must allow access before rows are visible.

---

## 5. Explicitly Forbidden In This Screen

The UI does not provide buttons, forms, server actions, or RPC calls for:

```text
create / approve / reject return
receive return
inspect return item
set disposition
restock movement
refund processing
exchange replacement fulfillment
promotion or loyalty reversal
```

Returned stock remains blocked from available inventory until an approved inspection/disposition workflow posts the correct inventory movement.

Refund processing remains payment-domain/wrapper gated.

Exchange replacement remains service-contract gated and must not overwrite original order items.

---

## 6. UI Scope

Implemented:

- `/admin/returns` route
- return metric cards
- return queue table
- return item table
- status history table
- disposition table
- exchange replacement table
- permission visibility boundary panel
- action lockout panel
- snapshot scope panel
- Thai and English copy
- light and dark visual system compatibility

Snapshot limits:

```text
returns: 75 latest by updated_at
return_items: 200 latest by created_at
return_status_history: 150 latest by created_at
return_inventory_dispositions: 150 latest by created_at
exchange_replacements: 100 latest by created_at
orders/order_items labels: matching rows when order.view is granted
product variant replacement labels: matching rows when product.view is granted
```

---

## 7. Validation

Expected validation gates:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/returns returns 200 when the local dev server is running
```

---

## 8. Next Recommended Task

Proceed with:

```text
CORE-UI-011 Promotions read-only screen
```
