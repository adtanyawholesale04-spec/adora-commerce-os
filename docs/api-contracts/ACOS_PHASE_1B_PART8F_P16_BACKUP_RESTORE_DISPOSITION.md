# Phase 1B Part 8F P16 Backup and Restore Disposition

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P16`
**Approval Date:** 2026-07-31
**Status:** DEFERRED / PRODUCTION BLOCKER / CORE DRILL VALIDATED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Verified Provider Posture

```text
project: ACOS Production
project ref: pirewyrhddrhmtiwmlaw
region: ap-northeast-1 (Tokyo)
plan: Free
scheduled project backups: NOT INCLUDED
point-in-time recovery: NOT ENABLED / PAID ADD-ON
restorable provider backup: NONE VERIFIED
successful commerce-core restore drill: VERIFIED
successful full managed-service restore drill: NOT PROVEN
```

The Supabase Dashboard states that the Free Plan does not include project
backups. Current Supabase documentation limits automatic daily backups to Pro,
Team and Enterprise projects and recommends regular CLI exports plus off-site
storage for Free projects.

P16 does not authorize a paid-plan upgrade, PITR, payment method or provider
restore against production.

## Ownership

```text
backup policy owner: ACOS Owner
restore drill owner: ACOS Owner
recovery decision owner: ACOS Owner
fallback operator: NONE APPROVED
fallback disposition: KEEP SIGNUP DISABLED
```

No operator may perform a production restore, retain private data or choose a
durable off-site destination without explicit approval.

## Restore Drill Evidence

The Owner separately approved an encrypted temporary destination and a
read-only production export into an isolated Docker database. The
2026-07-31 drill is recorded in
`docs/testing/ACOS_PHASE_1B_PART8F_P16_RESTORE_DRILL_REPORT_2026-07-31.md`.

Verified results:

```text
production writes: NONE
temporary encryption/checksum: PASS
isolated Docker network: NONE
public tables/rows: 155 / 73 / MATCH
public functions/policies/triggers: 65 / 545 / 86 / MATCH
public RLS enablement: 155 OF 155 / MATCH
Auth users/audit rows: 0 / 0
Storage buckets/objects: 0 / 0
commerce-core restore: PASS
full managed Auth/Storage service restore: NOT PROVEN
temporary artifact deletion: PASS
```

The standalone Postgres target lacked the current managed Auth
`audit_log_entries.ip_address` column expected by the production data export.
The all-schema restore therefore stopped fail-closed. Public data was restored
from an explicit `public`-schema export and matched Production without
filtering individual rows.

## Frozen Zero-Cost Recovery Policy

The repository and validated migrations are the source of truth for schema,
functions, grants, RLS and Edge Function source. They are not a backup of
production data, Auth identities, Storage objects or provider configuration.

Before any P15 smoke-test execution, the recovery set must include:

1. a Supabase-aware logical export of roles, schema and data;
2. migration history sufficient to reconcile the restored schema;
3. an explicit Auth coverage disposition;
4. a separate Storage object inventory and backup disposition;
5. an inventory of extensions, publications and required provider settings;
6. Edge Function source from the repository and a list of required server
   secrets without their values;
7. checksums and UTC timestamps for private backup artifacts;
8. an approved encrypted destination outside Git and outside the project being
   protected.

The current CLI reference states that managed schemas such as `auth` and
`storage` can be excluded by Supabase-specific dump filtering. The drill must
therefore verify actual coverage rather than assume that one dump contains
every recoverable service.

## Required Backup Cadence

- Create a verified recovery set immediately before every production migration,
  Auth configuration change or P15 activation deployment.
- Once public data is authorized, a maximum 24-hour recovery-point objective is
  required until a stronger policy is approved.
- Do not claim the 24-hour objective until an automated or Owner-executed daily
  export and secure retention process is validated.
- Backup retention length remains blocked until the encrypted destination,
  capacity and deletion procedure are approved.

The current effective recovery-point objective remains undefined because the
approved temporary recovery set was deleted after the drill and no recurring,
durable encrypted backup is verified.

## Required Restore Drill

The first drill must be non-destructive:

1. obtain separate approval to export potentially private production data;
2. write backup artifacts only to an approved encrypted temporary location;
3. restore into an isolated local Docker or dedicated non-production target
   compatible with the production Postgres major version;
4. never restore over `ACOS Production`;
5. verify migration history, extensions, functions, triggers, grants, RLS and
   direct-role denial;
6. compare privacy-safe table counts without recording customer or Auth rows;
7. verify Auth identity coverage explicitly;
8. verify Storage metadata and object coverage separately;
9. verify Edge Function source/configuration recovery without copying secret
   values;
10. run the full security, workflow, typecheck, test and build gates;
11. measure restore duration before proposing a recovery-time objective;
12. securely remove temporary private artifacts according to the approved
   retention disposition.

The drill fails if any required scope is missing, any secret enters a dump or
log, the target is not isolated, validation is incomplete or artifact deletion
cannot be confirmed.

## Current Gaps

- Free Plan provides no scheduled restorable project backup.
- No recurring encrypted off-site destination or retention process is
  approved.
- The temporary logical recovery set was deleted after the approved drill.
- Future Auth identity recovery is not proven on a compatible managed target.
- Future Storage object recovery is not proven on a compatible managed target.
- The observed drill window is not an approved recovery-time objective.
- No successful full Supabase managed-service restore drill exists.

These are active blockers, not optional caveats.

## Rollout Disposition

```text
P16 policy: OWNER APPROVED
P16 recovery evidence: PARTIAL
commerce-core restore drill: VALIDATED
full managed-service restore drill: BLOCKED
P15 smoke-test execution: BLOCKED
public signup: BLOCKED
production restore: NOT AUTHORIZED
```

P15 may not proceed merely because the database is currently small or expected
to contain no customer data. Recovery must be proven from evidence, not assumed
from expected contents.

## Privacy And Evidence Boundary

Repository evidence may contain only:

- UTC timestamps;
- provider plan and backup capability;
- artifact class, checksum status and restore result;
- privacy-safe object/table counts;
- validation outcome and measured duration;
- Owner disposition.

Never commit or record backup contents, database URLs, passwords, access tokens,
secret keys, Auth identities, recipient addresses, raw rows, Storage objects or
private artifact paths.

## Decision

`DEFERRED / PRODUCTION BLOCKER / CORE DRILL VALIDATED`

The encrypted temporary backup and isolated commerce-core restore succeeded,
including privacy-safe parity checks and artifact deletion. P16 is not complete
because a compatible full Auth/Storage service restore and recurring restorable
backup remain unproven. Production remains fail-closed.

## Next Gate

Owner approval is required before either:

1. creating a compatible non-production Supabase target for the Auth/Storage
   restore proof; or
2. enabling a paid provider-managed backup or recovery capability.

No full-recovery claim may be made from the commerce-core result alone.

## Development Sequencing Disposition

The Owner approved deferring the remaining P16 production recovery work while
ACOS completes a locally testable Web app and UI/UX. The binding decision is
recorded in
`docs/api-contracts/ACOS_PHASE_1B_PART8F_P16_DEFERRED_WEB_APP_FIRST_OWNER_DECISION.md`.

Deferral does not authorize public signup, production email, real customer
onboarding, real checkout/payment or collection of material production data.
P16 must resume before any of those activities.
