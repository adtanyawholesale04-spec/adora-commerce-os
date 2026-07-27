# ADORA Commerce OS (ACOS)
# SUPABASE MIGRATION REPLAY PROTOCOL

**Date:** 2026-07-27
**Status:** ACTIVE VALIDATION PROTOCOL
**Scope:** Track A Fresh DB Validation reconciliation

---

## 1. Purpose

This protocol separates migration validation into evidence layers so ACOS status can be updated without guessing.

```text
Layer 1: Baseline replay 001-034
Layer 2: Current full replay 001-latest
Layer 3: RLS/security/workflow validation gates
```

`docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md` remains the source of truth. This protocol only defines how evidence is produced.

---

## 2. Source Documents

```text
docs/governance/ACOS_AI_CODING_CONSTITUTION.md
docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
reference/BUSINESS_RULES_V13.md
reference/DATABASE_SCHEMA_V1_FROZEN_V3.md
reference/SUPABASE_MIGRATION_V1_STATUS.md
```

Supabase changelog breaking changes must be checked before each validation run.

Current relevant items:

```text
Data API public table exposure defaults are changing.
Extension version pinning behavior is changing.
Self-hosted gateway behavior is changing.
```

---

## 3. Validation Layers

### Layer 1 - Baseline Replay 001-034

Goal:

```text
Replay historical Commerce Core migrations 001-034 on a fresh Supabase-prepared database.
```

Required evidence:

```text
Migration files 001-034 apply in order.
Supabase-managed schemas such as auth are available.
No historical migration file is edited.
Failure, if any, records the exact migration and root cause.
```

Important:

```text
A raw PostgreSQL database created with createdb is not equivalent to a fresh Supabase database.
```

Baseline replay must use either:

```text
1. Supabase CLI local reset/start workflow, or
2. a separate fresh Supabase development project.
```

### Layer 2 - Current Full Replay 001-latest

Goal:

```text
Replay all committed migrations from 001 through the current latest migration.
```

Required evidence:

```text
Supabase CLI local reset or fresh project replay completes.
Latest migration applied is recorded.
Post-034 hardening migrations are documented as Track A/shared hardening, not Track B production implementation.
```

### Layer 3 - RLS/Security/Workflow Validation Gates

Goal:

```text
Validate tenant isolation, permission-aware RLS, SECURITY DEFINER exposure, role matrix behavior, and transaction-critical wrappers.
```

Required commands:

```text
npm run validate:supabase-security
npm run validate:supabase-workflows
```

Optional static gate:

```text
npm run validate:static
```

---

## 4. Status Promotion Rules

Do not mark Gate A1 as passed unless Layer 1 or Layer 2 fresh replay evidence exists.

Allowed status updates from Layer 3 evidence:

```text
SEC-001 RLS test framework
SEC-002 cross-tenant test suite
Security validation notes
Workflow validation notes
```

Not allowed from Layer 3 evidence alone:

```text
CORE-DB-002 VALIDATED
Gate A1 PASSED
Gate A2 PASSED
Track B B1/B2/B3 PASSED
Any Track B production implementation status
```

---

## 5. Safe Execution Notes

`supabase db reset --local` resets the local Supabase database. It is valid evidence for a local fresh replay, but it is destructive to local database state and requires explicit owner approval before running.

If destructive reset approval is not available, create a report with:

```text
Status: BLOCKED or PARTIAL
Reason: fresh replay requires local reset or separate fresh Supabase project
Safe evidence completed: security/workflow suites on current local DB
```

---

## 6. Current Next Step

Request explicit approval for one of:

```text
Option A: Run supabase db reset --local against the current local stack.
Option B: Use a separate fresh Supabase development project for replay evidence.
```

Until one option is completed, Gate A1 remains:

```text
NOT_PASSED
```
