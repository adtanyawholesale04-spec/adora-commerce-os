# A3 Returns Assignment Database Boundary

**Project:** ADORA Commerce OS (ACOS)
**Status:** VALIDATED
**Migration:** `20260728152602_a3_returns_assignment_boundary.sql`
**Validation:** `028_returns_assignment_boundary_test.sql`

## Implemented Boundary

- Adds nullable `returns.assigned_profile_id` with same-organization membership FK and assignment/status index.
- Revokes direct browser `UPDATE` on `returns` for `public`, `anon`, and `authenticated`.
- Adds `api_assign_return` as a guarded `SECURITY DEFINER` RPC with empty search path, authenticated actor, tenant, `return.manage`, active target membership/profile, approved blocking-status, reason, idempotency, optimistic concurrency, and audit checks.
- Supports assign, already-assigned, reassign, and duplicate-reused outcomes across `CUSTOMER_RETURN`, `EXCHANGE`, and `RTO` cases.
- Extends `api_deactivate_member` coverage to assigned and unassigned returns in `REQUESTED`, `APPROVED`, `IN_TRANSIT`, `RECEIVED`, and `INSPECTION`.
- Leaves refund, inspection/disposition, exchange replacement, and return status-history actors outside assignment ownership.

## Validation Gate

The focused SQL validation covers initial assignment, idempotent retry, reassignment, terminal-status denial, direct-write denial, unassigned Returns deactivation blocking, persisted assignee, and audit evidence. Fresh replay, security/RLS validation, workflow regression, commerce integration, typecheck, lint, and the full test suite all pass.

**NEXT:** Final Part 2C status reconciliation, then Track B Business Rule Review.
