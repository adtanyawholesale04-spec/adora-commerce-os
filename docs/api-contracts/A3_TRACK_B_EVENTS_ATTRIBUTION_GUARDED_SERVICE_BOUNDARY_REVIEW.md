# Track B Events / Attribution Guarded Service Boundary Review

**Task:** `ENG-SVC-001`
**Status:** IMPLEMENTED / VALIDATED FOR ATTRIBUTION RECORD ONLY
**Track:** Track B - Customer Engagement Platform
**Depends on:** Migration 044 Events / Attribution (`20260728172100_attribution_live_reminder_044.sql`)

## Purpose

Define the server-only boundaries that may write attribution/reminder history or create message jobs. The lowest-risk attribution record boundary is implemented; reminder scheduling, customer reminder submission, and provider execution remain gated.

## Boundary Map

| Boundary | Caller | Persistence | Required guards | Status |
|---|---|---|---|---|
| `engagement.attribution.record` | server event ingest / approved integration | append-only `attribution_events` | authenticated server or verified integration, tenant scope, event vocabulary, identity anchor, source FK, service-side deduplication, safe metadata | VALIDATED; `api_record_attribution_event` |
| `engagement.attribution.project` | server/job | reads Orders/Payments and writes attribution projection event only | job identity, tenant scope, completed/paid source check, currency preservation, no commerce-table mutation, audit/metrics | IN_REVIEW |
| `engagement.live_reminder.request` | authenticated customer/member boundary | `live_reminder_requests` | authenticated identity mapping, customer ownership, content/live eligibility, approved channel/offset, duplicate reuse, consent is not granted by request | GATED |
| `engagement.live_reminder.schedule` | server/job | creates `message_jobs`, updates reminder link/status | consent `LIVE_NOTIFICATION`, active suppression, provider readiness, quota, idempotency, campaign/message relationship, audit | GATED |
| `engagement.attribution.read` | Admin server read model | read-only aggregation | active membership, tenant scope, exact existing `report.view` permission, safe revenue/cost projection | IN_REVIEW |

## Mandatory Guard Envelope

Every boundary must enforce:

1. Server-only execution and authenticated identity where applicable.
2. Active membership and organization scope derived from trusted context.
3. Exact resource/customer ownership checks; no client-supplied tenant authority.
4. Enum, UUID, timestamp, offset, payload-size, and metadata validation.
5. Idempotency or service-side deduplication for retryable event/job requests.
6. Controlled error codes without exposing cross-tenant existence, SQL details, destinations, or provider secrets.
7. Audit/observability fields including request ID, organization ID, boundary ID, actor type, and source reference.

## Permission Boundary

- Do not create or seed new permissions in this task.
- `report.view` is the only currently verified permission suitable for the Admin attribution read model.
- Business-rule permissions such as `campaign.send`, `consent.view`, and `settings.messaging` require a separate permission-layer review before runtime use because their seed/runtime availability is not established by the current status evidence.
- Customer reminder submission requires an explicit authenticated customer identity and ownership contract; anonymous direct writes are not enabled.

## Financial and Privacy Rules

- Revenue is read from Orders/Payments and must retain source order/payment references in safe metadata.
- No boundary may update order totals, payment amounts, payment status, or customer source-of-truth fields.
- Raw phone/email/LINE destinations and provider credentials never enter client payloads or logs.
- Attribution events and source references are append-only; corrections use a new event/projection process.
- Reminder requests do not grant consent and do not bypass suppression.

## Required Negative Tests Before Runtime Enablement

- unauthenticated caller denied
- missing/inactive membership denied
- cross-tenant customer/content/order/message target denied
- invalid event type/model/identity denied
- invalid reminder channel/offset/status denied
- duplicate event/job request handled idempotently
- no consent or active suppression prevents scheduling
- unpaid/non-completed revenue source rejected
- direct browser table write denied
- no service role or provider secret appears in browser bundle/log payload

## Explicit Non-Goals

- No new database migration or RPC in this review.
- No new permission seed.
- No anonymous reminder write path.
- No campaign automation engine, provider adapter, or synchronous sending.
- No ROI dashboard implementation.

## Implemented Boundary

Migration `20260728172741_attribution_guarded_service_boundary_045.sql` adds `api_record_attribution_event` with service-role-only execute, source/event validation, audit-backed idempotency, controlled errors, and no commerce-table mutation.

**NEXT:** Usage Meter contract review. Reminder scheduling remains gated pending customer identity, consent/suppression, quota, provider readiness, and permission decisions.
