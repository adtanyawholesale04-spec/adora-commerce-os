# A3 Warehouse QC Assignment Contract Review

**Task ID:** `A3-WAREHOUSE-QC-ASSIGNMENT-001`  
**Track:** A - Commerce Core  
**Module:** Warehouse QC  
**Status:** `APPROVED`  
**Purpose:** Define the canonical member assignment boundary required to cover QC work before member deactivation can be safely enabled.

## Verified current model

The canonical QC work unit is `fulfillment_qc_sessions`, linked to one `fulfillment` and constrained to one active session per fulfillment. The current fields include:

- `started_by` and `completed_by`, which identify actors who performed lifecycle actions;
- `status`, with approved schema values `PENDING`, `IN_PROGRESS`, `PASSED`, `FAILED`, and `CANCELLED`;
- item-level projections and scan actors, which are not ownership sources.

The frozen schema has no QC assignee field or QC assignment history relation. `started_by`, `completed_by`, and `scanned_by` must not be interpreted as the current assignee.

## Recommended domain-local model

Add assignment at the `fulfillment_qc_sessions` level, separate from the Fulfillment picker:

```text
QC session
  -> one active organization membership/profile at a time
  -> assignment may differ from fulfillment.assigned_profile_id
  -> assignment/reassignment is guarded and audited
  -> scans and completion remain actor events, not ownership state
```

This keeps QC ownership with the QC domain and avoids overwriting Fulfillment assignment when work moves between warehouse roles.

## Owner approval

**Approved:** 2026-07-28

The owner approved all recommended values:

- store one active assignee at `fulfillment_qc_sessions.assigned_profile_id`;
- treat `PENDING`, `IN_PROGRESS`, and `FAILED` as blocking QC work;
- assign the complete QC session, including its item totals and scans;
- keep QC assignment independent from `fulfillments.assigned_profile_id`;
- use guarded assign/reassign with reason, idempotency, optimistic concurrency, and audit;
- block suspension when an open QC session has no assignee;
- use existing `warehouse.qc`; keep `warehouse.qc.override` limited to override actions;
- implement through a forward migration after QC module-owner review.

## Approved decision table

1. **Assignment storage:** `fulfillment_qc_sessions.assigned_profile_id`, constrained to an organization membership.
2. **Blocking statuses:** `PENDING`, `IN_PROGRESS`, and `FAILED`; `PASSED` and `CANCELLED` are non-blocking.
3. **Assignment scope:** complete QC session, including item totals and scans.
4. **Inheritance:** independent from `fulfillments.assigned_profile_id`; no implicit inheritance or automatic reassignment.
5. **Reassignment:** guarded by `warehouse.qc`, mandatory reason, idempotency, optimistic concurrency, and audit.
6. **Unassigned work:** open QC session without an assignee blocks suspension.
7. **Permission:** existing `warehouse.qc`; `warehouse.qc.override` remains limited to override actions.
8. **Migration range:** forward migration with QC module-owner review.

## Required guarded operations after approval

- assign a QC session;
- reassign a QC session with an expected-current-assignee concurrency guard;
- expose current assignment in the QC read model without exposing scan values;
- include assigned and unassigned open QC sessions in member deactivation coverage;
- enforce authentication, active tenant membership, `warehouse.qc`, reason, idempotency, controlled errors, and before/after audit.

## Implementation boundary

Implemented in `20260728143613_a3_warehouse_qc_assignment_boundary.sql` with a QC-session assignee, guarded assign/reassign RPC, restricted direct updates, audit/idempotency, and QC coverage in `api_deactivate_member`.

**NEXT:** Implement the approved Returns assignment database boundary.
