# Track B Consent / Suppression Migration Contract Review

**Task:** `ENG-DB-038`
**Status:** APPROVED / IMPLEMENTED
**SQL status:** VALIDATED in local fresh replay
**Track:** Track B - Customer Engagement Platform
**Scope:** Current consent state, append-only consent events, and delivery suppression metadata

## Source Baseline

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md`
- `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md`
- validated Core customer schema from migration `010_customers.sql`
- validated Track B migrations through `20260728163005_follow_interest_037.sql`

## Proposed Migration Scope

Create only:

```text
customer_consents
customer_consent_events
customer_suppressions
```

The migration must not send messages, dispatch campaigns, call providers, calculate quota, or infer consent from follow/interest state.

## Verified Dependency Mapping

| Dependency | Repository target | Result |
|---|---|---|
| Tenant | `organizations(id)` | READY |
| Customer | `customers(organization_id, id)` | READY |
| Actor profile | `profiles(id)` | READY; no public `users` table |
| Follow / Interest | migration 037 tables | Separate; never a consent source |
| Channel identity | `customer_identities` / destination data | Optional runtime lookup; no new hard FK in this migration |

Destination may be present without `customer_id` for suppression, so suppression lookup must support organization + channel + destination as an independent boundary.

## Proposed Consent Contract

- Channels: `LINE`, `SMS`, `EMAIL`, `PHONE`.
- Purposes: `ORDER_UPDATE`, `LIVE_NOTIFICATION`, `PROMOTION`, `NEW_PRODUCT`, `LOYALTY`, `CONTENT_UPDATE`.
- Status: `GRANTED`, `REVOKED`, `UNKNOWN`.
- `UNKNOWN` is not eligible for marketing.
- Current consent is unique by organization, customer, channel, purpose, and normalized destination.
- Every consent change creates an append-only event with actor/source/policy context.
- Revoke must be visible to the later dispatch-time check; this migration does not implement dispatch.

## Proposed Suppression Contract

- Types: `BOUNCED`, `COMPLAINED`, `BLOCKED`, `UNSUBSCRIBED`, `MANUAL_SUPPRESS`, `INVALID_DESTINATION`.
- Scope supports organization, optional customer, channel, optional purpose, and optional destination.
- Active suppression is `starts_at <= now()` and (`ends_at` is null or `ends_at > now()`).
- Suppression overrides consent for the affected scope.
- Multiple source records may coexist; the dispatch/read boundary must evaluate active records.

## Owner Decisions Required Before SQL

1. **Consent key normalization:** approve a unique expression index using `coalesce(destination, '')` and service normalization of destination before writes.
2. **Consent timestamp checks:** approve status checks requiring `granted_at` for `GRANTED`, `revoked_at` for `REVOKED`, and neither timestamp as mandatory for `UNKNOWN`.
3. **Append-only enforcement:** approve database-level revoke of UPDATE/DELETE for browser roles plus an append-only trigger for `customer_consent_events`.
4. **Suppression overlap:** approve allowing multiple active suppression records for audit/source fidelity, with active evaluation handled by the guarded dispatch boundary.
5. **RLS staging:** approve RLS enabled with no direct browser policies; consent self-service and admin/provider ingestion must use guarded service/RPC boundaries.

## Owner Approval Record

Owner approval recorded 2026-07-28:

- normalize destinations at the service boundary and enforce the coalesced current consent key;
- require status-specific consent timestamps;
- protect consent events with database-level append-only behavior;
- allow multiple active suppression records for source and audit fidelity;
- enable RLS and deny direct browser table access until guarded consent/suppression actions exist.

## Security Requirements

- Enable RLS on all three tables.
- Revoke direct table privileges from `public`, `anon`, and `authenticated` until guarded consent/suppression actions exist.
- Use composite tenant FKs for customer, consent, event, and actor references.
- Keep consent and suppression separate from follow/interest.
- Do not expose destination data or dispatch eligibility through an unguarded browser table path.
- Preserve append-only event history and avoid destructive cleanup of consent evidence.

## Acceptance Gate

After the five decisions were recorded, migration `20260728163536_consent_suppression_038.sql` was generated with the Supabase CLI, replayed from `001` through current, and validated for channel/purpose/status/type checks, current-key uniqueness, event append-only behavior, active suppression lookup, RLS, and direct-role denial.

## Current Result

`ENG-DB-038` is `VALIDATED`. The migration creates current consent, append-only consent events, and suppression metadata only; dispatch/provider logic remains a later boundary.

**NEXT:** Contract review for `ENG-DB-039` Retention Metrics.
