# Phase 1B Part 8F P08 Sender Identity Freeze

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P08`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / VERIFIED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Exact Sender Identity

```text
sender name: ADORA Commerce
from address: no-reply@auth.adora-commerce.com
rendered identity: ADORA Commerce <no-reply@auth.adora-commerce.com>
purpose: authentication and account lifecycle email only
reply-to: NOT CONFIGURED
```

The From domain is the dedicated P07 transactional domain and its DNS posture
is verified by P09. This identity must not be reused for marketing, community
broadcasts, support conversations or tenant-originated messages.

## Guardrails

- The sender name and address are exact; runtime code must not derive them.
- No display-name impersonation or tenant-supplied override is allowed.
- No Reply-To address may be inferred from the From address.
- SMTP credentials remain restricted to Supabase Auth Custom SMTP.
- P08 does not authorize SMTP configuration, API key creation or email send.
- P10 link tracking and Auth callback integrity must pass independently.

## Fail-Closed State

```text
ACOS_PLATFORM_SIGNUP_ENABLED=false
ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true
production email send: NOT AUTHORIZED
public signup: NOT AUTHORIZED
```

## Next Gate

P10 must keep provider link tracking disabled and verify that production Auth
links preserve the exact approved callback before SMTP or rollout work begins.
