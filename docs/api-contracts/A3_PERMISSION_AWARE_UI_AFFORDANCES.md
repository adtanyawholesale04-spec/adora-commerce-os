# A3 Permission-Aware UI Affordances

Status: IMPLEMENTED

Task ID: A3-UI-AFFORDANCE-001

Date: 2026-07-27

## Scope

This task adds visible but disabled Admin UI affordances for the first low-risk guarded action skeletons:

- Users: `admin.member.invite.request`
- Settings: `admin.organization.profile.update.request`

The UI shows permission state, tenant scope, action ID, skeleton readiness, audit requirement, and the fact that persistence is still disabled.

## Security Boundary

- No database write is triggered.
- No enabled submit button is rendered.
- No service-role key or secret key is exposed.
- Permission-aware status is derived from existing read models:
  - `members.manage` for member invitation readiness.
  - `organization.settings.edit` for organization profile update readiness.
- The UI does not claim production readiness for writes.

## Files

- `src/app/admin/users/page.tsx`
- `src/app/admin/settings/page.tsx`
- `src/lib/admin/i18n.ts`

## Next Recommended Task

The audited persistence contract for `admin.member.invite.request` is implemented in `docs/api-contracts/A3_MEMBER_INVITE_AUDITED_PERSISTENCE_CONTRACT.md`, and DB-only persistence is implemented in `docs/api-contracts/A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION.md`.

Next, implement A3 member invite UI validation and submit enablement while keeping Supabase Auth Admin email sending behind a separate server-only boundary.
