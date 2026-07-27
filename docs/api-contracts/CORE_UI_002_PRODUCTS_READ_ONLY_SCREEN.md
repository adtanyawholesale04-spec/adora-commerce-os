# CORE-UI-002 Products Read-Only Screen Contract

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** CORE-UI-002  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## Objective

Implement the Admin Products screen as a read-only operational view.

This task does not add product create, edit, delete, cost edit, inventory mutation, schema, migration, status, role, or permission behavior.

---

## Implemented Surface

| Surface | Path | Notes |
|---|---|---|
| Products page | `src/app/admin/products/page.tsx` | Server-rendered read-only product/variant snapshot |
| Products read model | `src/lib/admin/products.ts` | Auth, membership, permission, tenant scope, and bounded RLS reads |

---

## Read Contract

The screen reads only through the authenticated Supabase SSR client and existing RLS policies.

| Table | Columns | Gate |
|---|---|---|
| `products` | `id`, `product_code`, `name`, `status`, `category_id`, `brand_id`, `updated_at` | `product.view` |
| `product_variants` | `id`, `product_id`, `stock_code`, `barcode`, `variant_name`, `base_price`, `status`, `updated_at` | `product.view` |
| `categories` | `id`, `name` | active organization |
| `brands` | `id`, `name` | active organization |
| `inventory_balances` | `variant_id`, `on_hand`, `reserved`, `allocated`, `available` | `inventory.view` |

The read model limits the product snapshot to 50 products, 200 variants, and 500 inventory balance rows.

---

## Authorization Boundary

The read model resolves the same server-side context as `CORE-UI-001`:

```text
Supabase user
-> profile
-> active organization_membership
-> membership roles
-> permission codes
-> active organization_id
-> RLS-scoped reads
```

If `product.view` is missing, no product query is issued.

If `inventory.view` is missing, inventory balances are not queried and inventory quantities render as hidden.

---

## Guardrails

- No service-role key is used.
- No product or variant mutation is exposed.
- No cost columns are selected from `product_variants`.
- Product cost remains behind `api_get_product_variant_cost` and `api_update_product_variant_cost`.
- Inventory mutation remains behind existing guarded RPC wrappers.
- Tenant scope comes from active membership context, not from a client-provided organization id.
- Query failures render a safe error state instead of leaking privileged data.

---

## UI States

The page renders safe states for:

- missing Supabase environment
- anonymous user
- no active organization membership
- missing `product.view`
- query failure
- empty product result
- ready product list

---

## Next Task

Proceed to `CORE-UI-003`:

```text
Implement Inventory read-only screen.
```

Do not enable inventory action buttons until the target server action/API contract and validation tests exist.
