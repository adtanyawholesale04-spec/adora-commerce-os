# Track B Messaging Usage Meter Integration Contract Review

**Task:** `ENG-USAGE-003`
**Status:** `IN_REVIEW / RUNTIME BLOCKED`
**Track:** Track B — Customer Engagement Platform
**Depends on:** Messaging Dispatch 043, Usage Meter 046, and the Owner-approved Usage Meter Integration Contract

## Purpose

กำหนดจุดนับ quota ของ Campaign recipients และ LINE/SMS/Email โดยไม่ทำให้ provider retry กลายเป็นการนับซ้ำ และไม่เปิดการส่งข้อความก่อน provider/consent boundary พร้อม

## Proposed Meter Mapping

| Meter | Count point | Quantity | Exclusions |
|---|---|---:|---|
| `CAMPAIGN_RECIPIENTS` | Durable accepted `message_jobs` reservation | 1 per recipient job | `SUPPRESSED`, `SKIPPED_NO_CONSENT`, cancelled before reservation |
| `LINE_MESSAGES` | Channel reservation immediately before provider dispatch | 1 per LINE job | Never count a job rejected by consent/suppression/provider readiness |
| `SMS_MESSAGES` | Channel reservation immediately before provider dispatch | 1 per SMS job | Same as LINE |
| `EMAIL_MESSAGES` | Channel reservation immediately before provider dispatch | 1 per Email job | Same as LINE |

## Required Dispatch Sequence

```text
load durable message_job
  -> verify tenant and job idempotency
  -> re-check consent and suppression
  -> verify provider/channel readiness
  -> reserve CAMPAIGN_RECIPIENTS if not already reserved
  -> reserve channel-specific meter
  -> transition job to SENDING
  -> call provider adapter
  -> append delivery attempt
```

The Usage Meter call must happen before the irreversible provider call. A quota rejection must leave the job unsent and auditable.

## Idempotency Contract

`message_jobs.idempotency_key` remains the send-intent identity. Meter request IDs must be stable service-generated derivatives:

```text
recipient-meter: <organization_id>:<message_job_id>
channel-meter:   <organization_id>:<message_job_id>:<channel>
```

The recipient and channel reservations require different UUIDs because Migration 046 rejects reuse of one request ID across different feature codes.

Provider retry must reuse the same channel reservation request ID. A new delivery attempt must not create a new usage reservation.

## Failure Policy Requiring Owner Decision

The current meter is additive and has no refund/adjustment operation. Therefore:

| Failure point | Recommended behavior | Owner decision |
|---|---|---|
| Quota rejected before `SENDING` | Keep job unsent; mark controlled quota failure | PENDING |
| Provider call fails after reservation | Keep reservation as attempted spend; append failed attempt; do not retry meter | PENDING |
| Provider call succeeds but delivery later fails | Keep reservation; delivery status is separate | PENDING |
| Message job cancelled before reservation | No usage increment | PENDING |
| Duplicate worker retry | Reuse reservation request ID; no second increment | PENDING |

## Consent and Privacy Guards

- Consent and active suppression must be checked immediately before reservation.
- `ORDER_UPDATE` is operational and must not be silently counted as marketing usage without the approved channel policy.
- Raw destination values and provider secrets must not enter meter metadata, audit payloads, or browser responses.
- Provider failure text must use safe error codes/summaries only.

## Runtime Blockers

Implementation remains blocked until these boundaries exist:

1. guarded message-job lifecycle mutation;
2. provider adapter/worker contract for LINE, SMS, and Email;
3. consent/suppression recheck service;
4. Owner decision on attempted-spend behavior after provider failure;
5. focused validation with duplicate worker retry and cross-tenant denial.

## Explicit Non-Goals

- No provider adapter or secret storage.
- No synchronous browser send path.
- No usage refund/adjustment table.
- No billing or provider settlement.
- No database trigger integration.

**NEXT:** Owner approval of the proposed reservation timing and provider-failure policy, then implement the guarded message-job reservation boundary before connecting channel meters.
