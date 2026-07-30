# Phase 1B Part 8F P15 Rollout and Rollback Plan

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P15`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / PLAN FROZEN / EXECUTION BLOCKED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Ownership And Cohort

```text
change owner: ACOS Owner
monitoring owner: ACOS Owner
rollback owner: ACOS Owner
smoke-test cohort size: 1
cohort identity: dedicated Owner-controlled test mailbox
cohort address in repository evidence: FORBIDDEN
maximum attempted signup emails: 1 per 3,600 seconds
public rollout: NOT AUTHORIZED
```

The test mailbox must not belong to a customer, prospect, employee or merchant
member. Its address remains only in the Owner-controlled test operation and
must not be copied into the repository, screenshots, logs or audit evidence.

## Current Execution Blockers

P15 is an approved plan, not an executed rollout:

- P16 commerce-core restore passed, but compatible managed Auth/Storage
  recovery and recurring backup remain unproven;
- Resend Custom SMTP is not configured;
- production application signals have not passed the P14 query check;
- IP and destination limiter thresholds are not frozen;
- the current platform-signup route is local-only and explicitly fails closed
  in production;
- no production smoke-test deployment or email is authorized.

No blocker may be bypassed by changing Vercel variables, Supabase Auth settings,
DNS or application code without its own approval and validation.

## Required Change Window

The future smoke test requires one uninterrupted Owner-controlled change
window:

1. Reserve at least 45 minutes with `ACOS Owner` present.
2. Open Supabase Auth logs, Cloudflare Turnstile analytics, Vercel Production
   runtime logs and Resend transactional logs before any change.
3. Record the exact known fail-closed Vercel deployment as the rollback target
   without recording credentials or private URLs.
4. Confirm provider status, zero unexpected production sends, the USD 0 cost
   posture and P16 recovery acceptance.
5. Stop immediately if any dashboard, rollback target or required evidence is
   unavailable.

## Ordered Rollout Procedure

### Stage 0: Fail-Closed Baseline

1. Confirm `ACOS_PLATFORM_SIGNUP_ENABLED=false`.
2. Confirm `ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true`.
3. Verify a controlled production request is denied before CAPTCHA, limiter,
   Auth, email or account creation.
4. Confirm all P14 destinations can observe the expected privacy-safe baseline.

### Stage 1: Kill-Switch Exercise

1. Keep the enable flag false.
2. Exercise the future activation deployment with the kill switch true.
3. Verify the request remains denied and produces no Auth call, email, profile,
   organization, membership, consent, entitlement, audit or usage-ledger row.
4. Restore the known fail-closed deployment if any side effect occurs.

### Stage 2: Single-Cohort Attempt

This stage requires a separate execution approval after every blocker is
closed.

1. Enable only the approved production route and keep the cohort limited to the
   dedicated Owner-controlled mailbox.
2. Permit exactly one attempted signup email in the 3,600-second window.
3. Verify one Turnstile decision, one durable limiter consumption and no
   additional provider call.
4. Verify the authentication email sender, callback URL and link integrity.
5. Complete the callback once and verify the canonical profile/account
   bootstrap, tenant isolation and idempotent resume behavior.
6. Attempting again within the same global window must fail before Auth and
   must not send another email.
7. Review every P14 destination immediately and again within 15 minutes.

### Stage 3: Close The Window

1. Activate the kill switch.
2. Set the enable flag false.
3. Return production to the verified fail-closed deployment.
4. Confirm the route is denied before provider or database side effects.
5. Record only coarse counts and controlled result categories.
6. Keep public signup disabled regardless of smoke-test success.

## Immediate Rollback Triggers

Rollback is mandatory after:

- any P14 Critical or High stop condition;
- a request accepted while either rollout control requires denial;
- more than one attempted signup email in 3,600 seconds;
- CAPTCHA bypass, limiter bypass or provider call before limiter approval;
- altered callback, open redirect, expired state acceptance or callback reuse;
- duplicate profile, organization or membership creation;
- tenant/RLS/permission boundary failure;
- email failure, bounce, wrong sender or unexpected tracking;
- secret, token, recipient address, raw IP or HMAC digest in application logs;
- provider spend, payment-method or overage change;
- inability to observe all required monitoring destinations.

## Rollback Procedure

1. Promote or restore the pre-recorded known fail-closed Vercel deployment.
2. Confirm the kill switch is true and the enable flag is false in the next
   deployment configuration.
3. Do not change DNS, drop database objects, edit frozen migrations or delete
   provider evidence.
4. Stop Custom SMTP use if email behavior caused the rollback; credential
   revocation follows P13 when exposure or misuse is suspected.
5. Verify the production route is denied before CAPTCHA, Auth, email and
   account bootstrap.
6. Review the four P14 destinations and record a privacy-safe incident
   reference and disposition.
7. Do not retry during the same limiter window. A new attempt requires a new
   Owner approval and a fresh 3,600-second window.

Environment changes affect a future Vercel deployment rather than an already
running deployment. The known fail-closed deployment is therefore the primary
rollback target; editing environment variables without a deployment is not
accepted as rollback evidence.

## Acceptance Criteria

The limited smoke test passes only when:

- the disabled baseline and kill-switch exercise create no side effects;
- exactly one approved email attempt occurs;
- a second attempt in the same window is blocked before Auth;
- sender, callback, confirmation and onboarding integrity pass;
- canonical identity and tenant isolation remain intact;
- every P14 destination shows the expected privacy-safe result;
- rollback to fail-closed behavior is demonstrated;
- no private data or secret is copied into evidence;
- provider spend remains USD 0;
- the complete P16 recovery gate is closed and remains valid.

The dedicated test account is not automatically deleted. Any cleanup or
retention decision requires a separate guarded operation so production identity
and audit history are not altered ad hoc.

## Evidence Record

Record only:

- UTC change-window start and end;
- actor role `ACOS Owner`;
- deployment identifiers safe for operational evidence;
- stage and controlled outcome code;
- coarse attempted, denied, sent, delivered and completed counts;
- monitoring checks;
- rollback target and result;
- final Owner disposition.

Never record the cohort address, raw IP, HMAC digest, CAPTCHA token, Auth code,
callback state, cookie, email body, credential or browser session.

## Decision

`OWNER APPROVED / PLAN FROZEN / EXECUTION BLOCKED`

P15 has a named cohort, change owner, ordered rollout, stop conditions,
kill-switch exercise, rollback target and acceptance criteria. No deployment,
SMTP configuration, email, test identity or public signup was created.

## Next Gate

P16 must prove compatible managed Auth/Storage recovery and a recurring
restorable backup disposition. After P16 closes, the remaining implementation
and external prerequisites must be reconciled before requesting a separate P15
execution approval.
