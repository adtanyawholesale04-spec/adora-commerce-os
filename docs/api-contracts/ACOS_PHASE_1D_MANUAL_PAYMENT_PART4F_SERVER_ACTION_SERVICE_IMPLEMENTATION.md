# Phase 1D Manual Payment Part 4F Server Action Service Implementation

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART4F`

**Implementation Date:** 2026-08-01

**Status:** IMPLEMENTED LOCALLY / VALIDATED

**Depends On:** Owner-frozen RV01-RV24 and RM01-RM30; locally validated Part 4D and Part 4E migrations

**Admin UI / Feature Activation / Production:** NOT AUTHORIZED

## Objective

Implement the frozen Staff Review application boundary without exposing a
browser Supabase mutation path or allowing post-commit event delivery to
compensate committed financial truth.

## Runtime Boundaries

`src/lib/admin/manual-payment-review.ts` uses only the authenticated cookie
session client for the queue, private detail, verification and rejection RPCs.
It resolves the canonical active organization from Admin context, performs an
early permission affordance check, validates exact browser inputs and strictly
parses every bounded response. Database functions remain the final authority.

The browser action envelope contains only:

```text
paymentTransactionId
expectedStatus = PENDING
reason
requestId
```

Organization, reviewer, amount, currency and terminal state are never accepted
from the browser. Raw database errors, references and reasons are never logged
or returned outside their approved bounded result.

## Post-commit Handoffs

`src/lib/admin/manual-payment-review-handoff.ts` is the only Part 4F secret
client boundary.

- Approval re-reads the canonical paid Storefront order and records
  `ORDER_PAID` through `api_record_attribution_event` with a deterministic UUID.
- Rejection calls `api_record_storefront_payment_failed_event`, which proves the
  committed rejection audit before appending one idempotent cart event.
- Both handoffs return `recorded` or `retry_pending` and are independently safe
  to retry.
- Handoff failure never changes, reverses or hides a committed verification or
  rejection result.

## Feature Gate

The runtime remains disabled unless both conditions are true:

```text
ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_ENABLED=true
ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_KILL_SWITCH is not true
```

The repository defaults remain `false` and `true`. No Admin review route or
action UI is enabled by this task.

## Validation

Part 4F validation covers disabled-by-default behavior, canonical Admin context,
queue/detail permission separation, exact RPC arguments, strict response
allowlists, reason and UUID rejection, controlled error mapping, approval and
rejection handoff selection, secret-client isolation, deterministic event
identity and the rule that post-commit failure cannot invalidate settlement.

Production was not queried or changed.
