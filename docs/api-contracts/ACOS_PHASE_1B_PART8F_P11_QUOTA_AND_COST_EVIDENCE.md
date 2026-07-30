# Phase 1B Part 8F P11 Quota and Cost Evidence

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P11`
**Evidence Date:** 2026-07-31
**Status:** VERIFIED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Current Resend Evidence

```text
transactional plan: Free
transactional price: USD 0 / month
current monthly usage: 0 / 3,000
current daily usage: 0 / 100
provider API rate: 10 requests / second
transactional overage: NOT AVAILABLE ON FREE
pay-as-you-go: DISABLED
payment methods: NONE
```

The Free plan stops at its included transactional quota. Moving to a paid plan,
adding a payment method or enabling any paid overage requires a new explicit
Owner approval.

## Current Supabase Evidence

```text
organization plan: Free
spend cap: ENABLED
payment methods: NONE
current Auth email rate limit: 2 emails / hour
custom SMTP: NOT CONFIGURED
```

The current two-email hourly limit is enforced by the built-in provider and is
not editable until Custom SMTP is configured. P11 does not authorize that
configuration.

## ACOS Fail-Closed Ceiling

```text
current effective production send: 0 emails / hour
activation global window: 3,600 seconds
activation global attempted-signup limit: 1
derived maximum: 1 / hour, 24 / day, 744 / 31-day month
quota exhaustion: FAIL CLOSED
```

The approved activation ceiling is lower than the current Supabase Auth
two-email hourly limit and lower than both Resend Free ceilings. An attempted
platform signup consumes the ACOS global bucket before Auth is called; provider
failure must not create additional capacity.

P12 must place these exact production limiter values in the approved Vercel
Production server environment. Until that evidence exists, runtime remains
disabled and the effective send ceiling remains zero.

## Guardrails

- Do not add a payment method.
- Do not upgrade either provider.
- Do not enable pay-as-you-go or disable the Supabase spend cap.
- Do not raise the ACOS ceiling without a new quota review and Owner approval.
- Do not treat provider quota as an entitlement or delivery guarantee.
- Do not record recipient addresses, credentials or provider session data.

## Next Gate

P12 must close the project-specific secret and non-secret destination map
without creating an SMTP credential or enabling public signup.
