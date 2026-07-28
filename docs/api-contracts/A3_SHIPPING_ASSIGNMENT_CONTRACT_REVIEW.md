# A3 Shipping Assignment Contract Review

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** APPROVED
**Date:** 2026-07-28
**Owner approval:** Recorded 2026-07-28 for all recommended decision values below.

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

## 3. Approved Decision Table

| Decision | Recommended value | Owner decision |
|---|---|---|
| Assignment storage | Add nullable `shipments.assigned_profile_id` with the same-organization membership FK pattern used by Fulfillment and QC | APPROVED |
| Assignment scope | One assignee owns the whole shipment, including its package handoff workflow | APPROVED |
| Fulfillment inheritance | Keep Shipping assignment independent from `fulfillments.assigned_profile_id`; do not silently copy or clear it | APPROVED |
| Blocking statuses | `LABEL_CREATED`, `READY_FOR_HANDOFF`, `EXCEPTION`, and `RTO` are open Shipping work; `DRAFT` is excluded until a label/handoff task exists | APPROVED |
| Non-blocking statuses | `IN_TRANSIT`, `DELIVERED`, and `CANCELLED` do not block member suspension | APPROVED |
| Tracking actor separation | Carrier webhook/service actor and authenticated tracking operator remain event actors; they do not become the shipment assignee | APPROVED |
| Assignment permission | Reuse existing `shipping.create` until a separately approved assignment permission exists | APPROVED |
| Reassignment guard | Require active target membership/profile, reason, idempotency key, and optimistic expected assignee | APPROVED |
| Unassigned open work | An unassigned blocking shipment prevents `ACTIVE -> SUSPENDED` | APPROVED |
| Audit | Record assign/reassign, actor, target profile, previous profile, reason, and idempotency outcome in the existing audit boundary | APPROVED |
| Migration policy | Forward-only migration; revoke direct browser assignment writes; expose a guarded RPC | APPROVED |

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

## 5. Approval Record

The Owner approved the decision table above, including:

1. the canonical `shipments.assigned_profile_id` model;
2. the exact blocking status set; and
3. independent Shipping ownership versus Fulfillment ownership.

The approved design is implemented in `20260728150119_a3_shipping_assignment_boundary.sql`; validation remains the final gate.

## 6. Next Step

**NEXT: Fresh replay, security validation, and Shipping workflow regression validation.**
