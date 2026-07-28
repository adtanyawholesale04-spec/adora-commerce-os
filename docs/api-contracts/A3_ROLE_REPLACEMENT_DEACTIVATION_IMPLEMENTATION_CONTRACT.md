# A3 Role Replacement / Deactivation Implementation Contract

**Task ID:** `A3-ROLE-MANAGEMENT-IMPLEMENTATION-CONTRACT-001`  
**Status:** `IMPLEMENTED`  
**Depends on:** `A3-ROLE-MANAGEMENT-CONTRACT-REVIEW-001` (`APPROVED`)

## Scope

This contract translates the approved decision table into implementation requirements for two server-only guarded actions. It does not create a migration, RPC, permission, role, membership status, or UI write behavior. Part 2 will implement the database boundary only after this contract is reviewed against the existing schema and migration patterns.

## Shared action envelope

Both actions use the existing guarded action envelope:

- actor identity comes from the authenticated Supabase session;
- organization scope is derived server-side from the selected active membership;
- client-supplied organization IDs are treated as input context and revalidated, never as authority;
- actor must have an active profile, active membership, active entitlement, and `members.manage`;
- target membership must belong to the same organization and satisfy the action-specific state guards;
- browser code never writes `organization_memberships` or `membership_roles` directly;
- server errors are controlled error codes, not database error text;
- every accepted mutation requires a reason and idempotency key.

## Contract A: `admin.member.role.replace.request`

### Request

```text
target_membership_id: uuid, required
source_role_id: uuid, required
replacement_role_id: uuid, required
reason: string, required, trimmed length 10-500
idempotency_key: string, required, opaque request key
```

The actor ID and organization ID are server-derived. The action replaces exactly one active non-system source role with one active non-system replacement role for one active target membership.

### Guards

- actor is authenticated and has an active profile and active membership;
- actor has `members.manage` in the target organization;
- target membership and profile are `ACTIVE` and same-tenant;
- source and replacement roles are active, same-tenant, and non-system;
- actor membership is not the target membership;
- target is not an owner/last-authority protected member;
- source and replacement role IDs are distinct;
- replacement cannot leave the target with zero roles;
- a pending request with the same idempotency key must have the same normalized request or return an idempotency conflict.

### Transaction

1. Lock the target membership and relevant current role rows.
2. Re-check all actor, tenant, target, role, and authority guards inside the transaction.
3. If the source role is missing and the replacement role is already present, return an audited retry-safe no-op.
4. Otherwise remove the source role and add the replacement role in the same transaction.
5. Append the audit event with before/after role IDs and the request metadata.
6. Commit only when the target retains at least one role and no partial role set is observable.

### Result and errors

Success returns `ok`, `target_membership_id`, `source_role_id`, `replacement_role_id`, `audit_log_id`, and `idempotency_reused`.

Required controlled errors include `AUTH_REQUIRED`, `MEMBERS_MANAGE_REQUIRED`, `TENANT_MISMATCH`, `TARGET_NOT_ACTIVE`, `ROLE_NOT_ACTIVE`, `SYSTEM_ROLE_FORBIDDEN`, `SELF_ACTION_FORBIDDEN`, `OWNER_PROTECTED`, `ROLE_REPLACEMENT_INVALID`, `LAST_ROLE_FORBIDDEN`, `IDEMPOTENCY_CONFLICT`, and `VALIDATION_FAILED`.

Audit actions:

- `admin.member.role.replace`
- `admin.member.role.replace.duplicate_reused`

## Contract B: `admin.member.deactivate.request`

### Request

```text
target_membership_id: uuid, required
reason: string, required, trimmed length 10-500
idempotency_key: string, required, opaque request key
```

The action transitions only `ACTIVE` membership to `SUSPENDED`. It does not delete the Auth user, global profile, commercial history, audit history, or existing `membership_roles` rows.

### Guards

- actor is authenticated and has an active profile and active membership;
- actor has `members.manage` in the target organization;
- target membership is same-tenant and currently `ACTIVE`;
- actor membership is not the target membership;
- target is not an owner/last-authority protected member;
- target has no open assigned work that the owning workflow marks as blocking deactivation;
- same idempotency key must match the normalized request or return an idempotency conflict.

### Transaction

1. Lock the target membership and evaluate blocking work inside the transaction.
2. Re-check actor, tenant, self-action, authority, and current-status guards.
3. Update membership status from `ACTIVE` to `SUSPENDED` while retaining role links.
4. Append the audit event with the before/after status and request metadata.
5. Commit only after the status and audit record are consistent.

Existing `SUSPENDED` requests are retry-safe audited no-ops. `REMOVED` memberships are not implicitly reactivated or changed by this action.

### Access and session behavior

The server-side active-membership gate must deny protected actions after suspension. This contract does not claim immediate invalidation of already-issued Supabase Auth tokens; token/session refresh or revocation is a separate platform decision. No Auth Admin user deletion is part of this action.

### Result and errors

Success returns `ok`, `target_membership_id`, `previous_status`, `current_status`, `audit_log_id`, and `idempotency_reused`.

Required controlled errors include `AUTH_REQUIRED`, `MEMBERS_MANAGE_REQUIRED`, `TENANT_MISMATCH`, `TARGET_NOT_ACTIVE`, `SELF_ACTION_FORBIDDEN`, `OWNER_PROTECTED`, `OPEN_WORK_BLOCKS_DEACTIVATION`, `IDEMPOTENCY_CONFLICT`, and `VALIDATION_FAILED`.

Audit actions:

- `admin.member.deactivate`
- `admin.member.deactivate.already_suspended`

## Part 2 handoff gates

Part 2 may implement the guarded database boundary only after confirming:

1. Existing columns and constraints support the exact state transitions.
2. Existing idempotency and append-only audit patterns can represent these requests without inventing a new table.
3. The authority/owner protection predicate is available without creating an unapproved role hierarchy.
4. Open-work detection is available from existing workflow state or is explicitly deferred before implementation.
5. RPC grants, `SECURITY DEFINER` search paths, RLS, transaction locks, and controlled error mapping are testable.

## Explicit non-scope

- No reactivation action; it will be a separate guarded contract.
- No `REMOVED` transition in this action.
- No role catalog or permission editing.
- No platform support/admin role modeling.
- No direct browser database writes.
- No UI submit enablement until Part 2 and validation gates pass.

PART 2A COMPLETE: role replacement database boundary implemented and validated.
PART 2B COMPLETE: approved open-work predicate and guarded deactivation boundary implemented; ACTIVE members remain blocked while coverage gaps exist.

NEXT: Track B Business Rule Review.
