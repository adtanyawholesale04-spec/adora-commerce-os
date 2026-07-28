# A3 Role Replacement Database Boundary

**Task ID:** `A3-ROLE-REPLACEMENT-DATABASE-BOUNDARY-001`  
**Status:** `IMPLEMENTED`  
**Migration:** `supabase/migrations/20260728120110_a3_role_replacement_boundary.sql`

## Delivered

- Added `public.api_replace_member_role(...)` as a server-only guarded `SECURITY DEFINER` RPC.
- Requires authenticated actor, active profile/membership, same-tenant target, and `members.manage`.
- Replaces one active non-system source role with one active non-system replacement role in one transaction.
- Protects self-actions and memberships carrying the `owner` role.
- Requires a 10-500 character reason and a non-null idempotency key.
- Records before/after role state and request metadata in append-only audit logs.
- Supports retry-safe duplicate reuse and rejects the same idempotency key with a different normalized request.
- Revokes execute from `public` and `anon`, then grants execute to `authenticated`.

## Validation

`supabase/validation/023_member_role_replacement_boundary_test.sql` covers:

- role replacement success;
- role-derived permission removal and grant;
- idempotent retry audit;
- idempotency conflict rejection;
- current membership role state and audit count.

The focused member-role suite passed after a fresh local Supabase migration replay.

## Explicit boundary

This migration does not implement membership deactivation. The frozen schema has no canonical predicate for open assigned work, and the fulfillment model has no member assignment field. Deactivation remains blocked until that cross-module rule is defined without inventing ownership semantics.

NEXT: Part 2C - Add approved member assignment coverage for Warehouse QC, Shipping, and Returns.
