# ACOS A3 Admin Service Contract Map

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** CORE-UI-000  
**Status:** HARDENED_IN_REVIEW  
**Date:** 2026-07-27

---

## 1. Purpose

This document starts A3 by defining the Admin MVP service boundary before UI implementation.

A3 can proceed because A1 fresh database validation and A2 commerce integration validation have passed. This document does not create schema, migrations, roles, permissions, statuses, or production UI. It maps which Admin modules may read through RLS-safe surfaces and which mutations must go through service, server action, API, or RPC boundaries.

The guarded action requirements are hardened in `docs/api-contracts/ACOS_A3_GUARDED_ACTION_SERVICE_CONTRACT_HARDENING.md`.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `supabase/validation/VALIDATION_REPORT.md`

---

## 3. Non-Negotiable A3 Rules

1. Browser/client code must not directly write sensitive business tables.
2. Tenant scope must come from authenticated membership, not from trusting a client-provided `organization_id`.
3. Protected actions require Authentication, active Membership, active Entitlement, Permission, tenant scope, and audit where required.
4. Financial, inventory, fulfillment, shipping, return, permission, and cost mutations must use guarded server/RPC/application boundaries.
5. No A3 implementation may invent new schema, statuses, roles, permissions, financial rules, provider contracts, or state transitions.
6. UI permission hiding is not authorization. Server-side checks remain required.
7. Direct reads must rely on RLS, permission-aware views, or approved read models. Cost fields require explicit cost wrappers.

---

## 4. Sensitive Tables

The Admin browser must not perform direct inserts, updates, or deletes against these tables:

```text
orders
order_items
order_adjustments
inventory_movements
inventory_reservations
inventory_allocations
inventory_balances
payments
payment_transactions
refunds
refund_transactions
customer_credit_transactions
loyalty_transactions
fulfillments
fulfillment_items
fulfillment_qc_sessions
fulfillment_qc_scans
shipments
shipment_tracking_events
returns
return_items
audit_logs
role_permissions
membership_roles
organization_memberships
organization_entitlements
organization_subscriptions
support_access_grants
```

Reads may still be allowed when RLS and permission policies allow them.

---

## 5. Existing Guarded Action Surface

These wrappers already exist and are validated as A3-safe action boundaries when called from an authenticated server/API path with correct user context:

| Domain | Wrapper | Purpose |
|---|---|---|
| Inventory | `api_post_inventory_movement` | Post audited inventory movement and update balance projection |
| Inventory | `api_reserve_inventory` | Atomically reserve stock |
| Inventory | `api_release_inventory_reservation` | Release active reservation |
| Inventory | `api_convert_reservation_to_allocation` | Convert reservation into allocation |
| Product Cost | `api_get_product_variant_cost` | Read cost fields behind `product.cost.view` |
| Product Cost | `api_update_product_variant_cost` | Edit cost fields behind `product.cost.edit` |
| Refund | `api_process_refund` | Process refund within refundable amount |
| QC | `api_override_qc_session` | Elevated QC override with reason and audit |
| Shipping | `api_create_shipment_label` | Create label after QC gate |
| QC | `api_complete_qc_session` | Complete normal QC session from item totals |
| Shipping | `api_mark_shipment_ready_for_handoff` | Mark labeled shipment ready for carrier handoff |
| Shipping | `api_record_carrier_tracking_event` | Record manual/internal carrier tracking event |
| Shipping Webhook | `api_record_carrier_tracking_event_from_webhook` | Service-role-only route for verified carrier webhook events |

---

## 6. Admin MVP Contract Matrix

