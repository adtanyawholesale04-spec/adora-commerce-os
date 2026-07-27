# ACOS A3 Guarded Action Service Contract Hardening

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** A3-ACTION-CONTRACT-001  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

This document hardens the A3 write/action boundary after the read-only Admin MVP screens have been implemented.

It does not add schema, migrations, roles, permissions, statuses, financial rules, provider contracts, write endpoints, or visible write buttons. It defines the minimum service contract that must exist before an Admin action can mutate Commerce Core data.

---

## 2. Mandatory Guarded Action Envelope

Every write-capable Admin action must run through a server-only boundary. A browser component may submit an intent, but it must not directly insert, update, delete, or call sensitive RPCs without this envelope.

Required checks:

1. Authentication: resolve the Supabase authenticated user on the server.
2. Active Membership: resolve the active organization membership from trusted server context.
3. Tenant Scope: derive `organization_id` from membership context or verify the target resource belongs to the active organization before mutation.
4. Permission: check the exact permission required for the action, not only the navigation permission.
5. Entitlement: check the active organization entitlement when the feature is plan-gated.
6. Input Validation: validate IDs, enums, amounts, reason strings, payload size, and required fields before calling a wrapper/RPC.
7. Idempotency: require an idempotency key for retryable, financial, inventory, shipping, webhook, or external-provider actions.
8. Audit: write or require wrapper-level audit for financial, inventory, fulfillment, shipping, return, user/role, support, cost, and settings mutations.
9. Error Contract: return controlled error codes and user-safe messages; do not leak SQL details, provider secrets, or cross-tenant existence signals.
10. Service Role Boundary: service role and secret keys may only be used in server-only or Edge Function boundaries and must never be exposed to browser code.

---

## 3. Action Risk Tiers

| Tier | Scope | Examples | Contract Requirement |
|---|---|---|---|
| Tier 0 | Read-only | Dashboard, lists, detail snapshots | RLS-safe reads or server read models |
| Tier 1 | Low-risk admin intent | Invite member request, organization profile update request | Server action envelope, permission, tenant scope, audit |
| Tier 2 | Operational state transition | Product archive, customer contact edit, fulfillment handoff | Approved service contract plus negative tests |
| Tier 3 | Transaction-critical mutation | Refund, inventory adjustment, cost edit, QC override, shipment label, carrier webhook | Existing validated wrapper/RPC or new approved wrapper, idempotency, audit, cross-tenant tests |

Tier 2 and Tier 3 actions must not be enabled only because the UI can render a button.

---

## 4. First Allowed Action Candidates

These are the first A3 action candidates that may be designed next. They still require implementation-specific tests before UI exposure.

| Action ID | Tier | Required Permission | Boundary | Notes |
|---|---:|---|---|---|
| `admin.member.invite.request` | 1 | `members.manage` | Server action | Records an invitation request/audit intent; Auth Admin write behavior must stay server-only |
| `admin.organization.profile.update.request` | 1 | `organization.settings.edit` | Server action | Organization profile changes only; subscription and entitlement writes remain blocked |
| `admin.role.assignment.request` | 2 | `members.manage` or future approved role permission | Guarded admin service | Needs audit and role target validation before enablement |
| `inventory.adjustment.request` | 3 | `inventory.adjust` | Existing inventory wrapper path | Must use inventory movement wrapper and idempotency/audit contract |
| `product.cost.update.request` | 3 | `product.cost.edit` | `api_update_product_variant_cost` | Cost edit must stay wrapper-backed |
| `payment.refund.process` | 3 | `payment.refund` | `api_process_refund` | Financial action; idempotency and amount validation are mandatory |
| `warehouse.qc.complete` | 3 | `warehouse.qc` | `api_complete_qc_session` | Normal QC completion wrapper only |
| `warehouse.qc.override` | 3 | `warehouse.qc.override` | `api_override_qc_session` | Elevated override; reason and audit mandatory |
| `shipping.label.create` | 3 | `shipping.print_label` | `api_create_shipment_label` | Provider integration boundary required before real label purchase |
| `shipping.handoff.mark_ready` | 3 | `shipping.create` | `api_mark_shipment_ready_for_handoff` | Must verify label/QC state before mutation |
| `shipping.tracking.record` | 3 | `shipping.create` | `api_record_carrier_tracking_event` | Manual/internal tracking only |
| `shipping.carrier_webhook.ingest` | 3 | Edge Function service role boundary | `api_record_carrier_tracking_event_from_webhook` | Signature verification and idempotency required before RPC |
| `return.inspection.record` | 3 | `return.manage` | Future guarded return service | Not UI-ready until return service contract exists |

---

## 5. Explicitly Not Ready

The following actions remain blocked or not ready for UI exposure:

| Area | Reason |
|---|---|
| Order edit/cancel/reprice | Needs approved order action service and state transition rules |
| Payment verification/settlement | Needs provider/manual settlement contract |
| Return disposition/restock/exchange/close | Needs guarded return service contract |
| Promotion publish/evaluate | Needs promotion engine contract |
| Subscription, plan, entitlement writes | Owner/commercial decision required |
| Track B content, media, campaign production writes | Track B is not approved for production implementation |

---

## 6. Required Test Shape

Before an action is exposed in Admin UI, tests must cover:

- unauthenticated request denial
- inactive or missing membership denial
- missing permission denial
- cross-tenant target denial
- malformed input denial
- idempotency replay behavior for retryable actions
- audit behavior for sensitive actions
- success path through the approved wrapper or service
- browser bundle check confirming no service role or secret key exposure

---

## 7. Next Recommended Implementation

Tier 1 guarded server action skeletons are now implemented in `docs/api-contracts/A3_LOW_RISK_GUARDED_ADMIN_ACTION_SKELETONS.md`.

Next, add disabled/permission-aware UI affordances for:

```text
admin.member.invite.request
admin.organization.profile.update.request
```

Allowed next scope:

```text
src/lib/admin/actions
src/app/admin/users
src/app/admin/settings
docs/api-contracts
tests
```

Forbidden next scope:

```text
new database schema
new roles or permissions
direct browser writes to sensitive tables
subscription or entitlement mutation
Track B production implementation
```
