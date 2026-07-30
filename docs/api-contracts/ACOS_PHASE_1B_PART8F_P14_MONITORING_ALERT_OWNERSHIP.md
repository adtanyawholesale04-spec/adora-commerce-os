# Phase 1B Part 8F P14 Monitoring and Alert Ownership

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P14`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / MONITORING PLAN FROZEN
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Ownership And Destinations

```text
monitoring owner: ACOS Owner
primary notification route: owner-controlled primary email of the affected provider account
fallback operator: NONE APPROVED
fallback disposition: KEEP SIGNUP DISABLED
paid monitoring service: NONE
external log export: NONE
```

P14 uses existing provider control planes and does not create a paid monitoring
service, webhook, queue, database event source or duplicate audit ledger.

## Signal Matrix

| Signal | Primary destination | Corroborating destination | Owner |
|---|---|---|---|
| Auth request and callback failures | Supabase Auth logs | Vercel Production runtime logs | ACOS Owner |
| CAPTCHA rejection and provider health | Cloudflare Turnstile analytics | Supabase Auth logs | ACOS Owner |
| Durable limiter denial or unavailability | Vercel Production runtime logs | Existing Supabase rate-limit boundary validation and provider health | ACOS Owner |
| Authentication email delivery failure | Resend transactional logs | Supabase Auth logs | ACOS Owner |
| Deployment/configuration failure | Vercel deployment and runtime logs | Relevant provider dashboard | ACOS Owner |

The provider dashboard remains the source of truth for provider-owned outcomes.
Application logs may record only a controlled event name, outcome code,
environment and coarse count. They must not record raw request input.

## Current Evidence State

```text
Supabase Auth log destination: AVAILABLE
Cloudflare Turnstile analytics destination: AVAILABLE
Vercel Production runtime log destination: AVAILABLE
Resend transactional log destination: AVAILABLE / NO PRODUCTION SENDS
consolidated automated alert sink: NOT CONFIGURED
production application signal query: NOT YET EXECUTED
```

The absence of a consolidated alert sink does not authorize a rollout. P15
must prove the named dashboards and privacy-safe queries can observe the smoke
test before the test cohort is enabled.

## Alert Policy While Runtime Is Disabled

The expected production baseline is zero signup emails and zero accepted public
signups.

| Severity | Trigger | Required response |
|---|---|---|
| Critical | Any accepted signup, production authentication email or CAPTCHA bypass while runtime is disabled | Confirm kill switch, stop deployment activity and begin P13 incident handling |
| Critical | Any suspected secret exposure or provider credential misuse | Revoke through P13 and keep signup disabled |
| High | Auth, CAPTCHA or limiter configuration becomes unavailable before a change window | Block P15 and investigate in the owning provider dashboard |
| High | Any Resend production send before Custom SMTP and P15 authorization | Stop, preserve privacy-safe evidence and investigate provider configuration |
| Review | Internet traffic reaches the disabled route but receives only the controlled disabled result | Review coarse counts; do not create customer identity or contact records |

## Smoke-Test Thresholds

These thresholds apply only to the future Owner-approved P15 cohort:

- one `auth_unavailable`, callback integrity failure or persistence failure
  stops the smoke test;
- one CAPTCHA configuration failure or accepted request without a valid
  provider decision stops the smoke test;
- one limiter storage failure, limit bypass or unexpected quota reset stops the
  smoke test;
- one failed, bounced or callback-altered authentication email stops the smoke
  test;
- five CAPTCHA or limiter denials within ten minutes trigger review for abuse
  or configuration error, without recording source identifiers;
- twenty CAPTCHA or limiter denials within ten minutes require the kill switch
  to remain active until Owner review;
- any secret, token, recipient or raw IP observed in application logs is a
  critical privacy incident.

Public-rollout thresholds are not approved by P14. They require a new baseline
after the limited cohort passes.

## Review Cadence

1. While disabled, review provider status before and after every production
   configuration or deployment change.
2. During a future smoke test, review all four signal destinations after every
   attempt and again within 15 minutes.
3. Review provider security notifications immediately through the
   owner-controlled provider-account email.
4. After a successful limited cohort, keep the rollout blocked until P15
   records the observed counts and rollback disposition.

## Privacy And Evidence Boundary

Evidence may contain only:

- UTC time window;
- provider and environment name;
- controlled event category;
- coarse attempted, allowed, denied, failed and delivered counts;
- severity and Owner disposition;
- incident reference when applicable.

Evidence must not contain an email address, raw IP, HMAC digest, CAPTCHA token,
Auth code, callback state, cookie, message body, provider credential, browser
session or recovery data. Provider logs must not be copied wholesale into the
repository.

No permanent per-attempt application audit, consent event, entitlement, usage
ledger or customer record is created by P14.

## Fail-Closed Gaps

- No consolidated automated alert sink is configured.
- No production smoke-test signal has been generated.
- The current platform-signup route remains local-only and production
  fail-closed.
- Resend SMTP remains unconfigured, so delivery monitoring has no production
  event.

These gaps are acceptable only while public signup remains disabled. P15 must
validate the exact monitoring queries and stop conditions before any limited
cohort attempt.

## Decision

`OWNER APPROVED / MONITORING PLAN FROZEN`

P14 has named destinations, an alert owner, privacy constraints, review cadence
and fail-closed thresholds. It does not claim automated alert delivery,
production telemetry, an email send or public signup.

## Next Gate

P15 must freeze the smoke-test cohort, change owner, monitoring checks,
kill-switch exercise and rollback acceptance criteria.
