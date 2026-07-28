# Track B Events / Attribution Migration Contract Review

**Task:** `ENG-DB-042`
**Status:** APPROVED / IMPLEMENTED
**Track:** Track B - Customer Engagement Platform
**Migration:** `20260728172100_attribution_live_reminder_044.sql`
**Scope:** Attribution event history and explicit live-reminder request history

## Decision Boundary

This review defines the database contract for attribution and live reminders. It does not create an automation engine, mutate order/payment totals, calculate final ROI in the database, or dispatch provider messages synchronously.

## Dependency Baseline

- Message Dispatch migration `20260728171400_message_dispatch_043.sql` is validated.
- Campaign Core migrations 041/042 and Content Core migration 035 are validated.
- Existing `orders` and `payments` remain the revenue source of truth.
- `content_live_links` is the optional live-event reference; no duplicate live-session source is introduced.

## Proposed Tables

```text
attribution_events
live_reminder_requests
```

`attribution_events` records the chain from content/campaign/message engagement to customer/order/revenue. `live_reminder_requests` records an explicit customer request for a reminder and may point to the message job created by a later guarded scheduling boundary.

## Contract Rules

1. Attribution event types are `CONTENT_VIEW`, `CAMPAIGN_CLICK`, `MESSAGE_CLICK`, `ORDER_PLACED`, `ORDER_PAID`, and `ATTRIBUTED_REVENUE`.
2. V1 attribution model is `LAST_CLICK_7D`; the seven-day window is service-owned and stored as model metadata where needed.
3. `attributed_revenue` is a read/projection value derived from the Order/Payment source of truth. Attribution cannot update order totals, payment amounts, or payment status.
4. Attribution history is append-only; correction is represented by a new event or approved projection process, not by rewriting source commerce records.
5. Live reminders require an explicit customer request and support offsets of 1440, 60, or 10 minutes. Merchant selection of enabled offsets remains a service/UI concern.
6. Live reminder dispatch must re-check consent for `LIVE_NOTIFICATION` on the selected channel and active suppression immediately before message dispatch.
7. Reminder uniqueness is tenant-scoped by organization, customer, content post, channel, and offset. Repeated requests reuse the existing request rather than creating duplicate schedules.
8. Reminder scheduling and message-job creation are guarded service responsibilities; this migration stores the optional link only.
9. All event/request foreign keys are tenant-scoped. No duplicate Customer, Order, Payment, Content, Campaign, or Message source of truth is created.
10. Direct browser table writes remain disabled until guarded attribution/reminder contracts exist.

## Owner Decisions Required

| Decision | Recommendation | Why it matters |
|---|---|---|
| Attribution event deduplication | Add an optional service-issued idempotency key or require service-side deduplication before insert; do not invent a provider event key in the migration | Prevents duplicate click/order/revenue events without silently changing the frozen ER shape |
| Revenue event policy | Permit `attributed_revenue` only for `ATTRIBUTED_REVENUE`; require the service to derive it from completed/paid commerce projections and preserve currency context in safe metadata | Keeps financial truth in Orders/Payments and prevents misleading ROI |
| Attribution identity | Allow `customer_id` or `anonymous_id`; require at least one attribution anchor in the service boundary | Supports pre-login engagement while preventing untraceable records |
| Model vocabulary | Constrain V1 to `LAST_CLICK_7D`; future models require a new approved contract | Keeps the first read model deterministic |
| Reminder offset policy | Constrain to 1440, 60, and 10 minutes; reject arbitrary offsets in V1 | Matches approved Live Reminder Rules |
| Reminder lifecycle | Use `REQUESTED`, `CANCELLED`, `SCHEDULED`, `SENT`, `FAILED`; lifecycle transitions and scheduling stay service-owned | Prevents a table write from implying a provider send occurred |
| Reminder live-link requirement | Keep `live_link_id` optional for compatibility, but service requires it when the content has a live event | Supports existing content without duplicating live-session data |
| Event/request access | Enable RLS and revoke direct privileges from `public`, `anon`, and `authenticated`; use guarded service/RPC boundaries | Protects customer engagement and revenue-related history |

## Explicit Non-Goals

- No modification of `orders`, `payments`, or revenue source tables.
- No automatic attribution calculation worker.
- No provider send, queue worker, or automation engine.
- No usage-meter extension; usage remains the next separate contract.
- No public analytics exposure or customer-to-customer messaging.

## Validation Evidence

- Migration `20260728172100_attribution_live_reminder_044.sql` was generated with the Supabase CLI and replayed from `001` through `044`.
- Supabase security, workflow, carrier webhook E2E, commerce integration, lint, typecheck, and full test gates passed.
- Full Node test suite passed `58/58`.
- Attribution history is append-only and both tables deny direct browser privileges.

**NEXT:** Events / Attribution guarded service boundary review, then Usage Meter contract review.
