# A3 Returns Assignment Contract Review

**Project:** ADORA Commerce OS (ACOS)
**Track:** A - Commerce Core
**Phase:** A3 - Commerce Admin MVP
**Status:** APPROVED
**Date:** 2026-07-28
**Owner approval:** Recorded 2026-07-28 for all recommended decision values below.

## 1. Purpose

Define the owner decisions required before adding guarded Returns assignment coverage to the A3 member deactivation guard. This document is a contract review only; it does not authorize a schema migration, RPC, UI write action, permission change, refund action, inventory disposition, or exchange workflow.

## 2. Verified Baseline

Canonical work unit: `public.returns`, linked to `orders` through `order_id`. The current frozen schema and migration define these return types and statuses:

```text
return_type: CUSTOMER_RETURN, EXCHANGE, RTO

status: REQUESTED, APPROVED, IN_TRANSIT, RECEIVED, INSPECTION,
        RESOLVED, REJECTED, CANCELLED
```

`return_items` are item data below a return. `return_status_history` records lifecycle actors, while `return_inventory_dispositions.inspected_by` records inspection actors. Neither is an assignment source. Business Rules also require returned stock to pass inspection before restock and keep RTO inside the Return domain with a distinct `return_type`.

## 3. Approved Decision Table

| Decision | Recommended value | Owner decision |
|---|---|---|
| Assignment storage | Add nullable `returns.assigned_profile_id` with the same-organization membership FK pattern used by Fulfillment, QC, and Shipping | APPROVED |
| Assignment scope | One assignee owns the whole return case, including its item review and resolution handoff; no item-level assignees | APPROVED |
| Return type scope | Same assignment boundary covers `CUSTOMER_RETURN`, `EXCHANGE`, and `RTO`; `return_type` remains the workflow discriminator | APPROVED |
| Blocking statuses | `REQUESTED`, `APPROVED`, `IN_TRANSIT`, `RECEIVED`, and `INSPECTION` are open Return work | APPROVED |
| Non-blocking statuses | `RESOLVED`, `REJECTED`, and `CANCELLED` do not block member suspension | APPROVED |
| Inspection actor separation | `return_status_history.changed_by` and `return_inventory_dispositions.inspected_by` remain event/inspection actors; they do not become the return assignee | APPROVED |
| Assignment permission | Reuse existing `return.manage`; `return.inspect` remains required for inspection/disposition actions | APPROVED |
| Reassignment guard | Require active target membership/profile, reason, idempotency key, and optimistic expected assignee | APPROVED |
| Unassigned open work | An unassigned blocking return prevents `ACTIVE -> SUSPENDED` | APPROVED |
| Audit | Record assign/reassign, actor, target profile, previous profile, return type/status, reason, and idempotency outcome in the existing audit boundary | APPROVED |
| Migration policy | Forward-only migration; revoke direct browser assignment writes; expose a guarded RPC | APPROVED |

The recommendation intentionally keeps refund, restock, disposition, exchange replacement, and RTO state transitions outside assignment. Assignment provides operational ownership; each sensitive action keeps its own permission and guarded service boundary.

## 4. Boundaries

In scope after approval:

- membership-scoped return assignment and reassignment
- assignment-aware deactivation coverage for open Returns/RTO cases
- guarded RPC with tenant, permission, active-membership, reason, idempotency, and concurrency checks
- focused SQL and end-to-end validation

Out of scope:

- return-item-level assignees
- refund processing or refund approval
- inventory disposition or restock movement
- exchange replacement order creation
- changing RTO lifecycle rules or return status transitions
- enabling mutation controls in the read-only Returns screen

## 5. Approval Record

The Owner approved the decision table above, including:

1. the canonical `returns.assigned_profile_id` model;
2. the exact blocking status set; and
3. whether `return.manage` is the assignment permission while `return.inspect` remains inspection-only.

This approval authorizes the implementation design handoff. It does not itself apply a migration or enable protected write behavior.

## 6. Next Step

**NEXT: Track B Business Rule Review.**
