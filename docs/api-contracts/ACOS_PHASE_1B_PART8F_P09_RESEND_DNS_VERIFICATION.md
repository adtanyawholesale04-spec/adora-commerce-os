# Phase 1B Part 8F P09 Resend DNS Verification

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P09`
**Evidence Date:** 2026-07-31
**Status:** VERIFIED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Verified Boundary

```text
transactional domain: auth.adora-commerce.com
provider status: VERIFIED
sending region: Tokyo (ap-northeast-1)
DKIM: VERIFIED
SPF: VERIFIED
mail-from MX: CONFIGURED
DMARC record: _dmarc.adora-commerce.com
DMARC policy: p=none (monitoring)
DNS proxy mode: DNS ONLY
```

Cloudflare Domain Connect applied the Resend DKIM, SPF and mail-from MX records
through a one-time authorization. The DMARC monitoring record is separately
present and publicly resolvable. P09 verifies DNS posture only.

## Evidence Handling

- The repository records record names and verification states, not DKIM values.
- Domain Connect authorization state and browser session data are excluded.
- No Resend API key or SMTP credential was created.
- No DNS record authorizes public signup by itself.
- Sender identity remains gated by P08.
- Link tracking and callback integrity remain gated by P10.

## Fail-Closed State

```text
ACOS_PLATFORM_SIGNUP_ENABLED=false
ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true
production email send: NOT AUTHORIZED
public signup: NOT AUTHORIZED
```

## Next Gate

P08 requires Owner approval of the exact From address and sender name. P10 must
then reconcile link tracking and callback integrity before any production email
or signup rollout.
