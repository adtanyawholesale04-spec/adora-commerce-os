# ADORA Commerce OS (ACOS)
# SUPABASE MIGRATION REPLAY REPORT

**Date:** 2026-07-27
**Status:** VALIDATED
**Protocol:** `docs/migrations/SUPABASE_MIGRATION_REPLAY_PROTOCOL.md`

---

## 1. Summary

This run completed a fresh local Supabase replay through Supabase CLI and re-ran security/workflow validation gates on the reset database.

The replay used `supabase db reset --local`, which wipes and recreates the local Supabase database, then applies committed local migrations from `supabase/migrations`.

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
PASS
```

Replay command:

```text
npx.cmd supabase db reset --local
```

Baseline migration range:

```text
001_extensions_helpers.sql through 034_seed_data.sql
```

Result:

```text
All baseline migrations applied successfully on a Supabase-prepared local database.
```

---

## 4. Current Full Replay 001-latest

Status:

```text
PASS
```

Replay command:

```text
npx.cmd supabase db reset --local
```

Latest migration applied:

```text
20260727104818_carrier_webhook_tracking_rpc.sql
```

Migration history check:

```text
npx.cmd supabase migration list --local
```

Result:

```text
Local migration history contains 45 migrations.
Local and applied migration versions match from 001 through 20260727104818.
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

Warning observed:

```text
node: .tmp-carrier-webhook-e2e.env: not found
```

Interpretation:

```text
The workflow command exited successfully and reported carrier_webhook_e2e pass.
The warning appears to be a cleanup/runtime stderr after successful validation, not a suite failure.
```

---

## 7. Status Impact

Safe status updates from this report:

```text
CORE-DB-001 through CORE-DB-007 can be marked VALIDATED.
Gate A1 can be marked PASSED.
SEC-001 and SEC-002 remain VALIDATED.
Security/workflow evidence can be recorded under Track A validation notes.
```

Status that must not be promoted yet:

```text
Gate A2
Track B B1/B2/B3
```

---

## 8. Next Required Work

Recommended next task:

```text
Start A2 Commerce Integration Test planning and implementation.
```

Keep blocked:

```text
Track B production implementation remains blocked until Business Rules Content/Retention V1 and ER V2 are approved/frozen.
```
