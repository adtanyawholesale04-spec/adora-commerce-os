# A3 Fulfillment Assignment Database Boundary

**Task ID:** `A3-FULFILLMENT-ASSIGNMENT-001`  
**Status:** `IMPLEMENTED`  
**Migration:** `supabase/migrations/20260728135454_a3_fulfillment_assignment_boundary.sql`

## Delivered boundary

- Adds nullable `fulfillments.assigned_profile_id`.
- Enforces tenant membership through `(organization_id, assigned_profile_id)` foreign key.
- Adds an assignee/status lookup index.
- Revokes direct `UPDATE` on `fulfillments` from browser/API roles.
- Adds `api_assign_fulfillment` for initial assignment and reassignment.
- Requires active authentication, active `warehouse.pick` permission, active assignee membership/profile, reason, idempotency key, and tenant-scoped fulfillment lookup.
- Uses an expected-assignee value for optimistic concurrency protection on reassignment.
- Records append-only audit events for assign, reassign, already-assigned, and duplicate-reused requests.
- Updates `api_deactivate_member` so assigned open Fulfillment work and unassigned open Fulfillment work block suspension.
- Removes `fulfillment` from the unknown coverage gap list; QC, Shipping, and Returns remain guarded gaps.

## Validation

`supabase/validation/025_fulfillment_assignment_boundary_test.sql` covers assignment, idempotent retry, reassignment, direct-write denial, persisted assignee state, audit evidence, and deactivation blocking from unassigned open work.

**NEXT:** Owner approval of the Shipping assignment decision table.
