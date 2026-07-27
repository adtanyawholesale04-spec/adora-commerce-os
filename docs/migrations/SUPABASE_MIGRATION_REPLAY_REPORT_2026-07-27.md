# ADORA Commerce OS (ACOS)
# SUPABASE MIGRATION REPLAY REPORT

**Date:** 2026-07-27
**Status:** PARTIAL
**Protocol:** `docs/migrations/SUPABASE_MIGRATION_REPLAY_PROTOCOL.md`

---

## 1. Summary

This run completed non-destructive validation gates on the current local Supabase stack.

Fresh replay is not marked passed because `supabase db reset --local` was not run. The reset command would wipe and recreate the current local Supabase database, so it requires explicit owner approval.

---

## 2. Environment Observed

Supabase CLI:

```text
2.109.1
```

Local Docker/Supabase stack:

```text
supabase_db_adora_commerce_os: healthy
supabase_auth_adora_commerce_os: healthy
supabase_rest_adora_commerce_os: running
supabase_studio_adora_commerce_os: healthy
supabase_kong_adora_commerce_os: healthy
```

Note:

```text
supabase_vector_adora_commerce_os was restarting during observation.
It was not required for the Postgres/RLS validation suites run here.
```

---

## 3. Baseline Replay 001-034

Status:

```text
NOT_PASSED
```

Safe attempt:

```text
Created a temporary raw PostgreSQL database inside the local DB container.
Applied 001_extensions_helpers.sql successfully.
002_organizations_auth.sql failed because schema "auth" does not exist.
```

Interpretation:

```text
This is not a migration defect by itself.
A raw createdb database is not equivalent to a Supabase-prepared database because Supabase-managed schemas such as auth are missing.
```

Required next action:

```text
Run baseline/full replay through Supabase CLI local reset, or use a separate fresh Supabase development project.
```

---

## 4. Current Full Replay 001-latest

Status:

```text
NOT_RUN
```

Reason:

```text
`supabase db reset --local` is destructive to local database state and was not executed.
```

Gate A1 remains:

```text
NOT_PASSED
```

---

## 5. Security Validation Gate

Command:

```text
npm.cmd run validate:supabase-security
```

Result:

```text
PASS
```

Validated checks:

```text
supabase_db_lint pass
baseline_summary pass
security_definer_exposure pass
auth_profile_membership_rls pass
domain_rls_crud pass
permission_layer pass
product_inventory_permission_rls pass
operations_permission_rls pass
role_matrix_validation pass
supabase_security_suite pass
```

---

## 6. Workflow Validation Gate

Command:

```text
npm.cmd run validate:supabase-workflows
```

Result:

```text
PASS
```

Validated checks:

```text
inventory_transaction_wrappers pass
product_cost_wrappers pass
guarded_operations_wrappers pass
shipping_workflow_wrappers pass
carrier_webhook_boundary pass
carrier_webhook_e2e pass
supabase_workflows_suite pass
```

Carrier webhook e2e providers:

```text
flash
kerry
jandt
thailand_post
```

Duplicate webhook handling:

```text
PASS
```

---

## 7. Status Impact

Safe status updates from this report:

```text
SEC-001 can be marked VALIDATED.
SEC-002 can be marked VALIDATED.
Security/workflow evidence can be recorded under Track A validation notes.
```

Status that must not be promoted yet:

```text
CORE-DB-002
Gate A1
Gate A2
Track B B1/B2/B3
```

---

## 8. Next Required Decision

Choose one validation path:

```text
Option A:
Approve running `supabase db reset --local` on the current local Supabase stack.

Option B:
Provide or create a separate fresh Supabase development project for replay validation.
```

After either option passes, update:

```text
CORE-DB-002 through CORE-DB-007 as supported by evidence.
Gate A1 if all A1 requirements pass.
```
