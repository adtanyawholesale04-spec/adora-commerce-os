# A3 Member Deactivation Database Boundary

**Task ID:** `A3-MEMBER-DEACTIVATION-DATABASE-BOUNDARY-001`  
**Status:** `IMPLEMENTED`  
**Migration:** `supabase/migrations/20260728133224_a3_member_deactivation_boundary.sql`

## Delivered

- Added `public.api_deactivate_member(...)` as an authenticated guarded `SECURITY DEFINER` RPC.
- Requires active actor context, `members.manage`, same-tenant target, reason, and idempotency key.
- Rejects self-deactivation and active `owner`/last-authority membership targets.
- Preserves profile, membership roles, commercial history, and audit history.
- Detects assigned open Conversations and action-required Notifications.
- Applies the approved coverage policy: unknown Fulfillment/QC/Shipping/Returns assignment coverage blocks the transition.
- Supports audited retry-safe handling for already `SUSPENDED` memberships.
- Revokes execute from `public` and `anon`, then grants execute to `authenticated`.

## Validation

`supabase/validation/024_member_deactivation_boundary_test.sql` covers:

- action-required notification blocking;
- approved coverage-gap blocking;
- suspended retry behavior;
- role-link retention and audit evidence.

The boundary is implemented, but an `ACTIVE -> SUSPENDED` transition will remain blocked until the remaining operational assignment domains have canonical coverage.

NEXT: Owner approval of the Shipping assignment decision table.
