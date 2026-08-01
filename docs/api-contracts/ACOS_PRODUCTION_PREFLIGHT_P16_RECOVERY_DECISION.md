# ACOS Production Preflight P16 Recovery Decision

**Task ID:** `ACOS-PRODUCTION-PREFLIGHT-P16-RECOVERY-DECISION`
**Approval Date:** 2026-08-01
**Status:** OWNER APPROVED / POLICY FROZEN / EXECUTION BLOCKED
**Production Change:** None
**Provider Spend Authorized:** None

## Decision Scope

The Owner approves the safest initial recovery posture for ACOS Production.
This decision freezes the required provider tier, recovery objectives, Auth
and Storage coverage, restore drill and release gates. It does not authorize a
Supabase plan upgrade, PITR, a second paid project, a Storage backup provider,
a Production restore or public activation.

## Current Provider Facts

The decision uses the Supabase documentation available on 2026-08-01:

- Free projects do not have provider-managed scheduled project backups;
- Pro includes daily database backups with seven-day retention;
- PITR is a separately billed add-on and is not required for the initial
  low-volume launch posture;
- paid physical backups can be restored to a new project and include Auth user
  data;
- database backups include Storage metadata but not the underlying Storage
  objects; and
- Auth settings, API keys, Edge Functions and other project configuration must
  be inventoried and reconfigured separately.

References:

- `https://supabase.com/docs/guides/platform/backups`
- `https://supabase.com/docs/guides/platform/clone-project`
- `https://supabase.com/docs/guides/storage/management/download-objects`

## Owner-Frozen Decisions

| ID | Decision | Approved posture |
|---|---|---|
| P16-R01 | Production provider tier | Upgrade ACOS Production to Supabase Pro before Production migration apply or public activation |
| P16-R02 | Database backup | Require provider-managed daily physical backups with seven-day retention |
| P16-R03 | PITR | Defer at initial launch; reconsider when transaction volume or business loss tolerance requires an RPO below 24 hours |
| P16-R04 | Initial RPO | Maximum 24 hours after the daily backup and separate Storage backup processes are proven |
| P16-R05 | Initial RTO | Maximum 4 hours, promoted from target to approved objective only after a complete timed restore drill passes |
| P16-R06 | Pre-change recovery point | Require a verified recovery point immediately before every Production migration, Auth configuration change or public rollout |
| P16-R07 | Auth recovery | Prove restore-to-new-project coverage for Auth users and authentication records on a compatible paid non-production Supabase target |
| P16-R08 | Auth runtime configuration | Maintain a secret-name-only inventory for providers, redirect URLs, SMTP, CAPTCHA and token configuration; never commit values |
| P16-R09 | Storage recovery | Back up Storage objects separately from database metadata through the Storage/S3 interface |
| P16-R10 | Storage cadence | Daily object backup with at least seven recoverable daily sets before real customer uploads are enabled |
| P16-R11 | Storage destination | Use a private encrypted off-site destination selected under a separate provider, privacy and cost approval |
| P16-R12 | Restore target | Use a separate non-production Supabase project in the same region and compatible Postgres generation; never drill over ACOS Production |
| P16-R13 | Full drill | Restore database, Auth and Storage objects, reconcile privacy-safe counts and permissions, run security/workflow gates and delete temporary artifacts |
| P16-R14 | Failure posture | Keep signup, real checkout/payment, private uploads and public activation disabled when any recovery evidence is missing or stale |
| P16-R15 | Evidence lifetime | Repeat the full restore drill after a material provider/schema change and at least every 90 days after public launch |
| P16-R16 | Billing boundary | Every paid activation remains a separate Owner approval after the exact recurring and temporary costs are shown |

## Required Execution Parts

### P16-E1 - Provider Backup Activation

1. show the exact current Pro recurring price and billing impact;
2. obtain separate Owner approval for spend;
3. upgrade only ACOS Production;
4. verify the Backups page shows a recoverable daily backup; and
5. record only timestamps, retention and status, never credentials or data.

### P16-E2 - Managed Database And Auth Restore Drill

1. show the exact temporary project cost;
2. obtain separate Owner approval;
3. restore a provider backup to a new non-production project;
4. validate public schema, migrations, roles, RLS and Auth coverage;
5. disable external side effects before validation; and
6. delete the temporary project only after evidence and cleanup approval.

### P16-E3 - Storage Recovery Boundary

1. select an encrypted off-site destination under separate approval;
2. implement object inventory, copy, checksum, retention and deletion controls;
3. validate with synthetic non-private objects;
4. restore objects and metadata to a non-production target; and
5. prove access policies and object parity without recording private contents.

### P16-E4 - Final Recovery Acceptance

P16 may close only when all of the following are true:

```text
provider daily backup: VERIFIED
pre-change recovery point: VERIFIED
managed database/Auth restore: PASS
Storage object restore: PASS
RPO <= 24 hours: PROVEN
RTO <= 4 hours: PROVEN
security/workflow regression: PASS
temporary artifact/project cleanup: VERIFIED
```

## Cost Posture

The approved default is Pro daily backups without PITR. This is the smallest
provider-managed posture that can support the required database and Auth
restore proof. PITR remains optional because its recurring cost is materially
higher and the initial 24-hour RPO is adequate before real transaction volume
is authorized.

No Cloudflare R2 bucket, Supabase upgrade, temporary paid project, payment
method or PITR add-on is authorized by this document.

## Production Disposition

```text
P16 policy decision: OWNER APPROVED
P16 execution: BLOCKED / NOT STARTED
recurring backup: NOT VERIFIED
managed Auth restore: NOT PROVEN
Storage object restore: NOT PROVEN
Production migration apply: BLOCKED
public activation: BLOCKED
```

The historical commerce-core restore remains valid evidence, but it does not
replace P16-E1 through P16-E4.

## Next Gate

`OWNER FULFILLMENT LINT WARNING DISPOSITION`

P16 execution remains in the Production checklist and must be completed before
Production migration apply. The next zero-spend preflight decision may proceed
without weakening this recovery gate.
