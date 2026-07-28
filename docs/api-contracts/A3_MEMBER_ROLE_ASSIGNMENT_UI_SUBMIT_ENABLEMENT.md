# A3 Member Role Assignment UI Submit Enablement

## Status

IMPLEMENTED

Task ID:

```text
A3-ACTION-ROLE-ASSIGN-UI-001
```

## Scope

This contract enables the `/admin/users` role management affordance for the already approved role assignment boundary:

```text
Users / Roles read model
-> permission-aware member + role selection
-> guarded Admin server action
-> public.api_assign_member_role
-> audit_logs append
-> read model revalidation
```

## Business Rules

- BR-126: organization access is granted through `organization_memberships`.
- BR-127: merchant roles attach to organization membership.
- BR-128: protected actions require Authentication + Active Membership + Entitlement + Permission.
- BR-130: feature availability does not automatically grant employee action permission.
- BR-132: membership deactivation preserves audit history.
- BR-133: platform staff roles are separate from merchant roles.

## Implemented UI Boundary

`src/app/admin/users/member-role-assignment-form.tsx`:

- renders only from the `/admin/users` server read model
- enables submit only when `members.manage` is present
- lists active members whose membership and profile are both `ACTIVE`
- excludes the acting profile from target member choices
- lists only active non-system roles
- hides already-assigned roles for the selected member
- validates optional reason length at 500 characters
- sends only `membershipId`, `roleId`, `reason`, and `clientActionId`

`src/app/admin/users/actions.ts` remains the server action boundary:

```text
requestMemberRoleAssignmentServerAction
```

## Security Notes

- Browser code does not call Supabase `.rpc()`, `.insert()`, `.update()`, or `.delete()`.
- Browser code does not use service-role credentials or Supabase Auth Admin credentials.
- UI filtering is only an affordance; authorization, tenant scope, self-assignment denial, system-role denial, and audit remain enforced by `public.api_assign_member_role`.
- Duplicate role assignment remains idempotent and audited by the RPC.

## Explicit Non-Scope

- Role removal is implemented in the separate role removal UI contract.
- No full role replacement.
- No role catalog creation or editing.
- No permission catalog editing.
- No system-role assignment.
- No self-role assignment.
- No role hierarchy or owner-level authority model.
- No platform support/admin role modeling.

## Validation

- `tests/a3-member-role-assignment-ui-submit.test.mjs`
- `npm.cmd test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

## Next

NEXT: A3 role management end-to-end QA and status reconciliation.
