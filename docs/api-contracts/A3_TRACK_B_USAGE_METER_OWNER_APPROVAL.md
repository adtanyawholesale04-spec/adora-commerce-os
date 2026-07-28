# Track B Usage Meter Integration Owner Approval

**Task:** `ENG-USAGE-002`
**Status:** `APPROVED`
**Date prepared:** 2026-07-29
**Decision scope:** Approve the source mapping and integration guardrails only. This does not enable runtime writes, provider calls, billing, or database triggers.

## Approval Request

ขอ Owner อนุมัติค่าที่แนะนำทั้งหมดด้านล่าง เพื่อใช้เป็น canonical contract สำหรับการเชื่อม Usage Meter กับ Track B workflows

## Source Mapping

| Meter | Count point | Quantity | Recommendation |
|---|---|---:|---|
| `POSTS` | Successful guarded transition to `PUBLISHED` | 1 | Approve |
| `MEDIA_UPLOADS` | Successful guarded transition to `UPLOADED` | 1 | Approve |
| `MEDIA_STORAGE_BYTES` | Successful upload volume | `file_size_bytes` | Approve as additive upload-volume meter only; current-storage quota needs a separate contract |
| `FEED_EVENTS` | Accepted `content_events` event | 1 | Approve defer until `content_events` and ingest boundary exist |
| `AUDIENCE_SNAPSHOTS` | Successful immutable snapshot creation | 1 | Approve |
| `CAMPAIGN_RECIPIENTS` | Accepted durable recipient `message_job` reservation | 1 | Approve; exclude suppressed/no-consent jobs |
| `LINE_MESSAGES` | Approved LINE dispatch reservation | 1 | Approve quota reservation before provider call |
| `SMS_MESSAGES` | Approved SMS dispatch reservation | 1 | Approve quota reservation before provider call |
| `EMAIL_MESSAGES` | Approved Email dispatch reservation | 1 | Approve quota reservation before provider call |
| `RETENTION_REFRESHES` | Successful tenant refresh run | 1 | Approve one count per run, not per customer row |

## Decisions Requested

| # | Decision | Recommended value | Owner decision |
|---:|---|---|---|
| 1 | Storage bytes meaning | Migration 046 measures additive upload volume; current stored bytes require a later adjustment/read-model contract | PENDING |
| 2 | Messaging timing | Reserve quota before irreversible provider dispatch; provider failure policy is a separate approved service decision | PENDING |
| 3 | Campaign recipient count | Count accepted durable recipient jobs; do not count suppressed or `SKIPPED_NO_CONSENT` jobs | PENDING |
| 4 | Retention refresh quantity | Count one successful tenant refresh run, not individual customer recalculations | PENDING |
| 5 | Feed events | Defer metering until `content_events` schema and guarded ingest boundary exist | PENDING |
| 6 | Idempotency | Use a stable service-generated request UUID derived from meter, organization, source, and event kind | PENDING |
| 7 | Failure behavior | High-cost missing/exceeded entitlement fails closed; retry with the same request ID is idempotent | PENDING |
| 8 | Database coupling | No database triggers; every integration calls the service-role-only RPC from a guarded server/worker boundary | PENDING |

## Approval Effect

If approved, authorization is limited to:

- implement one guarded workflow integration at a time;
- start with `POSTS` after the Content publish boundary exists;
- add focused validation for source reference, idempotency, quota denial, and direct-role denial;
- keep all provider, billing, storage-adjustment, and Admin-control work outside this approval.

## Explicit Non-Approval

This request does not approve:

- direct browser writes;
- database triggers;
- `usage_meter_events`;
- provider adapters or message sending;
- billing, overage, refunds, or settlement;
- current-storage-byte enforcement;
- runtime integration into workflows that do not yet have a guarded service boundary.

## Owner Response

Owner approval recorded on 2026-07-29: **all recommended values above approved**.

Approval authorizes the Content publish guarded boundary and `POSTS` integration only; all explicit non-goals remain outside scope.

**NEXT:** Validate the implemented Content publish boundary, then review the next workflow-specific boundary separately.
