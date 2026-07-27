# A3 Member Invite Acceptance Activation Boundary

## Status

IMPLEMENTED

Task ID:

```text
A3-ACTION-INVITE-ACCEPT-001
```

## Scope

This boundary completes the invited-member acceptance path after the Supabase Auth Admin invite email is delivered:

```text
Auth invite email
-> /auth/callback?invitation_id=<uuid>
-> Supabase session exchange
-> public.api_accept_member_invitation
-> profile + organization_membership activation
-> organization_invitations ACCEPTED
-> audit_logs append
```

## Business Rules

- BR-124: Supabase Auth remains the central user identity provider.
- BR-126: one profile may join multiple organizations through `organization_memberships`.
- BR-127: roles are membership-scoped and are not global.
- BR-131: employee users are invited and establish/authenticate their own credentials through the auth provider.
- BR-132: deactivation/suspension is preserved for audit and must not be silently reversed.

## Implemented Boundary

### Callback

`src/app/auth/callback/route.ts` now accepts `invitation_id` after a successful:

- `exchangeCodeForSession(code)`
- `verifyOtp({ token_hash, type })`

The callback uses the normal server Supabase client and does not access service-role or secret keys.

### Redirect Binding

`src/lib/supabase/admin.ts` exposes:

```text
getSupabaseInviteRedirectUrlForInvitation(invitationId)
```

The server-only Auth Admin email boundary appends `invitation_id` to `SUPABASE_INVITE_REDIRECT_URL` before calling `inviteUserByEmail`.

### Database RPC

`public.api_accept_member_invitation(p_invitation_id uuid)`:

- requires authenticated Supabase session
- reads the authenticated email from `auth.users`
- requires invitation email to match authenticated user email
- creates the global `profiles` row when missing
- rejects inactive profiles
- activates an existing `INVITED` membership or creates an `ACTIVE` membership
- refuses to reactivate `SUSPENDED` or `REMOVED` memberships
- marks `organization_invitations.status = 'ACCEPTED'`
- records append-only audit action `admin.member.invite.accepted`

## Explicit Non-Scope

role assignment remains deferred.

Reason: the approved persistence contract does not assign roles during invite request, and accepted membership must exist before a later guarded action writes `membership_roles`.

## Validation

- `tests/a3-member-invite-acceptance-activation-boundary.test.mjs`
- `supabase/validation/019_member_invite_acceptance_activation_test.sql`
- `supabase/validation/supabase-workflows-suite.mjs`

The SQL validation covers:

- successful acceptance by matching authenticated email
- profile creation
- active membership creation
- idempotent repeated acceptance
- append-only audit record
- no automatic `membership_roles` insert
- email mismatch rejection
- suspended membership rejection

## Security Notes

- The browser never receives service-role credentials.
- `api_accept_member_invitation` revokes execute from `public` and `anon`, then grants only to `authenticated`.
- `invitation_id` is treated as an identifier, not authorization; the authenticated email match is the authorization boundary.
- Accepted invitation replay is idempotent only for the same accepted profile.

## Next

NEXT: A3 member role assignment guarded action boundary.
