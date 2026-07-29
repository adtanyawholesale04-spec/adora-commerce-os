# Phase 1B Platform-Led Signup Part 6 Provider-Neutral Auth Boundary

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART6`
**Status:** IMPLEMENTED / VALIDATED / RUNTIME DISABLED
**Depends On:** Owner-frozen Part 5 A01-A24
**Date:** 2026-07-29
**Migration:** None

## Mandatory Scope

| Control | Part 6 result |
|---|---|
| Phase | Phase 1B Platform-Led Signup Readiness |
| Domain | Auth request, callback state, callback session and Part 4 bootstrap ports |
| Source of truth | Existing Supabase `auth.users` and `profiles` |
| Tenant | No tenant-owned data and no organization side effects |
| Privacy | Email/password/tokens remain transient and are forbidden from callback state |
| Event/audit | Part 3 events begin only after verified bootstrap |
| Ledger/finance/tax | Not required |
| UI language/theme | Not required; no UI is introduced |
| Consent/moderation | Community Terms remains separate; moderation deferred |
| Entitlement | Platform availability flag and kill switch |
| Migration | None |

## Implemented Design

`src/lib/platform-signup/auth-boundary.ts` defines provider-neutral typed ports:

- `PlatformSignupRateLimiter`;
- `PlatformCallbackStateCodec`;
- `PlatformEmailPasswordAuthGateway`;
- `PlatformCallbackSessionGateway`;
- `PlatformAccountBootstrapPort`.

CAPTCHA validation ownership is delegated once through
`PlatformEmailPasswordAuthGateway` using its transient `captchaToken`. The file
contains no Supabase `signUp` call, provider SDK, network request,
secret lookup, route handler, Server Action, email send or browser export.

## Callback State

Signed/sealed state is versioned and allowlists only:

```text
intent = PLATFORM_SIGNUP
requestId
displayName
sanitized acquisition evidence
issuedAt
expiresAt
nonce
```

Email, password, CAPTCHA token, Auth code, token hash, session token and IP or
destination hash are forbidden. State lifetime is capped at 15 minutes.

The fixed callback and post-verification destinations are:

```text
/auth/platform/callback
/onboarding
```

No arbitrary `next`, origin or external redirect is accepted by the contract.

## Fail-Closed Composition

Future orchestration must require every port. There is no default limiter,
codec or Auth gateway implementation. A missing/throwing dependency
maps to a controlled result and never falls back to an unguarded signup.

Request order is frozen as:

```text
availability
-> input normalization
-> durable rate limit
-> seal callback state
-> Auth signup request with CAPTCHA token validated once by Supabase Auth
```

Callback order is frozen as:

```text
availability
-> open and validate state
-> exchange PKCE code once
-> request-scoped verified user
-> Part 4 bootstrap
-> fixed private onboarding redirect
```

## Runtime Gate

No provider adapter or route is implemented. Production and public runtime
remain **BLOCKED** pending explicit selection of:

1. CAPTCHA provider;
2. SMTP/email provider and cost policy;
3. durable shared limiter storage;
4. production Site URL and exact redirect allowlist.

## Validation

- all five provider-neutral ports exist;
- callback state has an explicit field allowlist and 15-minute maximum age;
- no sensitive Auth values appear in callback state;
- redirects are fixed internal paths;
- no route, provider SDK, network call or Auth send is introduced;
- static tests, lint, typecheck and production build pass.
