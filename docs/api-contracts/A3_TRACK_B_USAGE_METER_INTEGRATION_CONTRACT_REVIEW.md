# Track B Usage Meter Integration Contract Review

**Task:** `ENG-USAGE-002`
**Status:** `APPROVED / PARTIALLY IMPLEMENTED`
**Track:** Track B — Customer Engagement Platform
**Depends on:** Migration 046 Usage Meter Boundary and the frozen Content/Retention Business Rules

## Purpose

กำหนดจุดเชื่อม Usage Meter กับ Track B workflows โดยไม่ใช้ database trigger, ไม่เปิด direct table write และไม่ถือว่า aggregate usage เป็น billing truth

## Common Integration Contract

ทุก workflow ที่เรียก `api_record_usage_meter` ต้อง:

1. derive `organization_id` จาก trusted server/worker context;
2. call the RPC only after the workflow has validated its own lifecycle and consent rules;
3. use a stable request UUID derived from the workflow operation, not a browser-generated retry value;
4. pass the source module and source row ID;
5. treat `idempotency_reused = true` as a successful retry, not a second increment;
6. stop the workflow on high-cost quota errors (`42501` or `22023`);
7. never compensate by directly updating `subscription_usage`.

## Proposed Source Mapping

| Meter code | Source workflow event | Quantity | Source reference | Proposed status |
|---|---|---:|---|---|
| `POSTS` | guarded transition to `content_posts.status = PUBLISHED` | 1 | `content_posts.id` | READY after Content publish boundary |
| `MEDIA_UPLOADS` | guarded media completion with `upload_status = UPLOADED` | 1 | `content_media.id` | READY after Media upload boundary |
| `MEDIA_STORAGE_BYTES` | successful media completion | `file_size_bytes` | `content_media.id` | BLOCKED: aggregate semantics must distinguish cumulative upload from current storage quota |
| `FEED_EVENTS` | accepted `content_events` event | 1 per accepted event | event ID | BLOCKED: `content_events` table and event boundary are not implemented |
| `AUDIENCE_SNAPSHOTS` | successful immutable `audience_snapshots` creation | 1 | `audience_snapshots.id` | READY after snapshot service boundary |
| `CAMPAIGN_RECIPIENTS` | accepted message-job reservation for a campaign run | 1 per accepted recipient job | `message_jobs.id` | BLOCKED: reservation timing and failed/suppressed semantics require Messaging service contract |
| `LINE_MESSAGES` | approved LINE dispatch reservation | 1 | `message_jobs.id` | BLOCKED: provider dispatch boundary is not implemented |
| `SMS_MESSAGES` | approved SMS dispatch reservation | 1 | `message_jobs.id` | BLOCKED: provider dispatch boundary is not implemented |
| `EMAIL_MESSAGES` | approved Email dispatch reservation | 1 | `message_jobs.id` | BLOCKED: provider dispatch boundary is not implemented |
| `RETENTION_REFRESHES` | successful tenant refresh operation | 1 per refresh run | refresh job/request ID | BLOCKED: refresh worker and request identity are not implemented |

## Idempotency Keys

Recommended deterministic request identity:

```text
UUIDv5(namespace=ACOS_USAGE_METER, name="<meter-code>:<organization-id>:<source-id>:<event-kind>")
```

The implementation must persist the generated UUID in the owning workflow request/audit record before a retry can occur. A client must not control the tenant or source identity used to derive it.

## Quota and Failure Semantics

- `POSTS`, `AUDIENCE_SNAPSHOTS`, and `RETENTION_REFRESHES` may return `SOFT_WARNING` during pilot mode.
- `MEDIA_UPLOADS`, recipient reservations, and provider-channel reservations must be evaluated before the irreversible workflow step.
- `LINE_MESSAGES`, `SMS_MESSAGES`, and `EMAIL_MESSAGES` must fail closed when entitlement is absent or the limit would be exceeded.
- The current aggregate RPC is additive. It cannot represent deletion or replacement of stored bytes without a separate usage adjustment contract.
- Provider failures after a successful reservation require an explicit reservation/refund policy; this review does not invent one.

## Boundary Sequence

```text
trusted workflow request
  -> tenant / permission / lifecycle / consent checks
  -> stable usage request UUID
  -> api_record_usage_meter
  -> quota decision
  -> irreversible workflow action or durable job transition
  -> workflow audit
```

The meter call must be part of the same guarded service decision as the action it protects. A database trigger is explicitly out of scope.

## Required Follow-up Contracts

1. Content publish boundary: define publish transition and one-time usage reservation.
2. Media upload boundary: define upload completion, storage-byte semantics, replacement, and deletion behavior.
3. Audience snapshot boundary: define snapshot creation RPC/worker and member-count versus snapshot-count usage.
4. Messaging dispatch boundary: define recipient reservation, consent/suppression checks, provider failure, and retry behavior.
5. Retention refresh boundary: define refresh job identity and whether one refresh means one run or one customer recalculation.
6. Feed event boundary: define `content_events` schema and accepted-event vocabulary before metering.

## Owner Decisions Required

| Decision | Recommendation |
|---|---|
| Storage bytes | Keep Migration 046 additive for upload-volume measurement; create a separate current-storage/quota contract before enforcing storage capacity |
| Messaging timing | Reserve quota before provider dispatch; define explicit handling for provider failure before enabling channel metering |
| Campaign recipients | Count accepted durable recipient jobs, excluding suppressed and no-consent jobs |
| Retention refresh quantity | Count one successful tenant refresh run, not individual customer rows, for the `refreshes` unit |
| Feed events | Defer until `content_events` and its guarded ingest boundary exist |

## Explicit Non-Goals

- No database trigger integration.
- No direct browser or authenticated table writes.
- No billing, provider settlement, usage refunds, or `usage_meter_events` table.
- No runtime workflow implementation until each owning service contract is approved.

## Implemented First Integration

Migration `20260728182051_content_publish_usage_boundary.sql` implements the approved `POSTS` mapping:

- guarded service-role-only publish RPC;
- legal `DRAFT`/due `SCHEDULED` to `PUBLISHED` transition;
- one `POSTS` unit per successful publish;
- usage meter and content update in one transaction;
- audit-backed idempotent retry and direct authenticated-role denial.

Remaining mappings stay workflow-specific and are not enabled by this implementation.

**NEXT:** Review and implement the next approved workflow boundary separately, beginning with Media upload semantics or Audience snapshot creation.
