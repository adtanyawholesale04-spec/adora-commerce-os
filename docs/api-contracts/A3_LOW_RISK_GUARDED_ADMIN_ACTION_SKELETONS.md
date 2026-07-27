# A3 Low-Risk Guarded Admin Action Skeletons

Status: IMPLEMENTED

Task ID: A3-ACTION-SKELETON-001

Date: 2026-07-27

## Scope

This task added server-only skeleton boundaries for the first Tier 1 Admin action candidates:

- `admin.member.invite.request`
- `admin.organization.profile.update.request`

The initial skeletons validated the action envelope and inputs, then returned a controlled `not_implemented` result. `admin.member.invite.request` has since advanced to DB-only RPC persistence; `admin.organization.profile.update.request` remains skeleton-only. Neither path calls Auth Admin, mutates subscriptions, mutates entitlements, or exposes service-role behavior.

## Files

- `src/lib/admin/actions/guarded.ts`
- `src/lib/admin/actions/low-risk.ts`
- `src/app/admin/users/actions.ts`
- `src/app/admin/settings/actions.ts`

## Guard Contract

Each action skeleton requires:

- server-only execution
- authenticated Admin context
- active organization membership
- active organization
- exact permission check
- tenant scope from the active membership
- input validation before any future persistence step
- audit requirement carried in the result
- controlled error codes
- no service role or secret key exposure

## Action Contracts

| Action ID | Required Permission | Current Behavior | Future Write Boundary |
|---|---|---|---|
| `admin.member.invite.request` | `members.manage` | Normalizes email, rejects role assignment, persists/reuses pending invite through `api_request_member_invitation`, and audits the action | DB-only invitation service; Auth Admin email send remains server-only future scope |
| `admin.organization.profile.update.request` | `organization.settings.edit` | Normalizes name/timezone/currency, rejects invalid profile fields, returns `not_implemented` after guard success | Future audited settings service limited to organization profile fields |

## Explicit Non-Scope

- No schema changes
- No migration changes
- No new permissions or roles
- No visible write UI
- No direct browser write to sensitive tables
- No subscription, plan, entitlement, usage, or commercial mutation
- No Track B production implementation

## Follow-Up Completed

Permission-aware UI affordances are implemented in `docs/api-contracts/A3_PERMISSION_AWARE_UI_AFFORDANCES.md`.

The audited persistence contract for `admin.member.invite.request` is implemented in `docs/api-contracts/A3_MEMBER_INVITE_AUDITED_PERSISTENCE_CONTRACT.md`, and DB-only persistence is implemented in `docs/api-contracts/A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION.md`.

## Next Recommended Task

Implement A3 member invite UI validation and submit enablement for the DB-only invite flow.
