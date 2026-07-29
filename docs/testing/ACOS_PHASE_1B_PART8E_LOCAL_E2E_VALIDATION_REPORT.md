# Phase 1B Part 8E Local End-To-End Validation Report

**Status:** VALIDATED
**Date:** 2026-07-29
**Migration:** None

## Passed Evidence

- local Supabase stack restarted with Cloudflare's published Turnstile test
  secret;
- fresh migration replay passed from `001` through the latest Part 8B
  migration;
- `/signup` rendered the Turnstile test widget;
- guarded signup accepted a unique local test account;
- Mailpit captured the confirmation email;
- confirmation completed the PKCE exchange in the dedicated platform callback;
- Supabase network verification confirmed the email;
- Part 4 bootstrap created the private profile, onboarding, immutable
  acquisition and exactly-once account-created event;
- canonical onboarding snapshot rendered `NOT_STARTED` after the read parser
  was corrected to the frozen RPC shape;
- the platform user had no organization membership and all Admin permissions
  remained denied;
- signed callback state, fixed redirects and authenticated onboarding denial
  after logout behaved as designed.
- Owner approved the narrow Admin Auth CAPTCHA compatibility change;
- Admin magic-link sign-in submitted a Turnstile token to Supabase Auth with
  account creation disabled;
- Mailpit captured the Admin sign-in link and the existing callback restored
  the authenticated Admin session;
- the platform account remained without an active organization membership and
  Admin authorization remained denied;
- logout, magic-link login and private onboarding snapshot resume passed with
  CAPTCHA enabled.

## Defect Corrected

`getPlatformOnboardingSnapshot` previously reused the mutation response parser,
which requires a top-level `result`. The frozen snapshot RPC correctly returns
`profile_id`, nested `onboarding`, `active_interests`, terms and private draft
fields without `result`.

The service now uses a dedicated allowlisted snapshot parser. No migration or
schema change was made.

## Admin Auth Compatibility Resolution

Supabase Auth CAPTCHA protection applies to sign-up, sign-in and password
recovery endpoints. Owner approved a narrow compatibility change so the existing
Admin `signInWithOtp` action now receives the transient Turnstile response and
forwards it as `captchaToken`.

Supabase Auth remains the single token-validation owner. The Admin action does
not call Siteverify, does not persist the token and uses
`shouldCreateUser: false`, so an anonymous Admin sign-in cannot create a new
account. Member-invite acceptance remains on its existing isolated callback.

## Validation Boundary

- local Turnstile test keys and Mailpit were used; no production provider,
  domain, credential or spend was authorized;
- checked-in runtime defaults remain fail-closed and production remains disabled
  until Part 8F;
- local developer flags and secrets remain in ignored `.env.local`;
- no migration or frozen schema was changed in Part 8E;
- invalid CAPTCHA behavior, callback retry invariants, static checks, unit tests,
  Supabase validation and production build are automated validation gates.

## Next Gate

Phase 1B Part 8F Production Readiness Gate must separately approve the production
origin, Turnstile site/secret keys, SMTP provider/domain configuration,
deployment secrets, monitoring and rollout controls before online enablement.
