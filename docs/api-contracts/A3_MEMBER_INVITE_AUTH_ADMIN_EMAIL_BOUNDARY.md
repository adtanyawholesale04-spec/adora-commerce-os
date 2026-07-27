# A3 Member Invite Auth Admin Email Boundary

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** A3-ACTION-AUTH-ADMIN-001  
**Status:** IMPLEMENTED  
**Date:** 2026-07-28

---

## Scope

This task completes the email-send boundary for:

```text
admin.member.invite.request
```

The application first persists the pending organization invitation and audit record, then sends the Supabase Auth Admin invite email from a server-only boundary.

## Server Boundary

Supabase Auth Admin is only callable from:

```text
src/lib/supabase/admin.ts
```

Required server environment:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_INVITE_REDIRECT_URL
```

`SUPABASE_SERVICE_ROLE_KEY` remains accepted as a legacy local fallback, but the preferred key is `SUPABASE_SECRET_KEY`.

The Auth Admin client disables browser/session behavior:

```text
autoRefreshToken = false
persistSession = false
detectSessionInUrl = false
```

## Flow

```text
requestMemberInvitationServerAction
  -> requestMemberInvitation
  -> public.api_request_member_invitation
  -> public.api_prepare_member_invitation_email_send
  -> supabase.auth.admin.inviteUserByEmail
  -> public.api_record_member_invitation_email_event
```

The redirect URL must be configured through `SUPABASE_INVITE_REDIRECT_URL` and must also be present in the Supabase Auth redirect allow-list. If the server value is missing or invalid, the action fails with a controlled error instead of relying on Supabase's silent Site URL fallback.

## Idempotency

Email retry safety uses append-only audit evidence:

- `admin.member.invite.email_sent` means a pending invitation should not send another Auth Admin invite email.
- `admin.member.invite.email_failed` records a failed send attempt but does not block a future retry.

This keeps duplicate form submissions from sending repeated emails after a success is audited.

## Error Codes

```text
auth_admin_not_configured
auth_admin_redirect_not_configured
auth_admin_invite_failed
auth_admin_audit_error
```

Errors are controlled and do not expose secret values or raw provider payloads.

## Browser Boundary

Browser/client code must not:

- import Supabase admin clients
- read `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- call `inviteUserByEmail`
- call `.rpc()` directly for this action
- write `organization_invitations` or `audit_logs`

## Database Boundary

New RPCs:

```text
public.api_prepare_member_invitation_email_send
public.api_record_member_invitation_email_event
```

Both RPCs:

- require `auth.uid()`
- require `members.manage`
- scope to `organization_id`
- revoke `EXECUTE` from `public` and `anon`
- grant `EXECUTE` only to `authenticated`
- write audit through the existing append-only `audit_logs` table

## Explicit Non-Scope

- No role assignment persistence.
- Membership activation on invite acceptance was a later boundary and is now implemented in `A3_MEMBER_INVITE_ACCEPTANCE_ACTIVATION_BOUNDARY.md`.
- No password creation by staff.
- No Track B messaging provider implementation.
- No new table, column, role, permission, or business status.

## Validation

Static and SQL validation assert:

- server-only admin client exists
- secret keys are not referenced by browser/client code
- invite persistence remains behind RPC
- Auth Admin email send is audited
- successful email audit makes retries idempotent
- limited and cross-tenant users are denied

## Next Recommended Task

NEXT: A3 member role management UI affordance and role assignment submit enablement.
