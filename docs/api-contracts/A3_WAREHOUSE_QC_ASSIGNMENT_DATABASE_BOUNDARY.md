# A3 Warehouse QC Assignment Database Boundary

**Task ID:** `A3-WAREHOUSE-QC-ASSIGNMENT-001`  
**Status:** `IMPLEMENTED`  
**Migration:** `supabase/migrations/20260728143613_a3_warehouse_qc_assignment_boundary.sql`

## Delivered boundary

- Adds nullable `fulfillment_qc_sessions.assigned_profile_id`.
- Enforces tenant membership through `(organization_id, assigned_profile_id)` foreign key.
- Adds a QC assignee/status lookup index.
- Revokes direct `UPDATE` on QC sessions from browser/API roles.
- Adds `api_assign_qc_session` for initial assignment and reassignment.
- Requires active authentication, active `warehouse.qc` permission, active assignee membership/profile, reason, idempotency key, and tenant-scoped QC session lookup.
- Restricts assignment to `PENDING`, `IN_PROGRESS`, and `FAILED` sessions.
- Uses an expected-assignee value for optimistic concurrency protection.
- Records append-only audit events for assign, reassign, already-assigned, and duplicate-reused requests.
- Updates `api_deactivate_member` so assigned and unassigned open QC sessions block suspension.
- Removes `qc` from the unknown coverage gap list; Shipping and Returns remain guarded gaps.

## Boundary relationship

QC assignment is independent from `fulfillments.assigned_profile_id`. `started_by`, `completed_by`, and `scanned_by` remain actor fields and are not rewritten as ownership state.

## Validation

`supabase/validation/026_warehouse_qc_assignment_boundary_test.sql` covers assignment, idempotent retry, reassignment, terminal-state denial, direct-write denial, persisted assignee state, audit evidence, and deactivation blocking from unassigned open QC work.

**NEXT:** Shipping assignment contract review.
