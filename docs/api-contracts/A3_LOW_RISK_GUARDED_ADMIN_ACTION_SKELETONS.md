# A3 Low-Risk Guarded Admin Action Skeletons

Status: IMPLEMENTED

Task ID: A3-ACTION-SKELETON-001

Date: 2026-07-27

## Scope

This task adds server-only skeleton boundaries for the first Tier 1 Admin action candidates:

- `admin.member.invite.request`
- `admin.organization.profile.update.request`

The skeletons validate the action envelope and inputs, then return a controlled `not_implemented` result. They intentionally do not insert, update, delete, call Auth Admin, mutate subscriptions, mutate entitlements, or expose service-role behavior.

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
| `admin.member.invite.request` | `members.manage` | Normalizes email and role IDs, validates UUID role IDs, returns `not_implemented` after guard success | Future audited invitation service; Auth Admin remains server-only |
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

## Next Recommended Task

Design the audited persistence contract for `admin.member.invite.request`.
