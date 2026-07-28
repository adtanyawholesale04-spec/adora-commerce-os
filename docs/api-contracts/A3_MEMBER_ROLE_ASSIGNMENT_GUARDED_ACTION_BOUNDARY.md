# A3 Member Role Assignment Guarded Action Boundary

## Status

IMPLEMENTED

Task ID:

```text
A3-ACTION-ROLE-ASSIGN-001
```

## Scope

This boundary enables the first post-invite role assignment flow:

```text
accepted organization membership
-> guarded Admin server action
-> public.api_assign_member_role
-> membership_roles insert when missing
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
requestMemberRoleAssignment
```

`src/app/admin/users/actions.ts` exposes:

```text
requestMemberRoleAssignmentServerAction
```

Both keep browser code away from direct `membership_roles` writes. The action requires:

```text
admin.member.role.assign.request
members.manage
```

### Database RPC

`public.api_assign_member_role(...)`:

- requires authenticated session
- requires `members.manage`
- requires active actor profile
- requires target membership in the same organization
- requires target membership and profile to be `ACTIVE`
- requires target role in the same organization
- requires target role to be `ACTIVE`
- rejects system-role assignment in this first boundary
- rejects self-role assignment in this first boundary
- inserts one `membership_roles` row when missing
- treats duplicate assignment as idempotent
- appends audit action `admin.member.role.assign`
- appends audit action `admin.member.role.assign.duplicate_reused` for retries

## Explicit Non-Scope

- Role removal is implemented in the separate role removal boundary and UI contracts.
- No full role replacement.
- No role catalog creation or editing.
- No permission catalog editing.
- No system-role assignment.
- No self-role assignment.
- No role hierarchy or owner-level authority model.
- No platform support/admin role modeling.

These remain deferred because role authority and platform support access are reserved for explicit business review.

## Validation

- `tests/a3-member-role-assignment-boundary.test.mjs`
- `supabase/validation/020_member_role_assignment_boundary_test.sql`
- `supabase/validation/022_member_role_management_e2e_test.sql`
- `supabase/validation/supabase-workflows-suite.mjs`

The SQL validation covers:

- successful role assignment by a `members.manage` actor
- duplicate retry idempotency
- role-derived permission availability through `public.has_org_permission`
- missing `members.manage` denial
- cross-tenant role denial
- inactive target membership denial
- self-role assignment denial
- inactive role denial
- system-role assignment denial
- append-only audit evidence

## Security Notes

- The RPC revokes execute from `public` and `anon`, then grants only to `authenticated`.
- `membership_roles` remains protected by RLS for read access and write mutations occur through this guarded RPC.
- The boundary does not use service-role credentials.
- `members.manage` is used because no narrower approved permission exists yet.

## Next

NEXT: A3 role replacement/deactivation contract review.
