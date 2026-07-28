# Track B Usage Meter Contract Review

**Task:** `ENG-USAGE-001`
**Status:** APPROVED / IMPLEMENTED / VALIDATED
**Track:** Track B - Customer Engagement Platform
**Depends on:** Existing `subscription_usage` and `organization_entitlements` from Migration 004; validated Track B persistence through Migration 045

## Recommendation

Reuse `subscription_usage` as the V1 aggregate usage store. It already supports tenant-scoped feature usage by period and connects to entitlement limits. Do not create `usage_meter_events` in V1 unless source-level event audit becomes a confirmed requirement.

## Existing Schema Evidence

`subscription_usage` already provides:

- `organization_id`
- `feature_id`
- `usage_period_start` / `usage_period_end`
- `used_quantity`
- unique organization/feature/period key

`organization_entitlements` already provides feature-specific `limit_value` and validity windows.

The current catalog has a metered `monthly_orders` feature, but does not yet contain all Track B usage types.

## V1 Meter Catalog

Add feature catalog entries as `METERED` features with explicit units for:

```text
CUSTOMERS                  customers
POSTS                      posts
MEDIA_STORAGE_BYTES        bytes
MEDIA_UPLOADS              uploads
FEED_EVENTS                events
CAMPAIGN_RECIPIENTS        recipients
LINE_MESSAGES              messages
SMS_MESSAGES               messages
EMAIL_MESSAGES             messages
AUDIENCE_SNAPSHOTS         snapshots
RETENTION_REFRESHES        refreshes
```

Feature seed must be idempotent and must not alter existing Commerce Core feature meaning.

## Metering Boundary

Usage updates must occur through a server/worker/service boundary that:

1. derives `organization_id` from trusted tenant context;
2. resolves the metered feature by stable code and verifies it is active/METERED;
3. validates quantity as non-negative and uses the correct unit;
4. upserts the current period aggregate atomically;
5. uses a service-issued idempotency key or an existing audit/request ledger before applying retryable increments;
6. never lets a client directly update `subscription_usage`;
7. records source module/source ID in audit or service observability when available;
8. evaluates entitlement limits separately from the counter write.

## Quota Policy

- Internal pilot: soft warning is allowed.
- SaaS beta: hard guardrail is required for high-cost usage, especially LINE, SMS, Email, AI, and storage.
- No usage type defaults to unlimited.
- Overage billing, manual approval, and exact commercial prices remain outside this contract.
- A quota check must fail closed when the entitlement is missing for a high-cost action; the counter itself remains an aggregate projection, not billing truth.

## Owner Decisions Required

| Decision | Recommendation | Why it matters |
|---|---|---|
| Storage model | Reuse `subscription_usage`; defer `usage_meter_events` | Avoids a duplicate usage source and matches existing period aggregate design |
| Feature catalog | Add the 11 Track B metered feature codes above as idempotent seeds | Makes usage types addressable without changing Commerce Core tables |
| Period boundary | Use organization billing period when available; otherwise UTC calendar month | Prevents mixed periods and keeps monthly reporting deterministic |
| Retry/idempotency | Require a service request key and audit-backed dedupe before increment | Prevents duplicate counts from worker retries |
| Quota behavior | Pilot soft warning; SaaS beta hard guardrail for high-cost types | Matches `BR-USAGE-004` |
| Source attribution | Store source module/source ID in service audit/observability; do not add event table yet | Preserves traceability without premature event-ledger schema |
| Direct access | RLS plus revoke browser table writes; expose only guarded service/read-model paths | Protects quota and usage integrity |

## Explicit Non-Goals

- No billing invoice calculation.
- No provider cost settlement.
- No unlimited plan creation.
- No direct browser writes to `subscription_usage` or `organization_entitlements`.
- No `usage_meter_events` table unless Owner later approves event-level audit requirements.

## Implemented Boundary

Migration `20260728174238_usage_meter_boundary_046.sql` implements the approved V1 aggregate boundary:

- seeds the 11 metered Track B feature codes idempotently;
- adds service-role-only `api_record_usage_meter` with atomic period upsert;
- uses audit-backed request idempotency and validates unit, period, source, and quantity;
- fails closed for missing or exceeded high-cost entitlements;
- denies authenticated/public RPC execution and direct usage/entitlement DML.

## Validation Gate After Approval

After Owner approval, implement the feature seed and guarded usage upsert boundary, then validate fresh replay, idempotent retry, period uniqueness, entitlement lookup, high-cost fail-closed behavior, RLS/direct-role denial, security suite, integration suite, typecheck, lint, and full tests.

**VALIDATION:** Fresh local replay, focused boundary test, security/workflow/integration suites, lint, typecheck, and full tests passed on 2026-07-29.

**NEXT:** Integrate the guarded meter boundary with approved Track B service workflows and review the quota read model before exposing usage controls in Admin.