| Admin Module | MVP Screens | Read Contract | Write / Action Contract | Permissions | Status |
|---|---|---|---|---|---|
| Dashboard | KPI overview, operational queues, recent audit | RLS-safe read models or server aggregation over Commerce Core tables | No direct writes | Module-specific read permissions | NEEDS_READ_MODEL |
| Products | Product list, product detail, variant detail, cost panel | `products`, `product_variants`, option/tag/category read through RLS; cost through wrapper only | Product/variant create/edit must use server service; cost through `api_update_product_variant_cost` | `product.*`, `product.cost.view`, `product.cost.edit` | READY_FOR_READ, NEEDS_PRODUCT_WRITE_SERVICE |
| Inventory | Balances, movements, reservations, allocations | RLS-safe inventory reads; balances are projection, not source of truth | Adjust/reserve/release/allocate through inventory wrappers | `inventory.*` | READY_FOR_GUARDED_ACTION |
| Customers | Customer list, detail, order history | Customer master and related history through RLS-safe reads | Profile/contact edits need server service; merge/anonymize require future owner-approved workflow | `customer.*` | READY_FOR_READ, NEEDS_CUSTOMER_WRITE_SERVICE |
| Orders | Order list, detail, item snapshots, status history | RLS-safe order reads and server detail loader | Create/edit/cancel/reprice must use order service; no direct table mutation | `order.*` | READY_FOR_READ, NEEDS_ORDER_ACTION_SERVICE |
| Payments | Payment list, transactions, refund history | RLS-safe payment reads | Payment verification/settlement must use guarded service; refund through `api_process_refund` | `payment.*`, `refund.*` | READY_FOR_READ, REFUND_READY |
| Fulfillment | Fulfillment queue, detail, item state | RLS-safe fulfillment reads | Fulfillment state transitions need service/wrapper; QC completion already has wrapper | `fulfillment.*` | READY_FOR_READ, PARTIAL_ACTION_READY |
| Warehouse QC | QC queue, scan summary, exception review | RLS-safe QC session/item total reads | Normal completion through `api_complete_qc_session`; override through `api_override_qc_session`; scan ingestion service still needed | `warehouse.qc.*` | PARTIAL_ACTION_READY, NEEDS_SCAN_SERVICE |
| Shipping | Shipment queue, label state, handoff state, tracking timeline | RLS-safe shipment and tracking reads | Label, handoff, tracking through existing wrappers; carrier webhook through Edge Function boundary | `shipping.*` | READY_FOR_GUARDED_ACTION |
| Returns | Return/RTO queue, inspection, disposition | RLS-safe return reads | Approval, inspection, disposition, restock, exchange, and close need guarded return service; refund already available | `return.*`, `refund.*` | READY_FOR_READ, NEEDS_RETURN_ACTION_SERVICE |
| Promotions | Campaign/rule list, simulator entry | RLS-safe promotion definition reads | Create/publish/evaluate must use promotion service/engine; no direct production evaluation from UI | `promotion.*` | READY_FOR_READ, NEEDS_PROMOTION_ENGINE_SERVICE |
| Users / Roles | Members, roles, invitations | Membership/role reads through RLS-safe admin loader | Invite, deactivate, role assignment, support access grant need guarded admin service and audit | `user.*`, `role.*`, `support.*` | NEEDS_ADMIN_ACCESS_SERVICE |
| Settings | Organization profile, channels, entitlement visibility | Organization/settings/subscription reads through guarded server loader | Subscription/entitlement changes require owner-approved commercial/admin workflow | `settings.*`, `billing.*` | READY_FOR_READ, COMMERCIAL_WRITES_BLOCKED |

---

## 7. A3 Build Order

1. Create Admin app shell with auth boundary, membership context, organization selector, and permission-aware navigation.
2. Implement read-only Dashboard, Products, Inventory, Customers, Orders, Payments, Fulfillment, QC, Shipping, Returns, Promotions, Users/Roles, and Settings pages.
3. Enable guarded actions that already have validated wrappers: inventory actions, cost view/edit, refund, QC completion/override, shipment label, handoff, and tracking update.
4. Add missing service contracts before enabling sensitive buttons for product writes, order actions, payment verification, QC scan ingestion, returns disposition, promotion publishing, user/role changes, and subscription/entitlement changes.
5. Add contract tests for each server action/API before exposing the action in UI.

---

## 8. Acceptance Criteria For A3 Implementation Tasks

Each A3 module task must define:

- Input and output shape
- Server-side authentication and authorization checks
- Tenant scope source
- Required permission and entitlement
- Error codes
- Idempotency key when retryable
- Audit behavior for sensitive mutations
- RLS and cross-tenant negative tests
- Empty, loading, error, and permission UI states

Each write-capable A3 action must also satisfy the guarded action envelope:

- Authenticated server-only boundary
- Active membership
- Tenant scope from trusted membership/resource ownership
- Exact permission check
- Entitlement check when plan-gated
- Input validation
- Idempotency key for retryable, financial, inventory, shipping, webhook, or provider actions
- Audit behavior
- Controlled error contract
- No service role or secret key exposure to browser code

---

## 9. Explicit Blockers

The following are blocked until a separate approved contract exists:

| Area | Blocker |
|---|---|
| Order mutation | Order edit/cancel/reprice workflow needs approved service contract |
| Payment verification | Provider/manual settlement workflow and idempotency contract need approval |
| Return disposition | Inspection/restock/exchange/close workflow needs approved service contract |
| Promotion publishing | Production promotion engine/service contract required |
| User/role mutation | Admin access service with audit and support-access boundary required |
| Subscription writes | Commercial plan/entitlement decision reserved for owner review |

---

## 10. Next Recommended Task

Proceed with `A3 low-risk guarded action skeletons`:

```text
Implement Tier 1 server action skeleton contracts for admin.member.invite.request and admin.organization.profile.update.request.
```

Allowed scope:

```text
src/app
src/lib
docs/api-contracts
tests for read model routing if added
```

Forbidden:

```text
new database schema
new permission codes
direct sensitive table writes from browser
Track B production implementation
```
