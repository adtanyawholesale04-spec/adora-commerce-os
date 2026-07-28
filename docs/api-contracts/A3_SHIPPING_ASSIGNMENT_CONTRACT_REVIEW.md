# A3 Shipping Assignment Contract Review

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** BLOCKED  
**Date:** 2026-07-28

## 1. Purpose

Define the owner decisions required before adding guarded Shipping assignment coverage to the A3 member deactivation guard. This document is a contract review only; it does not authorize a schema migration, RPC, UI write action, or permission change.

## 2. Verified Baseline

Canonical work unit: `public.shipments`, linked to `fulfillments` through `fulfillment_id`. The current frozen schema and migration define these shipment statuses:

```text
DRAFT
LABEL_CREATED
READY_FOR_HANDOFF
IN_TRANSIT
DELIVERED
EXCEPTION
RTO
CANCELLED
```

`shipment_packages` are package data below a shipment. `tracking_events` are append-only provider events and are not assignment records. Existing shipping writes already cross guarded boundaries for label creation, handoff, and tracking/webhook ingestion.

## 3. Recommended Decision Table

| Decision | Recommended value | Owner decision |
|---|---|---|
| Assignment storage | Add nullable `shipments.assigned_profile_id` with the same-organization membership FK pattern used by Fulfillment and QC | PENDING |
| Assignment scope | One assignee owns the whole shipment, including its package handoff workflow | PENDING |
| Fulfillment inheritance | Keep Shipping assignment independent from `fulfillments.assigned_profile_id`; do not silently copy or clear it | PENDING |
| Blocking statuses | `LABEL_CREATED`, `READY_FOR_HANDOFF`, `EXCEPTION`, and `RTO` are open Shipping work; `DRAFT` is excluded until a label/handoff task exists | PENDING |
| Non-blocking statuses | `IN_TRANSIT`, `DELIVERED`, and `CANCELLED` do not block member suspension | PENDING |
| Tracking actor separation | Carrier webhook/service actor and authenticated tracking operator remain event actors; they do not become the shipment assignee | PENDING |
| Assignment permission | Reuse existing `shipping.create` until a separately approved assignment permission exists | PENDING |
| Reassignment guard | Require active target membership/profile, reason, idempotency key, and optimistic expected assignee | PENDING |
| Unassigned open work | An unassigned blocking shipment prevents `ACTIVE -> SUSPENDED` | PENDING |
| Audit | Record assign/reassign, actor, target profile, previous profile, reason, and idempotency outcome in the existing audit boundary | PENDING |
| Migration policy | Forward-only migration; revoke direct browser assignment writes; expose a guarded RPC | PENDING |

The blocking-status recommendation is intentionally conservative around `EXCEPTION` and `RTO`: these states still require operational ownership even though carrier movement may already have occurred.

## 4. Boundaries

In scope after approval:

- membership-scoped shipment assignment and reassignment
- assignment-aware deactivation coverage for open Shipping work
- guarded RPC with tenant, permission, active-membership, reason, idempotency, and concurrency checks
- focused SQL and end-to-end validation

Out of scope:

- package-level assignees
- changing carrier webhook signature verification or event mapping
- changing shipment lifecycle transitions
- assigning tracking events to a human actor
- enabling label creation, handoff, or tracking UI in the read-only Shipping screen

## 5. Blocker / Required Approval

Implementation is **BLOCKED** until the Owner approves the decision table above, especially:

1. the canonical `shipments.assigned_profile_id` model;
2. the exact blocking status set; and
3. independent Shipping ownership versus Fulfillment ownership.

No migration or protected write behavior should be added before that approval.

## 6. Next Step

**NEXT: Owner approval of the Shipping assignment decision table.** After approval, create the forward migration, guarded assignment RPC, validation, and deactivation coverage update.
