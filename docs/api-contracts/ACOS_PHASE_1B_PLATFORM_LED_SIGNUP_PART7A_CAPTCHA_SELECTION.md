# Phase 1B Platform-Led Signup Part 7A CAPTCHA Selection

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART7A`
**Status:** OWNER APPROVED / FROZEN
**Provider:** Cloudflare Turnstile Free
**Approval Date:** 2026-07-29
**Migration:** None

## Selection

Cloudflare Turnstile Free is the approved CAPTCHA provider for Phase 1B
platform signup. It is suitable for development and most production
applications, supports unlimited challenges on the Free plan, and does not
require ACOS traffic to use the Cloudflare CDN.

This approval does not create a Cloudflare account, widget or secret and does
not enable public signup.

## Single Validation Owner

Supabase Auth is the only Turnstile token validation owner for signup.

```text
Turnstile widget
-> one token
-> guarded ACOS Auth request
-> supabase.auth.signUp options.captchaToken
-> Supabase Auth validates with configured Turnstile secret
```

ACOS must not call Cloudflare Siteverify before sending the same token to
Supabase Auth. Turnstile tokens are single-use, so double validation would
consume the token and make the Auth request fail.

The separate ACOS durable IP/destination limiter remains required and is not a
CAPTCHA substitute.

## Key And Secret Boundary

| Value | Location | Exposure |
|---|---|---|
| Turnstile sitekey | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public and browser-safe |
| Turnstile secret | Supabase Auth CAPTCHA configuration | Secret; never stored in ACOS browser/server env |
| CAPTCHA token | Transient signup request only | Never log, persist or put in callback state |

Supabase Auth CAPTCHA protection must be enabled with provider `Turnstile`
before any non-test signup runtime is enabled.

## Widget And Environment Policy

- Use separate development/staging and production widgets.
- Production widget hostname allowlist contains only approved production
  hostnames; it must not include `localhost` or `127.0.0.1`.
- Local automated tests use Cloudflare's published test sitekey/secret pair,
  never production keys.
- Widget action is fixed to `platform_signup`.
- Token length is bounded to 2,048 characters.
- Token is submitted within five minutes and is never retried/replayed.
- The widget is reset after every submission attempt.
- Hostname and environment mismatch fail closed.

## Failure Policy

Missing, expired, duplicate, invalid, provider-error or environment-mismatched
tokens map to the generic controlled result `rate_limited`. Raw Cloudflare or
Supabase error details are not returned to the browser.

If Turnstile or Supabase CAPTCHA validation is unavailable, signup fails closed.
Existing login and member invitation flows are unchanged unless separately
approved for CAPTCHA coverage.

## Part 6 Reconciliation

The standalone `PlatformCaptchaVerifier` port is removed from the Part 6 design
to prevent double token consumption. CAPTCHA ownership is represented by the
`PlatformEmailPasswordAuthGateway`, which accepts the transient `captchaToken`
and delegates its single validation to Supabase Auth.

## Validation Required Before Runtime

- missing/invalid/test/expired/replayed token cases;
- token maximum length;
- widget reset after submit;
- no token in logs, callback state or persistence;
- production hostname allowlist;
- Supabase Auth CAPTCHA enabled;
- durable rate limiter still runs independently;
- Admin/member-invite Auth regression;
- static, typecheck and build gates.
