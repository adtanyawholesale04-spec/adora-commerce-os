# A3 Shipping Assignment Database Boundary

**Project:** ADORA Commerce OS (ACOS)
**Status:** VALIDATED
**Migration:** `20260728150119_a3_shipping_assignment_boundary.sql`
**Validation:** `027_shipping_assignment_boundary_test.sql`

## Implemented Boundary

- Adds nullable `shipments.assigned_profile_id` with same-organization membership FK and assignment/status index.
- Revokes direct browser `UPDATE` on `shipments` for `public`, `anon`, and `authenticated`.
- Adds `api_assign_shipment` as a guarded `SECURITY DEFINER` RPC with empty search path, authenticated actor, tenant, `shipping.create`, active target membership/profile, approved blocking-status, reason, idempotency, optimistic concurrency, and audit checks.
- Supports assign, already-assigned, reassign, and duplicate-reused outcomes.
- Extends `api_deactivate_member` coverage to assigned and unassigned shipments in `LABEL_CREATED`, `READY_FOR_HANDOFF`, `EXCEPTION`, and `RTO`.
- Leaves carrier webhook/tracking actors separate from shipment assignment ownership.

## Validation Gate

The focused SQL validation covers initial assignment, idempotent retry, reassignment, terminal-status denial, direct-write denial, unassigned Shipping deactivation blocking, persisted assignee, and audit evidence.

Fresh local replay, member-role-management, security, workflow, and commerce integration gates passed.

**NEXT:** Implement the approved Returns assignment database boundary.
