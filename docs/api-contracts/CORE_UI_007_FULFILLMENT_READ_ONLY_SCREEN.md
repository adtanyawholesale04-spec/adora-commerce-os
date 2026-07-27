# CORE-UI-007 Fulfillment Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Provide a read-only Admin Fulfillment screen at `/admin/fulfillment` for inspecting fulfillment queue state, fulfillment item lines, optional QC session signals, and optional shipment signals.

This task does not implement pick, pack, QC completion, shipment label creation, shipment handoff, carrier webhook processing, or tracking mutation workflows.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`
- `supabase/migrations/023_fulfillment_base.sql`
- `supabase/migrations/024_warehouse_qc.sql`
- `supabase/migrations/025_shipping.sql`
- `supabase/migrations/20260726200055_operations_permission_rls.sql`

---

## 3. Read Contract

Primary reads, requiring `warehouse.pick`:

```text
fulfillments
fulfillment_items
```

Optional reads:

```text
fulfillment_qc_sessions  requires warehouse.qc
shipments                 requires shipping.create
orders.id/order_number    requires order.view
product_variants labels   requires product.view
```

Sensitive fields intentionally excluded:

```text
fulfillment_events.payload_json
fulfillment_qc_scans.scan_value
fulfillment_qc_scans.metadata_json
shipments.label_storage_path
shipments.provider_shipment_id
shipment_packages.label_storage_path
tracking_events.raw_payload_json
shipping_providers.config_reference
```

---

## 4. Authorization Boundary

The read model runs server-side through `getFulfillmentReadModel()`.

Required checks:

1. Supabase public environment is configured.
2. User is authenticated.
3. User has active organization membership.
4. Active membership includes `warehouse.pick`.
5. Database RLS restricts rows to the active organization and permission-aware fulfillment policies.

Optional QC and shipping sections do not query their tables unless the active membership has the matching permission.

Supabase Data API exposure is treated as grants plus RLS. Both must allow access before rows are visible.

---

## 5. Explicitly Forbidden In This Screen

The UI does not provide buttons or server actions for:

```text
pick state mutation
pack state mutation
QC completion
QC override
shipment label creation
shipment handoff
carrier webhook processing
tracking event mutation
inventory deduction
allocation transition
```

These remain gated by existing guarded RPCs, Edge Function boundaries, or future approved service contracts.

---

## 6. UI Scope

Implemented:

- `/admin/fulfillment` route
- fulfillment metric cards
- fulfillment queue table
- fulfillment item table
- optional QC session table
- optional shipment table
- permission visibility boundary panel
- mutation lockout panel
- snapshot scope panel
- Thai and English copy
- light and dark visual system compatibility

Snapshot limits:

```text
fulfillments: 75 latest by updated_at
fulfillment_items: 150 latest by created_at
fulfillment_qc_sessions: 50 latest by updated_at, hidden without warehouse.qc
shipments: 50 latest by created_at, hidden without shipping.create
orders: 150 matching labels when order.view is granted
product_variants: 150 matching labels when product.view is granted
```

---

## 7. Validation

Expected validation gates:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/fulfillment returns 200 when the local dev server is running
```

---

## 8. Next Recommended Task

Proceed with:

```text
CORE-UI-008 Warehouse QC read-only screen
```
