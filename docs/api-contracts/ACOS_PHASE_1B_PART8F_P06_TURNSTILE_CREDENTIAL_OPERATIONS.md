# Phase 1B Part 8F P06 Turnstile Credential Operations

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P06-OPERATIONS`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / OPERATING PROCESS FROZEN
**Runtime:** Production signup disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Scope

This contract governs the Cloudflare Turnstile secret used by Supabase Auth
CAPTCHA for the `ACOS Production Signup` widget. It does not authorize public
signup, provider spend, Vercel secret configuration or storage of the secret
outside Supabase Auth.

## Ownership

```text
Credential owner: ACOS Owner
Cloudflare control plane: ACOS Owner account
Supabase destination: ACOS Production Auth CAPTCHA configuration
Rotation cadence: every 90 days
Initial issuance: 2026-07-31
Next scheduled rotation due: 2026-10-29
```

P13 remains separate because broader application/provider secret ownership,
rollback contacts and revocation evidence are not completed by this P06
contract.

## Rotation Triggers

Rotate the Turnstile secret:

1. every 90 days;
2. immediately after suspected exposure;
3. after an Owner or privileged account change;
4. after a relevant Cloudflare or Supabase security incident;
5. when provider guidance requires rotation.

## Scheduled Rotation

1. Keep `ACOS_PLATFORM_SIGNUP_ENABLED=false` and
   `ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true`.
2. Confirm the widget remains restricted to `adora-commerce.com`, uses Managed
   mode and has pre-clearance disabled.
3. Rotate the Cloudflare secret without immediate invalidation. Cloudflare
   keeps the previous and new secrets valid during its two-hour grace period.
4. Put the new secret directly into Supabase Auth CAPTCHA configuration. Do not
   copy it to GitHub, Vercel, local files, CI, database rows, logs or audit
   payloads.
5. Confirm Supabase Auth CAPTCHA remains enabled with provider
   `Turnstile by Cloudflare`.
6. Run the approved invalid-token, replay-token and allowed-hostname checks
   without recording tokens or recipient data.
7. If validation fails during the grace period, restore the previous secret in
   Supabase Auth and keep the signup kill switch active.
8. After validation passes, allow the previous secret to expire naturally.
   Do not attempt another rotation during the grace period.

## Emergency Revocation

1. Keep or activate the signup kill switch before changing credentials.
2. Rotate with immediate invalidation only when exposure is suspected or
   confirmed and accepting the previous secret for the grace period is unsafe.
3. Replace the Supabase Auth CAPTCHA secret immediately.
4. Verify CAPTCHA configuration and negative-token behavior.
5. Keep public signup disabled until incident review and P15 rollback
   acceptance both pass.

## Evidence

Record only:

- UTC timestamp;
- actor role `ACOS Owner`;
- widget name and hostname;
- reason category;
- scheduled or emergency rotation mode;
- Supabase save result;
- validation result;
- incident reference when applicable.

Never record the site key, secret, token, secret hash, recipient identity,
browser storage or copied credential value.

## Decision

`OWNER APPROVED / OPERATING PROCESS FROZEN`

P06 has a named credential owner, approved destination and rotation process.
No rotation is due on initial issuance day, and this contract does not claim an
executed future rotation.
