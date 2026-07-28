# A3 Fulfillment Assignment Contract Review

**Task ID:** `A3-FULFILLMENT-ASSIGNMENT-001`  
**Track:** A - Commerce Core  
**Module:** Fulfillment  
**Status:** `APPROVED`  
**Purpose:** Define the canonical member assignment boundary needed to cover fulfillment work before member deactivation can be safely enabled.

## Verified current model

The frozen `fulfillments` table contains `organization_id`, `warehouse_id`, lifecycle `status`, and `created_by`. `fulfillment_events.actor_profile_id` records who performed an event. It does not identify the current assignee and must not be treated as an assignment source.

## Proposed domain-local contract

Subject to owner approval, Fulfillment should own its assignment boundary:

```text
fulfillment assignment
  -> one active organization membership/profile at a time
  -> assignment and reassignment are audited
  -> all writes go through a guarded server/RPC boundary
  -> tenant and active-membership checks are enforced server-side
```

The implementation must not expose direct browser writes to fulfillment ownership data.

## Owner approval

**Approved:** 2026-07-28

The owner approved all recommended values:

- assignee is stored at fulfillment level as one active member profile;
- `READY_TO_PICK`, `PICKING`, `QC_PENDING`, `QC_PASSED`, `PACKING`, and `READY_TO_SHIP` are blocking statuses;
- assignment owns the complete fulfillment;
- assign/reassign uses the existing `warehouse.pick` permission;
- reason, idempotency, before/after audit, and server-side tenant checks are required;
- an open fulfillment without an assignee blocks suspension;
- implementation uses a forward migration and guarded RPC only.

## Decisions required before migration

1. **Assignment storage:** approve a membership-scoped assignee column on `fulfillments` or a fulfillment-local assignment history relation.
2. **Blocking statuses:** confirm which existing statuses count as open assigned work. Candidate set for review: `READY_TO_PICK`, `PICKING`, `QC_PENDING`, `QC_PASSED`, `PACKING`, and `READY_TO_SHIP`.
3. **Assignment scope:** confirm whether the assignee owns the complete fulfillment or only picking work/items.
4. **Reassignment:** confirm who may assign/reassign, whether a reason is mandatory, and whether reassignment is required before suspension.
5. **Unassigned work:** confirm whether an open fulfillment with no assignee blocks suspension. The safest default is **yes**.
6. **Permissions:** confirm whether existing `warehouse.pick` is sufficient or a new permission is required. No new permission will be created without approval.
7. **Migration range:** approve the forward migration and module-owner review before changing the frozen core schema.

## Required guarded operations

After approval, implement and validate assign, reassign, and any allowed clear-assignment operation; expose the current assignment in the fulfillment read model; include assigned fulfillment work in the member deactivation predicate; and enforce idempotency, controlled errors, tenant authorization, and before/after audit state.

## Implementation boundary

Implemented in `20260728135454_a3_fulfillment_assignment_boundary.sql` with `fulfillments.assigned_profile_id`, a membership-scoped foreign key, guarded `api_assign_fulfillment`, restricted direct updates, audit/idempotency, and Fulfillment coverage in `api_deactivate_member`.

**NEXT:** Proceed with the next approved assignment domain: Warehouse QC.
