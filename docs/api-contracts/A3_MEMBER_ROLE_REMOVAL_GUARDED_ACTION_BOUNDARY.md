# A3 Member Role Removal Guarded Action Boundary

## Status

IMPLEMENTED

Task ID:

```text
A3-ACTION-ROLE-REMOVE-001
```

## Scope

This boundary enables the first guarded member role removal flow:

```text
active organization membership
-> guarded Admin server action
-> public.api_remove_member_role
-> membership_roles delete when assigned
-> audit_logs append
```

## Business Rules

- BR-126: organization access is granted through `organization_memberships`.
- BR-127: merchant roles attach to organization membership.
- BR-128: protected actions require Authentication + Active Membership + Entitlement + Permission.
- BR-130: feature availability does not automatically grant employee action permission.
- BR-132: membership deactivation preserves audit history.
- BR-133: platform staff roles are separate from merchant roles.

## Implemented Boundary

### Server Action

`src/lib/admin/actions/low-risk.ts` exposes:

```text
requestMemberRoleRemoval
```

`src/app/admin/users/actions.ts` exposes:

```text
requestMemberRoleRemovalServerAction
```

Both keep browser code away from direct `membership_roles` writes. The action requires:

```text
admin.member.role.remove.request
members.manage
```

### Database RPC

`public.api_remove_member_role(...)`:

- requires authenticated session
- requires `members.manage`
- requires active actor profile
- requires target membership in the same organization
- requires target membership and profile to be `ACTIVE`
- requires target role in the same organization
- requires target role to be `ACTIVE`
- rejects system-role removal in this first boundary
- rejects self-role removal in this first boundary
- rejects removal when it would leave the target membership with zero roles
- deletes one `membership_roles` row when assigned
- treats already-removed requests as retry-safe no-ops
- appends audit action `admin.member.role.remove`
- appends audit action `admin.member.role.remove.already_removed` for no-op retries

## Explicit Non-Scope

- No full role replacement.
- No member deactivation or suspension.
- No role catalog creation or editing.
- No permission catalog editing.
- No system-role removal.
- No self-role removal.
- No last-role removal.
- No role hierarchy or owner-level authority model.
- No platform support/admin role modeling.
- UI submit enablement is implemented in the follow-up UI contract.

These remain deferred because role authority, owner protection, platform support access, and destructive UX confirmation need explicit review before broader role management.

## Validation

- `tests/a3-member-role-removal-boundary.test.mjs`
- `supabase/validation/021_member_role_removal_boundary_test.sql`
- `supabase/validation/022_member_role_management_e2e_test.sql`
- `supabase/validation/supabase-workflows-suite.mjs`

The SQL validation covers:

- successful role removal by a `members.manage` actor
- already-removed retry no-op
- role-derived permission removal through `public.has_org_permission`
- missing `members.manage` denial
- cross-tenant role denial
- inactive target membership denial
- self-role removal denial
- inactive role denial
- system-role removal denial
- last-role removal denial
- append-only audit evidence

## Security Notes

- The RPC revokes execute from `public` and `anon`, then grants only to `authenticated`.
- `membership_roles` remains protected by RLS for read access and write mutations occur through this guarded RPC.
- The boundary does not use service-role credentials.
- `members.manage` is used because no narrower approved permission exists yet.
- The `membership_roles` junction row is deleted to represent current role state, while `audit_logs` preserves role removal history.

## Next

NEXT: A3 role management end-to-end QA and status reconciliation.
