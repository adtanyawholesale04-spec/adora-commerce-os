# A3 Member Invite UI Submit Enablement

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** A3-ACTION-UI-SUBMIT-001  
**Status:** IMPLEMENTED  
**Date:** 2026-07-28

---

## Scope

This task enables the visible `/admin/users` member invite form for the DB-only invite flow:

```text
admin.member.invite.request
```

The UI submits to the existing server action boundary and does not write directly to Supabase from the browser.

## Behavior

- Shows an enabled email form only when the read model is ready and `members.manage` is present.
- Validates email on the client for required, email format, and 320-character maximum.
- Submits `email` and `clientActionId` through `requestMemberInvitationServerAction`.
- Does not submit `roleIds`; role assignment remains out of scope.
- Revalidates `/admin/users` after a successful persisted or duplicate-reused invite.
- Surfaces success, duplicate reuse, validation, permission, and persistence errors in the form.
- Keeps Supabase Auth Admin email sending outside this UI task.

## Boundaries

Browser/client code must not:

- import Supabase clients
- call `.insert()`, `.update()`, `.delete()`, or `.rpc()`
- reference service-role secrets
- call Supabase Auth Admin invite email APIs
- assign roles to invitations

Server-side persistence remains:

```text
requestMemberInvitationServerAction
  -> requestMemberInvitation
  -> public.api_request_member_invitation
```

## Explicit Non-Scope

- No invite email is sent.
- No Auth Admin call is made.
- No role assignment is persisted.
- No new permission, role, status, table, or migration is added.
- No Track B implementation is added.

## Validation

Static tests assert that the UI:

- uses a client component with a server action form
- uses required email input validation
- does not perform client-side Supabase writes
- keeps Auth Admin email sending out of scope
- updates the A3 implementation status

## Next Recommended Task

Design and implement the separate A3 Supabase Auth Admin invite email-send boundary with server-only credentials, idempotency, audit linkage, and failure mapping.
