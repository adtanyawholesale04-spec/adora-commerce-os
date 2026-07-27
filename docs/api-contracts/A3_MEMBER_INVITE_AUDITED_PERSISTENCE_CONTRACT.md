# A3 Member Invite Audited Persistence Contract

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** A3-ACTION-PERSISTENCE-CONTRACT-001  
**Status:** IMPLEMENTED / PERSISTENCE_IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

This contract defines the first audited persistence boundary for:

```text
admin.member.invite.request
```

It prepared the existing guarded skeleton for database-backed implementation. The first DB-only persistence implementation is now recorded in `docs/api-contracts/A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION.md`.

It still does not enable a visible submit button, new role, new permission, Auth Admin call, or service-role behavior.

---

## 2. Source Rules

The contract is based on the current repository baseline:

- Business Rules V13:
  - BR-126: one profile may join multiple organizations through `organization_memberships`.
  - BR-127: roles attach to organization membership.
  - BR-128: protected actions require Authentication + Active Membership + Entitlement + Permission.
  - BR-130: role permission controls user-level action access.
  - BR-131: merchant admins never assign employee passwords; employees are invited and establish credentials through the auth provider.
  - BR-132: membership deactivation preserves audit history.
  - BR-133: platform staff roles are separate from merchant roles.
  - BR-134: support access must be explicit, time-bounded, and audited.
- Frozen schema:
  - `organization_invitations`
  - `organization_memberships`
  - `membership_roles`
  - `roles`
  - `permissions`
  - `audit_logs`
- A3 guarded action envelope:
  - `docs/api-contracts/ACOS_A3_GUARDED_ACTION_SERVICE_CONTRACT_HARDENING.md`
  - `docs/api-contracts/A3_LOW_RISK_GUARDED_ADMIN_ACTION_SKELETONS.md`

---

## 3. Required Guard

The future persistence implementation must run through the existing server-only action envelope.

| Guard | Required Value |
|---|---|
| Action ID | `admin.member.invite.request` |
| Permission | `members.manage` |
| Authentication | Supabase authenticated user resolved server-side |
| Membership | Active membership in the selected organization |
| Organization | Active organization only |
| Tenant scope | `organization_id` comes from the active membership, not from client input |
| Entitlement | `not_plan_gated` until an approved SaaS plan rule changes it |
| Audit | Required for every success, duplicate reuse, denied attempt that reaches persistence, and external-provider failure |
| Service role / secret key | Server-only only; never browser/client/public bundle |

The guard context now exposes `actorProfileId` so `organization_invitations.invited_by` and `audit_logs.actor_profile_id` are populated from trusted server-side identity.

---

## 4. Input Contract

Accepted request shape:

```ts
type MemberInviteRequestInput = {
  email: string;
  roleIds?: string[];
  clientActionId?: string;
};
```

Validation:

| Field | Rule |
|---|---|
| `email` | Required, trim, lowercase, valid email shape, max 320 chars |
| `roleIds` | UUID list if present, deduplicated, max 20 values |
| `clientActionId` | Optional trace/idempotency hint, max 120 chars |

V1 persistence rule for `roleIds`:

```text
Non-empty roleIds must return role_assignment_not_supported.
```

Reason: the frozen `organization_invitations` table does not contain a role assignment column, and there is no approved invitation-role join table. Role assignment must remain a later contract that writes to `membership_roles` only after the invited user accepts and has an organization membership.

---

## 5. Allowed Persistence

The future write implementation may only persist these records:

| Table | Operation | Scope |
|---|---|---|
| `organization_invitations` | `insert` pending invitation, or reuse an existing pending invitation | Same active `organization_id` only |
| `audit_logs` | append-only `insert` | Same active `organization_id` only |

Allowed `organization_invitations` fields:

| Column | Value Source |
|---|---|
| `organization_id` | guarded active organization |
| `email` | normalized input email |
| `status` | `PENDING` |
| `invited_by` | guarded actor profile id |
| `expires_at` | approved TTL source; see Section 8 |
| `created_at` | database default |

Allowed `audit_logs` fields:

| Column | Value Source |
|---|---|
| `organization_id` | guarded active organization |
| `actor_profile_id` | guarded actor profile id |
| `actor_type` | `USER` |
| `entity_type` | `organization_invitation` |
| `entity_id` | invitation id |
| `action` | `admin.member.invite.request` |
| `before_json` | existing invite summary when duplicate/reused, otherwise `null` |
| `after_json` | user-safe invitation summary |
| `reason` | controlled reason such as `member_invite_requested` |
| `request_id` | parsed UUID from `clientActionId` only when valid UUID; otherwise `null` |
| `ip_address` / `user_agent` | server request metadata if available |

