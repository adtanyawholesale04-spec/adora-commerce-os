# A3 Member Invite Persistence Implementation

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** A3-ACTION-PERSISTENCE-001  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## Scope

This task implements database-backed persistence for:

```text
admin.member.invite.request
```

The implementation follows `docs/api-contracts/A3_MEMBER_INVITE_AUDITED_PERSISTENCE_CONTRACT.md`.

## Behavior

- Requires the existing guarded server action envelope.
- Requires `members.manage`.
- Uses the active organization from server-side membership context.
- Uses `actorProfileId` from the authenticated profile context.
- Rejects non-empty `roleIds` with `role_assignment_not_supported`.
- Persists a pending row in `organization_invitations`.
- Appends a row in `audit_logs`.
- Reuses an unexpired pending invite for the same normalized email and organization.
- Records duplicate reuse through `admin.member.invite.request.duplicate_reused`.
- Uses ACOS invitation TTL of 7 days.
- Does not call Supabase Auth Admin email sending.
- Does not expose service-role or secret keys.
- Supports the visible Admin submit affordance after UI validation is implemented.

## Persistence Boundary

Database writes go through:

```text
public.api_request_member_invitation(uuid, varchar, uuid)
```

The RPC is `SECURITY DEFINER`, but it enforces:

- authenticated user required
- `members.manage` via `public.has_org_permission`
- active profile via `public.current_profile_id`
- normalized email validation
- transaction-scoped advisory lock for duplicate invite prevention
- invitation + audit write in one PostgreSQL transaction

## Files

- `supabase/migrations/20260727120000_member_invite_request_rpc.sql`
- `src/lib/admin/context.ts`
- `src/lib/admin/actions/guarded.ts`
- `src/lib/admin/actions/low-risk.ts`
- `src/lib/admin/i18n.ts`

## Explicit Non-Scope

- No invite email is sent.
- No Supabase Auth Admin call is made.
- No role assignment is persisted.
- No visible submit UI is enabled by this persistence task; UI enablement is tracked separately in `A3_MEMBER_INVITE_UI_SUBMIT_ENABLEMENT.md`.
- No service-role key is added.
- No Track B production implementation is added.

## Next Recommended Task

Implement the separate Supabase Auth Admin email-send boundary with server-only credentials, idempotency, audit linkage, and failure mapping.
