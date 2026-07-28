# Track B Audience / Campaign Dependency Contract Review

**Task:** `ENG-DB-040`
**Status:** APPROVED / AUDIENCE IMPLEMENTED
**SQL status:** Migration 041 VALIDATED; Campaign 042 remains gated
**Track:** Track B - Customer Engagement Platform
**Scope:** Audience snapshot dependency for Campaign Foundation

## Source Baseline

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md`
- `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md`
- validated migrations through `20260728164249_retention_metrics_040.sql`

## Dependency Decision

Audience must be implemented before Campaign:

```text
Migration 041: audience_segments
  -> audience_segment_rules
  -> audience_static_members
  -> audience_snapshots
  -> audience_snapshot_members

Migration 042: marketing_campaigns
  -> campaign_runs
```

Campaign preparation and dispatch must depend on a frozen audience snapshot. Campaigns must never dispatch directly from a live dynamic query.

## Proposed Audience Contract

- Segment types: `STATIC`, `DYNAMIC_RULE`, `SNAPSHOT`.
- Dynamic rule JSON is data only; validation and evaluation belong to a guarded service boundary.
- Snapshot records segment/rule reference, criteria hash/version, creator, timestamp, and member count.
- Snapshot members record evaluated customers at snapshot time with tenant-scoped uniqueness.
- Consent is not frozen into the snapshot; dispatch must re-check current consent and suppression.
- Customer, segment, snapshot, and member references use composite organization-scoped FKs.

## Proposed Campaign Contract

- States: `DRAFT`, `SCHEDULED`, `PREPARING`, `RUNNING`, `PAUSED`, `COMPLETED`, `CANCELLED`, `FAILED`.
- Channels: `LINE`, `SMS`, `EMAIL`; automated phone calling is deferred.
- Purposes: `PROMOTION`, `NEW_PRODUCT`, `LIVE_NOTIFICATION`, `CONTENT_UPDATE`, `LOYALTY`.
- `PREPARING`, `RUNNING`, and `COMPLETED` require an audience snapshot.
- Campaign run counters are operational summaries, not message delivery truth.
- Campaign lifecycle audit and state transition enforcement belong to guarded service/RPC boundaries.
- No messaging jobs, provider credentials, provider calls, or dispatch worker are created here.

## Verified Dependencies

| Dependency | Repository target | Result |
|---|---|---|
| Tenant | `organizations(id)` | READY |
| Customer | `customers(organization_id, id)` | READY |
| Content | `content_posts(organization_id, id)` | READY |
| Retention projection | `customer_retention_metrics(organization_id, customer_id)` | READY |
| Consent / suppression | migrations 038 tables | READY for later dispatch checks |
| Messaging | not yet migrated | Deferred; no dispatch in this contract |

## Owner Decisions Required Before SQL

1. **Migration split:** approve separate migrations 041 (Audience) then 042 (Campaign), with Campaign blocked until Audience validation passes.
2. **Snapshot immutability:** approve append-only snapshot membership after creation, with a new snapshot required for changed membership.
3. **Rule JSON boundary:** approve service-only rule validation/evaluation with `criteria_hash` and `rule_version`; never execute arbitrary SQL from JSON.
4. **Campaign transition boundary:** approve guarded service/RPC enforcement for the full state transition table, with database checks only for structural prerequisites.
5. **Audience snapshot gate:** approve requiring `audience_snapshot_id` before `PREPARING`, `RUNNING`, or `COMPLETED`, while leaving consent/suppression checks to dispatch time.

## Owner Approval Record

Owner approval recorded 2026-07-28:

- implement Audience migration 041 before Campaign migration 042;
- keep snapshot and snapshot membership append-only after creation;
- validate/evaluate rule JSON through a guarded service with `criteria_hash` and `rule_version`;
- enforce Campaign transitions through guarded service/RPC boundaries;
- require an audience snapshot before Campaign `PREPARING`, `RUNNING`, or `COMPLETED`, with consent/suppression checked again at dispatch.

## Security Requirements

- Enable RLS on all Audience and Campaign tables.
- Revoke direct table privileges from `public`, `anon`, and `authenticated` until permission-aware policies and guarded actions exist.
- Keep rule JSON non-executable and tenant-scoped.
- Never freeze consent in audience snapshots or bypass current suppression at dispatch.
- Keep campaign counters and previews separate from provider delivery truth.

## Acceptance Gate

The five decisions were recorded. Migration `20260728165559_audience_041.sql` was generated with the Supabase CLI, replayed from `001` through current, and validated. Campaign migration 042 remains gated until the Audience evidence is accepted as the dependency baseline.

## Current Result

`ENG-DB-040` is `AUDIENCE VALIDATED / CAMPAIGN GATED`. Audience schema is implemented; Campaign schema and dispatch remain ungenerated.

**NEXT:** Campaign 042 contract review and implementation using the validated Audience dependency.
