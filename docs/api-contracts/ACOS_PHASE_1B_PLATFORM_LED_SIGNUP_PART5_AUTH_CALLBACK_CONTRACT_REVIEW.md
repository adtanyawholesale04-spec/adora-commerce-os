# Phase 1B Platform-Led Signup Part 5 Auth and Callback Contract Review

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART5`
**Status:** OWNER APPROVED / FROZEN
**Depends On:** Validated Part 3 database boundary and Part 4 server service
**Date:** 2026-07-29
**Migration:** None

## Mandatory Scope Map

| Control | Part 5 boundary |
|---|---|
| Phase | Phase 1B Platform-Led Signup Readiness |
| Domain | Supabase Auth, server callback, platform signup application service |
| Source of truth | Existing `auth.users` and `profiles`; no new identity/customer source |
| Tenant boundary | No organization, membership, customer or customer-profile link |
| Public/private | Auth destination and onboarding data remain platform-private |
| Event/audit | Reuse Part 3 profile events after verified Auth bootstrap |
| Finance/tax/ledger | Not required; no value movement |
| Consent | Community Terms stays separate from Auth confirmation and marketing consent |
| Entitlement | Server platform flag and kill switch; no tenant entitlement |
| Migration | None expected |
| Validation | Callback intent isolation, verification, retry, abuse, redirect and privacy gates |

## Repository Findings

The existing `/auth/callback` route:

- exchanges PKCE authorization codes and verifies OTP token hashes server-side;
- writes the Supabase session through the request-scoped SSR client;
- then attempts member invitation acceptance;
- accepts a sanitized same-origin relative `next` path;
- has no platform-signup intent, acquisition evidence or Part 4 bootstrap call.

The route must not be extended by treating every successful Auth callback as a
platform signup. Existing Admin login and member invitation behavior must remain
separate.

## Recommended Owner Decisions

| ID | Decision | Recommended safe value |
|---|---|---|
| A01 | Initial signup method | Email and password only |
| A02 | Email verification | Required before bootstrap/onboarding; Supabase Confirm Email remains enabled |
| A03 | Phone signup | Deferred; do not incur SMS/provider cost in Phase 1B |
| A04 | OAuth/social signup | Deferred to avoid provider and automatic identity-linking ambiguity |
| A05 | Auth request boundary | Guarded server endpoint/action using the publishable key; never use the secret/service-role key for `signUp` |
| A06 | CAPTCHA | Required in production before Auth signup; provider must be explicitly approved |
| A07 | Layered throttling | Supabase Auth limits plus ACOS durable per-IP and normalized-destination guard |
| A08 | Abuse adapter | Durable shared adapter required in production; no process-memory limiter |
| A09 | Duplicate-account response | Generic response that does not reveal whether an email exists |
| A10 | Auth callback route | Add a separate platform callback route/helper; do not overload member-invite acceptance |
| A11 | Callback flow | Keep `@supabase/ssr` PKCE and request-scoped clients; exchange code once |
| A12 | Callback intent | Signed, short-lived, HTTP-only state/cookie; do not trust a raw query `next` or acquisition value |
| A13 | Acquisition evidence | Store only the frozen source and opaque campaign/referral reference inside signed callback state |
| A14 | Idempotency | Generate bootstrap request UUID server-side before Auth signup and preserve it through callback retry |
| A15 | Verification check | Fetch the authenticated user after exchange and require confirmed email before Part 4 bootstrap |
| A16 | Partial failure | Auth may exist before persistence; callback retry repairs only missing profile/platform projections |
| A17 | Redirect | Success goes to private onboarding; failure uses a generic retry-safe Auth status |
| A18 | Open redirect protection | Allow only fixed platform onboarding destinations; no arbitrary external URL |
| A19 | Logging/privacy | Never log raw email, password, CAPTCHA token, Auth code, token hash, referral secret or session token |
| A20 | Identity/tenant effects | No automatic merge/link, organization, membership, tenant customer or consent creation |
| A21 | Production email | Custom SMTP/provider and sending policy require explicit approval before production enablement |
| A22 | Availability | Part 4 feature flag and kill switch are rechecked before Auth request and callback bootstrap |
| A23 | Existing callback | Admin login and member invitation acceptance remain behaviorally unchanged |
| A24 | UI authorization | Signup/onboarding UI begins only after A01-A23 are Owner-frozen and provider decisions are resolved |

## Proposed Flow After Owner Freeze

```text
signup request
-> feature flag / kill switch
-> CAPTCHA verification
-> durable IP + destination throttle
-> create signed callback state with request/acquisition evidence
-> Supabase email/password signUp using publishable key
-> email confirmation
-> dedicated PKCE callback
-> request-scoped getUser and confirmed-email check
-> Part 4 bootstrapPlatformAccount
-> private onboarding
```

No callback step may create tenant relationships or infer a customer link from
email, phone, provider identity or display name.

## Decisions That Block Runtime

Part 6 Auth implementation is **BLOCKED** until the Owner explicitly freezes:

1. A01-A24;
2. CAPTCHA provider and secret-management boundary;
3. production SMTP/email provider and cost policy;
4. durable shared rate-limit adapter/storage;
5. production Site URL and exact redirect allowlist.

Local design and static contract validation may continue. Production signup,
provider configuration, callback changes and UI must not begin by assumption.

## Validation Required After Approval

- existing Admin and member-invite callback regression;
- PKCE code exchange and one-time callback behavior;
- missing/expired/tampered signed-state denial;
- email confirmation required;
- generic duplicate response;
- CAPTCHA and rate-limit fail-closed behavior;
- callback retry after persistence failure;
- acquisition request conflict;
- no tenant side effects;
- no raw PII/token logging;
- fixed same-origin redirect;
- feature kill switch before request and callback;
- static, Auth integration and production build gates.

## Supabase Guidance Reviewed

- SSR Auth uses cookie-backed PKCE and request-scoped clients.
- Auth applies its own endpoint rate limits, but ACOS still requires its approved
  layered abuse boundary.
- CAPTCHA is supported for signup and requires provider configuration.
- production redirect URLs must be explicitly allowlisted.
- built-in email sending limits are not a production delivery contract.

## Owner Approval

The Project Owner approved A01-A24 in full on 2026-07-29. Provider and
deployment requirements are frozen, while the specific CAPTCHA vendor, SMTP
provider/cost policy, durable limiter storage and production URL allowlist remain
separate external selections.
