# Track B Messaging Dispatch Migration Contract Review

**Task:** `ENG-DB-041`
**Status:** APPROVED / IMPLEMENTED
**Track:** Track B - Customer Engagement Platform
**Migration:** `20260728171400_message_dispatch_043.sql`
**Scope:** Message job persistence and append-only delivery-attempt history

## Decision Boundary

This review defines the database contract for Messaging Dispatch. It does not add provider credentials, call LINE/SMS/Email APIs, implement workers, or enable bulk sending.

## Dependency Baseline

- Campaign Core migration `20260728170527_campaign_core_042.sql` is validated.
- Consent / Suppression migration `20260728163536_consent_suppression_038.sql` is validated.
- Content Core migration `20260728161057_content_core_035.sql` is validated.
- Existing `channel_accounts` remains the provider-account identity boundary.
- Provider credentials remain outside PostgreSQL application tables and must use encrypted configuration or secure secret management.

## Proposed Tables

```text
message_jobs
message_delivery_attempts
```

`message_jobs` represents one outbound message intent per organization, recipient, channel, and content/purpose context. It references the customer and may reference a campaign, campaign run, and content post.

`message_delivery_attempts` is append-only provider-attempt history. It records provider, attempt number, status, optional provider message ID, safe error fields, attempted time, and sanitized response metadata.

## Contract Rules

1. Supported channels are `LINE`, `SMS`, and `EMAIL`.
2. Supported message-job states are `PENDING`, `QUEUED`, `SENDING`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`, `SUPPRESSED`, and `SKIPPED_NO_CONSENT`.
3. Every outbound message requires a durable message job before provider dispatch.
4. `unique (organization_id, idempotency_key)` is the duplicate-send guard. Retries reuse the same key and create a new delivery-attempt row.
5. Delivery attempts are append-only with `unique (message_job_id, attempt_no)`.
6. Provider error text and response metadata are safe summaries only; secrets and raw credentials must never be persisted.
7. Bulk dispatch is a worker/queue responsibility; this migration does not provide synchronous sending behavior.
8. Before a worker moves a job to `SENDING`, the service boundary must re-check current consent, active suppression, tenant quota, and provider readiness.
9. Campaign cancellation cancels unsent jobs; sent messages cannot be unsent. Permanent failures must not retry endlessly.
10. Direct browser writes and provider calls are outside the database boundary; guarded service/RPC boundaries are required for lifecycle mutation.

## Owner Decisions Required

| Decision | Recommendation | Why it matters |
|---|---|---|
| Purpose vocabulary | Reuse `consent_purpose`; campaign purposes exclude `ORDER_UPDATE`, while operational messaging may use it only through a separately approved service path | Prevents marketing and operational consent from being conflated |
| Dispatch-time eligibility | Re-check consent and active suppression immediately before `SENDING`; snapshot membership alone is insufficient | Required by `BR-AUDIENCE-007` and `CONSENT-BR-003` |
| Provider identity | Reference existing `channel_accounts`/provider boundary in service logic; do not create credentials storage in 043 | Keeps secrets outside PostgreSQL and avoids a duplicate integration source of truth |
| Destination handling | Persist only a normalized destination or protected reference approved by the service boundary; do not expose raw destinations to browser clients | Limits sensitive contact-data exposure |
| Retry semantics | Reuse message-job idempotency key; increment attempt number; classify transient vs permanent failures in the orchestrator | Prevents duplicate sends and infinite retries |
| Database access | RLS enabled; revoke direct table privileges from `public`, `anon`, and `authenticated`; service/guarded boundary owns lifecycle writes | Aligns with the validated Track B security pattern |
| Attempt history | Append-only; no update/delete path for delivery attempts | Preserves provider auditability |

## Explicit Non-Goals

- No provider credential table or secret storage.
- No LINE/SMS/Email adapter implementation.
- No Edge Function or queue worker implementation.
- No usage-meter extension; quota enforcement remains a service dependency until the usage contract is approved.
- No customer-to-customer messaging.

## Validation Evidence

- Migration `20260728171400_message_dispatch_043.sql` was generated with the Supabase CLI and replayed from `001` through `043`.
- Supabase security, workflow, carrier webhook E2E, commerce integration, lint, typecheck, and full test gates passed.
- Full Node test suite passed `58/58`.
- Delivery attempts are protected by the append-only trigger and both tables deny direct browser privileges.

**NEXT:** `ENG-DB-042` Events / Attribution migration contract review.
