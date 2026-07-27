# CORE-UI-009 Shipping Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Provide a read-only Admin Shipping screen at `/admin/shipping` for inspecting shipment queue, package manifest, package item allocation, provider labels, and carrier tracking timeline without enabling label creation, shipment handoff, tracking mutation, carrier webhook ingestion, shipping cost edits, or COD settlement from the browser.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`
- `supabase/migrations/025_shipping.sql`
- `supabase/migrations/20260726200055_operations_permission_rls.sql`
- `supabase/migrations/20260726201809_guarded_operations_wrappers.sql`
- `supabase/migrations/20260726202729_shipping_workflow_wrappers.sql`
- `supabase/migrations/20260726203930_carrier_webhook_boundary.sql`
- `supabase/migrations/20260727104818_carrier_webhook_tracking_rpc.sql`

---

## 3. Read Contract

Primary reads, requiring `shipping.create`:

```text
shipments
shipment_packages
shipment_package_items
tracking_events
shipping_providers
```

Selected shipment fields:

```text
id
fulfillment_id
shipping_provider_id
shipment_number
tracking_number
shipping_method
status
package_count
actual_weight_grams
created_at
shipped_at
delivered_at
cancelled_at
```

Selected tracking fields:

```text
id
shipment_id
event_code
event_description
event_at
created_at
```

Optional reads:

```text
fulfillments.id/fulfillment_number/status    requires warehouse.pick
fulfillment_items labels                      requires warehouse.pick
product_variants labels                       requires product.view
fulfillment_qc_sessions status                requires warehouse.qc
```

Sensitive fields intentionally excluded:

```text
shipments.label_storage_path
shipments.provider_shipment_id
shipments.shipping_cost
shipments.cod_amount
shipment_packages.label_storage_path
tracking_events.external_event_id
tracking_events.raw_payload_json
shipping_providers.config_reference
shipping_providers.capabilities_json
carrier_webhook_events.raw_payload_json
```

---

## 4. Authorization Boundary

The read model runs server-side through `getShippingReadModel()`.

Required checks:

1. Supabase public environment is configured.
2. User is authenticated.
3. User has active organization membership.
4. Active membership includes `shipping.create`.
5. Database RLS restricts rows to the active organization and shipping permission policies.

`shipping.print_label` is surfaced only as a boundary signal. The page does not call label creation wrappers.

Supabase Data API exposure is treated as grants plus RLS. Both must allow access before rows are visible.

---

## 5. Explicitly Forbidden In This Screen

The UI does not provide buttons, forms, server actions, or RPC calls for:

```text
label creation
shipment handoff
tracking event mutation
carrier webhook ingestion
shipping cost / COD visibility or edit
provider credential/config visibility
label storage path visibility
```

Label creation remains gated by `api_create_shipment_label`.

Shipment handoff remains gated by `api_mark_shipment_ready_for_handoff`.

Tracking updates remain gated by `api_record_carrier_tracking_event`.

Carrier webhook ingestion remains gated by the Edge Function boundary and `api_record_carrier_tracking_event_from_webhook`.

---

## 6. UI Scope

Implemented:

- `/admin/shipping` route
- shipment metric cards
- shipment queue table
- package manifest table
- package item table
- tracking timeline table
- provider summary table
- permission visibility boundary panel
- action lockout panel
- snapshot scope panel
- Thai and English copy
- light and dark visual system compatibility

Snapshot limits:

```text
shipments: 75 latest by created_at
shipment_packages: 150 latest by created_at
shipment_package_items: 200 latest by created_at
tracking_events: 100 latest by event_at
shipping_providers: 100 matching rows
fulfillments: 100 matching rows when warehouse.pick is granted
fulfillment_items: 200 matching rows when warehouse.pick is granted
product_variants: 200 matching rows when product.view is granted
fulfillment_qc_sessions: 100 matching rows when warehouse.qc is granted
```

---

## 7. Validation

Expected validation gates:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/shipping returns 200 when the local dev server is running
```

---

## 8. Next Recommended Task

Proceed with:

```text
CORE-UI-010 Returns read-only screen
```
