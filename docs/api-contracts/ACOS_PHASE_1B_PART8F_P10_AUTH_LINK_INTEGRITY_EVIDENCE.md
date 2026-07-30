# Phase 1B Part 8F P10 Auth Link Integrity Evidence

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P10`
**Evidence Date:** 2026-07-31
**Status:** VERIFIED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Verified Provider State

```text
Resend tracking subdomain: NOT CONFIGURED
Resend click tracking: INACTIVE
Resend open tracking: INACTIVE
Supabase Site URL: https://adora-commerce.com
Supabase redirect allowlist count: 1
Supabase redirect URL: https://adora-commerce.com/auth/platform/callback
confirmation template link: {{ .ConfirmationURL }}
```

Resend offers tracking only through creation of a separate tracking subdomain.
No tracking subdomain exists for `auth.adora-commerce.com`, so provider click
and open tracking cannot rewrite authentication links.

## Application Integrity

The server boundary constructs the callback from the canonical application
origin plus the fixed `/auth/platform/callback` path. Signup is rejected when
the requested callback differs from that approved value, and Supabase receives
the same value through `emailRedirectTo`.

The callback route exchanges the Supabase code server-side and redirects only
to fixed local onboarding or controlled signup status destinations. No
arbitrary redirect target is accepted from the email link.

## Guardrails

- Do not create a Resend tracking subdomain for Auth email.
- Do not enable provider click or open tracking for Auth email.
- Do not add wildcard production redirect URLs.
- Do not replace `{{ .ConfirmationURL }}` with a provider-tracked URL.
- SMTP configuration and an executed production email remain separately gated.
- No secret, token, recipient or provider authorization state is repository
  evidence.

## Fail-Closed State

```text
ACOS_PLATFORM_SIGNUP_ENABLED=false
ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true
custom SMTP: NOT CONFIGURED
production email send: NOT AUTHORIZED
public signup: NOT AUTHORIZED
```

## Next Gate

P11 must record current Resend and Supabase Auth quota evidence while retaining
USD 0 approved spend and no paid overage.
