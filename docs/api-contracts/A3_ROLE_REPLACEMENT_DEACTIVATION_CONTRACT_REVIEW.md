# A3 Role Replacement / Deactivation Contract Review

**Task ID:** `A3-ROLE-MANAGEMENT-CONTRACT-REVIEW-001`  
**Status:** `APPROVED`  
**Implementation decision:** `READY` for Part 1 implementation contract

**Owner approval:** Approved by Project Owner in the current task on 2026-07-28. Approval covers the decision table below and authorizes Part 1 contract design; it does not authorize direct browser writes, production enablement, or skipping validation gates.

## Purpose

Review the next member-management boundary after role assignment and role removal. This document defines the decisions required before implementing an atomic role replacement flow or a membership deactivation flow. It does not add a migration, RPC, permission, role, status, or UI write behavior.

## Baseline

- Organization access is membership-scoped through `organization_memberships`.
- Merchant roles attach to a membership through `membership_roles`.
- Supported membership statuses are `INVITED`, `ACTIVE`, `SUSPENDED`, and `REMOVED`.
- Deactivation must preserve historical actions and audit records.
- Current assignment and removal boundaries require an authenticated active actor, active same-tenant target membership, `members.manage`, active non-system roles, and append-only audit evidence.
- Current role removal protects self-actions and the last-role invariant.

Source baseline: `reference/BUSINESS_RULES_V13.md`, `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`, and `reference/SUPABASE_MIGRATION_V1_STATUS.md`.

## Contract A: Atomic role replacement

### Proposed boundary

`admin.member.role.replace.request` -> server-only guarded action -> one database transaction -> append-only audit event.

The transaction would validate the actor, tenant, target membership, source role, replacement role, and permission before changing the target's current role set. The role set must never be observable in a zero-role or partially replaced state.

### Decisions required

| Decision | Option A | Option B | Current decision |
|---|---|---|---|
| Replacement shape | Replace one source role with one target role | Replace the complete role set with a submitted set | APPROVED: Option A |
| Target role state | Active non-system roles only | Include approved system/owner roles | APPROVED: Option A |
| Self replacement | Reject self-action | Permit with owner-protection rules | APPROVED: Option A |
| Missing source role | Retry-safe no-op | Hard error | APPROVED: Option A |
| Existing target role | Retry-safe no-op | Hard error | APPROVED: Option A |
| Minimum roles | Preserve at least one role | Allow zero roles while membership remains active | APPROVED: Option A |
| Audit payload | Source/target role IDs, reason, request ID, before/after set | Minimal action record | APPROVED: Option A |

The approved replacement baseline is one source-to-one target replacement, active non-system roles only, rejected self-action, preserved minimum role count, and a reason plus idempotency key.

## Contract B: Membership deactivation

### Proposed boundary

`admin.member.deactivate.request` -> server-only guarded action -> membership status transition -> permission re-evaluation through the active-membership gate -> append-only audit event.

The profile and commercial history must remain intact. This boundary must operate on the organization membership, not on the global Auth user or global profile.

### Decisions required

| Decision | Option A | Option B | Current decision |
|---|---|---|---|
| Default transition | `ACTIVE` -> `SUSPENDED` for reversible access stop | `ACTIVE` -> `REMOVED` for permanent membership end | APPROVED: Option A |
| Existing roles | Keep `membership_roles` for reactivation/audit context | Remove current role links in the same transaction | APPROVED: Option A |
| Self deactivation | Reject self-action | Permit with explicit recovery/owner rules | APPROVED: Option A |
| Protected members | Protect owner/last authority member | Apply `members.manage` uniformly | APPROVED: Option A |
| Pending work | Block deactivation while assigned work is open | Allow and leave reassignment to workflow services | APPROVED: Option A |
| Sessions | Rely on server-side membership checks on every protected action | Add an explicit session revocation/refresh boundary | APPROVED: Option A |
| Reactivation | Separate guarded reactivation contract | No reactivation in v1 | APPROVED: Option A |

The session choice is especially important: changing database membership status does not by itself guarantee immediate invalidation of already-issued Auth tokens. Any approved implementation must enforce the inactive-membership gate server-side and document the expected token/session behavior.

## Shared guardrails

Both boundaries require approval of:

- exact action IDs, required permissions, and actor/target tenant checks;
- owner, authority hierarchy, system-role, platform-support, and self-action rules;
- idempotency key scope and retry result semantics;
- before/after state, reason, actor, target, request ID, and failure audit requirements;
- transaction isolation and concurrency behavior for simultaneous role or status changes;
- UI confirmation, disabled-state, error mapping, and read-model revalidation;
- focused SQL validation plus static contract tests before any production enablement.

## Explicit non-scope

This review does not authorize:

- new roles, permissions, membership statuses, tables, columns, or migrations;
- direct browser writes to `membership_roles` or `organization_memberships`;
- Auth user deletion or password management by merchant admins;
- platform support access modeling;
- owner hierarchy or authority invention without approved business rules.

## Acceptance gates after approval

1. Approved decision record is linked from the implementation status.
2. RPC and server action contracts are reviewed for transaction and idempotency behavior.
3. RLS/grants and `SECURITY DEFINER` search paths are verified.
4. SQL validation covers same-tenant, cross-tenant, inactive, self, system/owner, last-role, retry, concurrency, and audit cases.
5. UI submit enablement is added only after the server boundary and read model are validated.
6. Full local Supabase workflow validation passes before production push.

## Approved decision

`APPROVED`: the decision table is approved. The next step is a separate implementation contract that translates these decisions into transaction, RPC, server action, validation, and UI requirements.

NEXT: Part 2 - A3 guarded database boundary implementation review.
