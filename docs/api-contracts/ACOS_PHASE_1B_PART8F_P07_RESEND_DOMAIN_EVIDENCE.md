# Phase 1B Part 8F P07 Resend Domain Evidence

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P07`
**Evidence Date:** 2026-07-31
**Status:** VERIFIED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Verified Boundary

```text
provider: Resend
plan boundary: FREE / NO PAID UPGRADE AUTHORIZED
transactional sending domain: auth.adora-commerce.com
sending region: Tokyo (ap-northeast-1)
domain record: CREATED
DNS verification: PENDING P09
```

The dedicated transactional subdomain exists in the Owner-controlled Resend
account. This closes P07 only. Creating the domain does not authorize DNS
changes, sender identity, SMTP credentials, API keys, email delivery or public
signup.

## Secret-Free Evidence Rules

- Do not record Resend API keys, SMTP credentials or provider session data.
- Do not copy DNS record values into repository evidence.
- P09 may apply the provider-generated DNS records only after separate Owner
  approval.
- SMTP credentials may be stored only in the approved Supabase Auth boundary.
- No email may be sent until sender, DNS and callback-integrity gates are
  independently verified.

## Fail-Closed State

```text
ACOS_PLATFORM_SIGNUP_ENABLED=false
ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true
production email send: NOT AUTHORIZED
public signup: NOT AUTHORIZED
```

## Next Gate

P09 DNS verification requires separate Owner approval. P08 sender identity and
P10 link/callback integrity remain pending and must not be inferred.
