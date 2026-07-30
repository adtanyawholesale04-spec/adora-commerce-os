# Phase 1B Part 8F P13 Rotation and Revocation Operations

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P13`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / OPERATING PROCESS FROZEN
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Ownership And Contact

```text
primary operational owner: ACOS Owner
primary contact route: owner-controlled primary email of the affected provider account
fallback operator: NONE APPROVED
fallback disposition: FAIL CLOSED until ACOS Owner is available
incident record owner: ACOS Owner
```

The contact route is intentionally recorded by role and provider-account
control plane. No personal email address, phone number, credential or recovery
code belongs in repository evidence.

## Credential Register

| Credential | Current destination | Owner | Cadence / trigger | Next due |
|---|---|---|---|---|
| `ACOS_SIGNUP_ABUSE_HASH_SECRET` | Vercel Production sensitive value | ACOS Owner | Every 90 days and every emergency trigger | 2026-10-29 |
| `ACOS_PLATFORM_CALLBACK_STATE_SECRET` | Vercel Production sensitive value | ACOS Owner | Every 90 days and every emergency trigger | 2026-10-29 |
| Turnstile secret | Supabase Auth CAPTCHA only | ACOS Owner | Existing P06 90-day and emergency process | 2026-10-29 |
| Resend SMTP credential | Not created | ACOS Owner when created | Emergency and owner/provider change; cadence frozen before creation | Not applicable |
| Supabase server secret | Not configured by P12 | ACOS Owner when reconciled | Emergency and owner/provider change; cadence frozen before use | Not applicable |

Application secrets were initially issued on 2026-07-31. This operating
contract does not claim that a future rotation has already occurred.

## Rotation Triggers

Rotate or revoke the affected credential:

1. every 90 days when a cadence is active;
2. immediately after suspected or confirmed exposure;
3. after an Owner or privileged provider-account change;
4. after a relevant Vercel, Supabase, Cloudflare or Resend security incident;
5. after unexpected credential use or integrity-validation failure;
6. when provider guidance requires rotation.

## Scheduled Application-Secret Rotation

1. Keep `ACOS_PLATFORM_SIGNUP_ENABLED=false` and
   `ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true`.
2. Confirm production email and public signup are inactive.
3. Allow up to 15 minutes for every previously issued callback state to expire.
4. Generate independent replacement values for the abuse HMAC secret and
   callback-state secret. Never derive one from the other.
5. Replace both values directly in Vercel Production only. Do not place them in
   Preview, Development, GitHub, local files, CI, logs, audit payloads or
   browser code.
6. Increment `ACOS_SIGNUP_ABUSE_HASH_KEY_VERSION` together with the HMAC secret.
7. Create a production deployment only under a separately approved change
   window; P13 itself does not authorize that deployment.
8. Validate callback rejection/expiry, HMAC key version, fail-closed limiter
   behavior and absence of secrets from browser bundles and logs.
9. Keep signup disabled for at least the longest active limiter window. The
   currently approved minimum is 3,600 seconds, preventing secret rotation from
   creating additional global quota.
10. Do not enable signup until P15 rollout and rollback acceptance passes.

## Provider-Secret Rotation

- Turnstile follows the P06 two-hour grace-period process and remains stored
  only in Supabase Auth CAPTCHA.
- A future Resend SMTP credential must be replaced directly in Supabase Auth
  Custom SMTP and never copied to Vercel or the repository.
- A future Supabase server secret must be replaced only in its approved
  server-side destination and followed by tenant, RLS and guarded-action
  regression validation.
- Provider rotation must not add a payment method, paid plan or overage.

## Emergency Revocation

1. Activate or confirm the signup kill switch and keep the enable flag false.
2. Record a UTC incident timestamp, affected credential class and reason
   category without recording any credential value.
3. Revoke or invalidate the suspected credential before replacement whenever
   the provider supports immediate revocation.
4. Generate a new independent replacement and write it directly to the approved
   destination.
5. For the abuse HMAC secret, increment the key version and keep signup disabled
   for at least 3,600 seconds after the replacement deployment.
6. For the callback-state secret, treat every outstanding callback state as
   invalid and require a fresh signup attempt only after rollout is approved.
7. Run the relevant negative, isolation and secret-leak checks.
8. Keep public signup disabled until incident review and P15 rollback
   acceptance both pass.

## Rollback Contract

- Never restore a credential suspected or confirmed to be exposed.
- Application-secret rollback means issuing another clean replacement,
  updating Vercel Production and deploying under an approved change window.
- Turnstile scheduled rollback may use the previous secret only during the
  provider grace period and only when exposure is not suspected.
- If the replacement cannot be validated, keep the kill switch active. There
  is no availability override.
- The rollback decision owner and contact route are both `ACOS Owner` through
  the owner-controlled primary email of the affected provider account.

## Evidence Record

Record only:

- UTC start and completion timestamps;
- actor role `ACOS Owner`;
- credential class and destination name;
- scheduled or emergency mode;
- reason category and incident reference;
- key-version change when applicable;
- provider save/revoke result;
- validation and rollback disposition.

Never record a secret, key, token, secret hash, recipient identity, personal
contact detail, recovery code or browser session data.

## Decision

`OWNER APPROVED / OPERATING PROCESS FROZEN`

P13 has a named owner, non-private contact route, cadence, emergency revocation
steps and rollback ownership. No secret was rotated, revoked or exposed by this
approval.

## Next Gate

P14 must name monitoring destinations and alert ownership for Auth failures,
CAPTCHA failures, limiter denials and email-delivery failures.
