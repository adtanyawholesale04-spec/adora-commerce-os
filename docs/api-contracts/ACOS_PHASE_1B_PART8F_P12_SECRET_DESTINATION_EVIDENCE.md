# Phase 1B Part 8F P12 Secret Destination Evidence

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P12`
**Evidence Date:** 2026-07-31
**Status:** VERIFIED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Project Boundary

```text
Vercel team/project: adora1/adora-commerce-os
Vercel project ID: prj_toXXCAFY8ajeBJPlDHWby3in7jaI
environment scope: PRODUCTION ONLY
preview environment: NO P12 VALUES
development environment: NO P12 VALUES
```

No secret value is recorded in this evidence, the repository, CI, Preview or
Development.

## Verified Destination Map

| Variable | Classification | Verified destination |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser-safe public value | Vercel Production |
| `ACOS_PLATFORM_APP_ORIGIN` | Server configuration | Vercel Production |
| `ACOS_PLATFORM_SIGNUP_ENABLED` | Server rollout control | Vercel Production |
| `ACOS_PLATFORM_SIGNUP_KILL_SWITCH` | Server emergency control | Vercel Production |
| `ACOS_SIGNUP_ABUSE_HASH_SECRET` | Independent server secret | Vercel Production sensitive value |
| `ACOS_SIGNUP_ABUSE_HASH_KEY_VERSION` | Server configuration | Vercel Production |
| `ACOS_SIGNUP_RATE_LIMIT_GLOBAL_WINDOW_SECONDS` | Server limiter configuration | Vercel Production |
| `ACOS_SIGNUP_RATE_LIMIT_GLOBAL_ATTEMPT_LIMIT` | Server limiter configuration | Vercel Production |
| `ACOS_PLATFORM_CALLBACK_STATE_SECRET` | Independent server secret | Vercel Production sensitive value |
| Turnstile secret | Provider secret | Supabase Auth CAPTCHA only |
| Resend SMTP credential | Provider secret | Not created; future destination is Supabase Auth Custom SMTP only |

The two application secrets were generated independently and entered directly
into Vercel. Their values were not copied into a file, command log, evidence
record or browser bundle.

## Fail-Closed Configuration

```text
canonical origin: https://adora-commerce.com
platform signup enabled: FALSE
platform signup kill switch: TRUE
global limiter window: 3,600 seconds
global attempted-signup limit: 1
effective production email send: 0
```

The production widget sitekey is the only P12 value intentionally exposed to
browser code. The Turnstile secret remains in Supabase Auth and no SMTP
credential was created.

## Deliberately Deferred Values

IP and destination limiter thresholds remain absent because Part 7C did not
freeze numeric values for those scopes. They must not be guessed. Their absence
cannot enable signup because the explicit enable flag is false and the kill
switch is true.

Supabase application keys and the Admin invite redirect are outside this P12
platform-signup destination evidence. They require their own production
configuration reconciliation before the corresponding Admin runtime is used.

## Activation Boundary

The new Vercel values apply only to a later production deployment. P12 does not
authorize a redeploy, Custom SMTP, production email, smoke test or public
signup. P13-P16 and the final production validation remain required.

## Next Gate

P13 must freeze named rotation and emergency revocation ownership for the
application secrets without recording their values.
