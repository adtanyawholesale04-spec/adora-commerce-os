# A3 Member Role Removal UI Submit Enablement

## Status

IMPLEMENTED

Task ID:

```text
A3-ACTION-ROLE-REMOVE-UI-001
```

## Scope

`/admin/users` now exposes a permission-aware member role removal form connected to `requestMemberRoleRemovalServerAction`.

The form:

- requires `members.manage` from the server read model
- lists only active members with active profiles and excludes the current profile
- lists only active, non-system roles already assigned to the selected member
- blocks submit when the member has one or fewer current roles
- validates the optional audit reason at 500 characters
- asks for destructive confirmation before submission
- displays audited success, already-removed no-op, and failure results
- refreshes the users read model after a successful request

The browser does not call Supabase directly. It submits `membershipId`, `roleId`, `reason`, and a client idempotency key to the existing server action. The RPC remains the final authority for tenant, membership, role, self-removal, system-role, and last-role checks.

## Explicit Non-Scope

- No self-role removal.
- No system-role removal.
- No last-role removal.
- No role replacement.
- No member deactivation or suspension.
- No optimistic client-side mutation.

## Validation

- `tests/a3-member-role-removal-ui-submit.test.mjs`
- existing `tests/a3-member-role-removal-boundary.test.mjs`
- `tests/a3-member-role-management-e2e-qa.test.mjs`
- `npm.cmd test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`

## Next

NEXT: A3 role replacement/deactivation contract review.