The audit payload must not store secret keys, raw Auth Admin responses, access tokens, refresh tokens, or password material.

---

## 6. Duplicate and Idempotency Behavior

The persistence service must avoid duplicate active invites.

Rules:

1. Query `organization_invitations` for the active organization and normalized email.
2. If a `PENDING` invitation exists with `expires_at > now()`, return the existing invitation and append audit action `admin.member.invite.request.duplicate_reused`.
3. If a `PENDING` invitation exists with `expires_at <= now()`, do not silently overwrite it unless the implementation also records an audit reason. A new invitation row is preferred until an expiration job exists.
4. If an `ACCEPTED` invitation exists, reject with `email_already_invited_or_member` unless a future membership lookup contract proves the user is not currently active.
5. `clientActionId` is a request trace and retry hint only. It is not a strict idempotency key until a unique database constraint or idempotency table is approved.

Because the current schema has no unique active-invite constraint, the first implementation must describe duplicate prevention as best-effort unless a migration adds a concurrency-safe constraint.

---

## 7. Auth Admin Boundary

Supabase Auth invitation email sending is an admin operation and must stay in a trusted server environment.

V1 persistence contract:

```text
Do not call Supabase Auth Admin from the browser.
Do not expose sb_secret, service_role, access tokens, or refresh tokens.
Do not create passwords for invited employees.
Do not create merchant memberships directly during invite request.
```

The first persistence implementation may be database-only. Enabling `inviteUserByEmail` requires a separate implementation gate that defines:

- server-only Supabase Admin client construction
- allowed redirect URL source
- handling for already-confirmed Auth users
- failure behavior after database insert
- retry behavior when the Auth email provider fails
- audit payload for provider success/failure

---

## 8. Expiry Behavior

`organization_invitations.expires_at` is required by schema.

Approved expiry source:

```text
ACOS invitation TTL = 7 days
```

Supabase Auth email-link expiry can be aligned later when the Auth Admin email-send boundary is implemented.

---

## 9. Error Contract

Allowed user-safe error codes:

| Code | Meaning |
|---|---|
| `validation_error` | Email, role IDs, or trace input failed validation |
| `anonymous` | No authenticated user |
| `missing_active_membership` | No active tenant membership |
| `organization_not_active` | Active organization is not usable |
| `permission_denied` | Missing `members.manage` |
| `role_assignment_not_supported` | Non-empty `roleIds` sent before invitation role persistence exists |
| `duplicate_pending_invite` | Pending unexpired invite already exists and cannot be reused by this request shape |
| `email_already_invited_or_member` | Accepted invite or active member conflict |
| `expiry_policy_not_approved` | No approved expiry source exists |
| `persistence_not_enabled` | Skeleton path is still active |
| `auth_admin_not_enabled` | Auth Admin email send is not enabled for this boundary |
| `audit_write_failed` | Audit insert failed; invitation write must be rolled back or treated as failed |

SQL errors, provider errors, and cross-tenant existence signals must not be exposed directly.

---

## 10. Forbidden Scope

This contract does not allow:

- direct browser insert/update/delete
- visible enabled invite submit UI
- schema or migration changes
- new permissions, roles, status enums, or subscription rules
- role assignment during invitation request
- membership activation before invite acceptance
- merchant admin password assignment
- platform support grant creation
- service-role or secret key exposure
- Track B production implementation

---

## 11. Required Validation Before Enabling Writes

Before the action changes from skeleton to persistence-enabled, tests must cover:

- unauthenticated denial
- no active membership denial
- inactive organization denial
- missing `members.manage` denial
- malformed email denial
- non-UUID role ID denial
- non-empty valid role IDs rejected with `role_assignment_not_supported`
- cross-tenant organization id cannot be supplied by client
- pending unexpired duplicate invite behavior
- expired pending invite behavior
- audit row on success
- audit row on duplicate reuse
- audit write failure prevents or invalidates invitation success
- browser bundle contains no service-role or secret key usage
- optional Auth Admin path is not called unless explicitly enabled

---

## 12. Next Recommended Implementation

Database-backed persistence is implemented in `docs/api-contracts/A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION.md`.

Recommended first implementation scope:

```text
src/app/admin/users
src/lib/admin/i18n.ts
tests
docs/api-contracts
```

Still forbidden:

```text
role assignment persistence
Auth Admin email send
service role in client code
Track B production implementation
```
