# CORE-UI-003 Inventory Read-only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** CORE-UI-003  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

## Objective

Provide a tenant-scoped, permission-aware inventory read surface for warehouse summaries, balance projections, and recent inventory movements.

## Read Contract

The server read model in `src/lib/admin/inventory.ts` uses the authenticated Supabase SSR client and reads only for the active `organization_id`:

| Source | Purpose | Limit |
|---|---|---:|
| `warehouses` | Warehouse identity and status | 100 |
| `inventory_balances` | Current on-hand, reserved, allocated, and available projection | 500 |
| `inventory_movements` | Recent append-only stock movement history | 50 |
| `product_variants` / `products` | Optional labels when `product.view` is granted | 500 |

`inventory_reservations` and `inventory_allocations` are intentionally outside this first screen until their read grants and contract are explicitly confirmed.

## Authorization Boundary

- Authentication and active membership are resolved server-side.
- `inventory.view` is required before inventory queries are issued.
- Every query is scoped to `context.activeOrganizationId`.
- Product and variant labels are loaded only when `product.view` is present; otherwise the screen falls back to variant identifiers.
- The browser performs no direct insert, update, delete, adjustment, reservation, release, or allocation operation.

## UI States

The screen defines explicit states for missing Supabase environment, anonymous session, missing membership, missing permission, query error, and an empty ready result.

## Guarded Action Boundary

Inventory adjustment, reservation, release, and allocation remain wrapper-only. The read-only screen intentionally exposes no action buttons. Existing wrappers remain the only approved mutation boundary.

## Validation

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- Route smoke checks for `/admin` and `/admin/inventory`

## Next Task

Proceed to `CORE-UI-004 Customers read-only screen` after this screen is reviewed.
