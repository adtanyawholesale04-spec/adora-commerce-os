# CORE-UI-008 Warehouse QC Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Provide a read-only Admin Warehouse QC screen at `/admin/qc` for inspecting QC sessions, QC item totals, and recent scan result signals without enabling scan ingestion, QC completion, override, stock deduction, or label workflows from the browser.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `reference/WAREHOUSE_PICKING_QC_MODEL_V1.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`
- `supabase/migrations/024_warehouse_qc.sql`
- `supabase/migrations/20260726200055_operations_permission_rls.sql`
- `supabase/migrations/20260726201809_guarded_operations_wrappers.sql`
- `supabase/migrations/20260726202729_shipping_workflow_wrappers.sql`

---

## 3. Read Contract

Primary reads, requiring `warehouse.qc`:

```text
fulfillment_qc_sessions
fulfillment_qc_item_totals
fulfillment_qc_scans
```

Selected scan signal fields:

```text
id
qc_session_id
fulfillment_item_id
scan_type
matched
quantity_increment
scanned_at
error_code
```

Optional reads:

```text
fulfillments.id/fulfillment_number/status    requires warehouse.pick
fulfillment_items labels                      requires warehouse.pick
product_variants labels                       requires product.view
```

Sensitive fields intentionally excluded:

```text
fulfillment_qc_scans.scan_value
fulfillment_qc_scans.metadata_json
fulfillment_events.payload_json
shipments.label_storage_path
tracking_events.raw_payload_json
```

---

## 4. Authorization Boundary

The read model runs server-side through `getQcReadModel()`.

Required checks:

1. Supabase public environment is configured.
2. User is authenticated.
3. User has active organization membership.
4. Active membership includes `warehouse.qc`.
5. Database RLS restricts rows to the active organization and QC permission policies.

Fulfillment and product labels are best-effort optional enrichment. If the active membership lacks the related read permission, the screen falls back to IDs rather than querying tables that RLS should deny.

Supabase Data API exposure is treated as grants plus RLS. Both must allow access before rows are visible.

---

## 5. Explicitly Forbidden In This Screen

The UI does not provide buttons or server actions for:

```text
scan ingestion
QC completion
QC override
shipment label creation
shipment handoff
tracking update
inventory deduction
allocation transition
```

Normal QC completion remains available only through `api_complete_qc_session` from an approved server/API workflow.

QC override remains available only through `api_override_qc_session` with `warehouse.qc.override`, mandatory reason, and audit.

Final label creation remains gated by shipping wrappers after QC pass.

---

## 6. UI Scope

Implemented:

- `/admin/qc` route
- QC session metric cards
- QC queue table
- QC item totals table
- recent scan signal table without scan values
- permission visibility boundary panel
- action lockout panel
- snapshot scope panel
- Thai and English copy
- light and dark visual system compatibility

Snapshot limits:

```text
fulfillment_qc_sessions: 75 latest by updated_at
fulfillment_qc_item_totals: 200 latest by updated_at
fulfillment_qc_scans: 100 latest by scanned_at
fulfillment labels: 100 matching rows when warehouse.pick is granted
fulfillment item labels: 200 matching rows when warehouse.pick is granted
product variant labels: 200 matching rows when product.view is granted
```

---

## 7. Validation

Expected validation gates:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/qc returns 200 when the local dev server is running
```

---

## 8. Next Recommended Task

Proceed with:

```text
CORE-UI-009 Shipping read-only screen
```
