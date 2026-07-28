# Track B Follow / Interest Migration Contract Review

**Task:** `ENG-DB-037`
**Status:** APPROVED / IMPLEMENTED
**SQL status:** VALIDATED in local fresh replay
**Track:** Track B - Customer Engagement Platform
**Scope:** Merchant follow and organization-scoped customer interest metadata

## Source Baseline

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md`
- `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md`
- validated Core customer schema from migration `010_customers.sql`
- validated Track B migrations `20260728161057` and `20260728162156`

## Proposed Migration Scope

Create only:

```text
merchant_follows
interest_topics
customer_interests
```

The migration must not create customer duplicates, consent records, suppression records, feed rows, audience segments, or customer-to-customer social graph relations.

## Verified Dependency Mapping

| Dependency | Repository target | Result |
|---|---|---|
| Tenant | `organizations(id)` | READY |
| Customer | `customers(organization_id, id)` | READY |
| Interest topic | created in this migration | READY after table creation |
| Consent | `customer_consents` not yet created | Deferred; must remain separate |
| Suppression | `customer_suppressions` not yet created | Deferred dependency for block side effect |

All customer and topic references must use composite organization-scoped FKs.

## Proposed Rules

### Merchant Follow

- Follow is customer-to-merchant relationship only, not a social graph.
- One current row per `(organization_id, customer_id)`.
- Status values are `FOLLOWING`, `UNFOLLOWED`, and `BLOCKED`.
- Unfollow removes follower-only eligibility but does not revoke marketing consent.
- Block is a follow state; suppression side effects belong to the later suppression boundary.
- Follow, unfollow, and block transitions require service/event audit, not direct browser table writes.

### Interest Topics

- Topics are organization-owned.
- Topic slug is unique within an organization.
- Customer interest is separate from consent.
- Customer opt-in/out is represented by `opted_in` plus timestamps and retained history in the current row.
- A customer can select only topics from the same organization context.

## Owner Decisions Required Before SQL

1. **Follow timestamp checks:** approve database checks requiring `followed_at` for `FOLLOWING`, `unfollowed_at` for `UNFOLLOWED`, and `blocked_at` for `BLOCKED`.
2. **Block side effect:** approve storing `BLOCKED` now and deferring suppression creation until migration 038, with the guarded service responsible for the later side effect.
3. **Interest opt-out retention:** approve retaining the row with `opted_in = false` and `opted_out_at`, rather than deleting the row.
4. **Slug normalization:** approve lower-case trimmed slugs enforced by the service boundary, with database uniqueness remaining case-sensitive until a canonical normalization rule is frozen.
5. **RLS staging:** approve RLS enabled with no direct browser policies; follow/interest writes must use guarded service/RPC contracts.

## Owner Approval Record

Owner approval recorded 2026-07-28:

- require status-specific follow timestamps;
- store `BLOCKED` as a follow state and defer suppression side effects to migration 038;
- retain customer interest rows with `opted_in = false` on opt-out;
- normalize slugs to lower-case at the service boundary before database writes;
- enable RLS and deny direct browser table access until guarded follow/interest actions exist.

## Security Requirements

- Enable RLS on all three tables.
- Revoke direct table privileges from `public`, `anon`, and `authenticated` until permission-aware policies and guarded customer actions exist.
- Enforce composite tenant FKs for customer/topic references.
- Do not treat follow as consent or allow it to bypass future consent checks.
- Do not create suppression records before the suppression model is approved and migrated.

## Acceptance Gate

After the five decisions were recorded, migration `20260728163005_follow_interest_037.sql` was generated with the Supabase CLI, replayed from `001` through current, and validated for tenant FKs, uniqueness, lifecycle/timestamp checks, opt-in/out behavior, RLS, and direct-role denial.

## Current Result

`ENG-DB-037` is `VALIDATED`. The migration creates Follow / Interest tables only; Consent and Suppression remain separate future boundaries.

**NEXT:** Contract review for `ENG-DB-038` Consent / Suppression.
