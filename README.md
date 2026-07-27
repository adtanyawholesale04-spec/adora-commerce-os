# ADORA Commerce OS

Conversational commerce operating system for Thai social commerce.

## Current Gate

```text
ACOS Governance -> Track A Fresh DB Validation
```

## Mandatory AI Read Order

Before any implementation work, read and obey these documents in order:

```text
1. docs/governance/ACOS_AI_CODING_CONSTITUTION.md
2. docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
3. docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
4. Latest approved Business Rules for the target module
5. Latest Frozen ER / Schema
6. Latest Migration Status
```

`docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md` is the current source of truth for task status. If a task is marked `BLOCKED`, stop and report `BLOCKED`; do not continue by assumption.

Current Commerce Core baseline reference artifacts are still stored under `reference/`:

```text
reference/BUSINESS_RULES_V13.md
reference/DATABASE_SCHEMA_V1_FROZEN_V3.md
reference/SUPABASE_MIGRATION_V1_STATUS.md
```

Do not generate Track B migration `035+` or implement Track B production tables until Business Rules Content/Retention V1 and ER V2 are approved/frozen.

## Development Commands

```text
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## First Milestone

```text
Supabase Local starts
-> migrations replay
-> security hardening applies
-> local app authenticates
-> membership resolves
-> cross-tenant access denied
```

## Important

Do not apply migrations to an existing production database before isolated validation.
