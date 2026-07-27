# ADORA Commerce OS (ACOS)
# STATUS RECONCILIATION AUDIT

**Date:** 2026-07-27
**Status:** AUDIT ONLY
**Purpose:** Compare the current repository state against `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md` without promoting any gate by assumption.

---

## 1. Source Documents Reviewed

Canonical status source:

```text
docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
```

Mandatory context:

```text
docs/governance/ACOS_AI_CODING_CONSTITUTION.md
docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
reference/BUSINESS_RULES_V13.md
reference/DATABASE_SCHEMA_V1_FROZEN_V3.md
reference/SUPABASE_MIGRATION_V1_STATUS.md
```

Repository evidence reviewed:

```text
README.md
package.json
supabase/migrations
supabase/validation
supabase/PERMISSION_LAYER.md
supabase/validation/VALIDATION_REPORT.md
.github/workflows/ci.yml
git log
```

Supabase changelog reviewed for relevant breaking-change context. Items to keep in mind for future validation:

- New public schema tables may not be exposed to the Data API by default.
- Extension version pinning behavior is changing.
- Self-hosted Supabase gateway behavior is changing.

No schema or migration change is made by this audit.

---

## 2. Executive Finding

The repository has advanced beyond the conservative checkpoint in `ACOS_IMPLEMENTATION_STATUS.md`.

The direction is aligned with ACOS goals: Commerce Core security, tenant isolation, permission-aware RLS, transaction-safe wrappers, carrier webhook boundaries, and CI validation.

However, the status file has not yet been reconciled with those changes. The main drift is:

```text
Status file:
Track A A1 Fresh DB Validation = NOT_STARTED / NOT_PASSED

Repository:
Local Supabase validation, RLS hardening, permission layers, workflow wrappers,
carrier webhook validation, and CI gates exist and have local validation reports.
```

This does not mean A1 is passed. It means the repository contains partial or extended validation evidence that must be classified carefully before updating status.

---

## 3. Repository State Summary

Current migration inventory:

```text
001-034 historical Commerce Core baseline migrations exist.
11 post-034 migrations exist for security/RLS/permission/workflow hardening.
Total migration files: 45
```

Post-034 migrations present:

```text
20260726185117_035_security_rls_hardening.sql
20260726190748_authenticated_rls_table_grants.sql
20260726192643_permission_aware_domain_rls.sql
20260726193333_product_inventory_permission_rls.sql
20260726194356_inventory_transaction_wrappers.sql
20260726195240_product_cost_wrappers.sql
20260726200055_operations_permission_rls.sql
20260726201809_guarded_operations_wrappers.sql
20260726202729_shipping_workflow_wrappers.sql
20260726203930_carrier_webhook_boundary.sql
20260727104818_carrier_webhook_tracking_rpc.sql
```

Validation assets present:

```text
001_baseline_summary.sql
004_security_definer_exposure.sql
005_auth_membership_rls_test.sql
006_domain_rls_crud_test.sql
007_permission_layer_test.sql
008_product_inventory_permission_rls_test.sql
009_inventory_transaction_wrappers_test.sql
010_product_cost_wrappers_test.sql
011_operations_permission_rls_test.sql
012_role_matrix_validation.sql
013_guarded_operations_wrappers_test.sql
014_shipping_workflow_wrappers_test.sql
015_carrier_webhook_boundary_test.sql
carrier-webhook-e2e.mjs
shipping-workflow-suite.mjs
supabase-security-suite.mjs
supabase-workflows-suite.mjs
```

CI assets present:

```text
.github/workflows/ci.yml
npm run validate:static
```

Supabase local validation scripts present:

```text
npm run validate:supabase-security
npm run validate:supabase-workflows
npm run validate:supabase
```

---

## 4. Status File vs Repository Evidence

| Area | Status File Says | Repository Evidence | Audit Classification |
|---|---|---|---|
| AI-GOV-007 | Implemented | Governance docs and README read order are committed | Aligned |
| CI validation | No explicit task ID | Non-Docker GitHub Actions workflow exists | Implemented but not tracked |
| A1 Fresh DB Validation | NOT_STARTED / NOT_PASSED | Local validation report says full local reset/replay and validations passed | Evidence exists, but gate not safe to mark passed |
| CORE-DB-002 replay 001-034 | NOT_STARTED | Local report replayed 001-034 plus post-034 migrations | Needs isolated 001-034 replay result |
| CORE-DB-005 RLS validation | NOT_STARTED | RLS/security validation suites exist and have local pass evidence | Candidate partial implemented/validated after A1 scope is clarified |
| CORE-DB-006 seed roles/permissions | NOT_STARTED | Permission and role matrix validation exists | Candidate partial implemented/validated after A1 scope is clarified |
| A2 integration tests | NOT_STARTED, blocked by A1 | Several domain workflow tests exist, especially inventory/cost/operations/shipping | Partial test assets exist; A2 gate still not passed |
| SEC-001 RLS test framework | NOT_STARTED | SQL tests and Supabase validation runners exist | Strong candidate to update to IMPLEMENTED or VALIDATED after owner approval |
| SEC-002 cross-tenant suite | NOT_STARTED | Cross-tenant negative checks exist across RLS tests | Strong candidate to update to IMPLEMENTED or VALIDATED after owner approval |
| SEC-005 webhook signature verification | BLOCKED, requires provider integrations | Carrier webhook signature verification exists for shipping providers | Needs scope split: shipping webhook implemented; broader provider integrations still blocked |
| Track B B1/B2/B3 | BLOCKED / NOT_PASSED | No Track B production schema should be treated as implemented | Aligned; remains blocked |

---

## 5. Migration Numbering Drift

`ACOS_IMPLEMENTATION_STATUS.md` says:

```text
Current Protected Historical Migration Range: 001-034
Track B Reserved Migration Range: 035+
Do not generate migration 035+ until Business Rules Content Retention V1 and ER Diagram V2 are frozen.
```

Repository reality:

```text
Migration 20260726185117_035_security_rls_hardening.sql exists.
Additional post-034 timestamp migrations exist.
They are Track A / shared security hardening, not Track B Content/Retention migrations.
```

Audit interpretation:

This is a documentation/status drift, not necessarily a product-direction conflict. The post-034 migrations support Commerce Core validation and security hardening, but the status file still describes 035+ as Track B reserved.

Decision required:

```text
Should ACOS status documentation redefine:
- 001-034 as protected historical Commerce Core baseline
- 20260726+ timestamp migrations as Track A/shared hardening migrations
- Track B migration numbering as "next actual migration after current latest" instead of "035+"
```

Until this is decided, do not generate Track B migrations.

---

## 6. What Can Be Safely Updated Later

These are recommended updates, not applied by this audit:

| Section | Suggested Update | Required Evidence |
|---|---|---|
| AI Governance | Add a CI validation task entry | Existing `.github/workflows/ci.yml` and `validate:static` |
| Security | Update `SEC-001 RLS test framework` from NOT_STARTED to IMPLEMENTED or VALIDATED | Owner accepts current Supabase validation suite as the framework |
| Security | Update `SEC-002 Cross-tenant test suite` from NOT_STARTED to IMPLEMENTED or VALIDATED | Owner accepts cross-tenant checks in 005-012 |
| Track A A1 | Do not mark passed yet | Requires isolated fresh replay definition and result |
| Track A A2 | Keep NOT_PASSED | Existing tests are partial workflow validations, not complete Product -> Return flow |
| Migration Baseline | Clarify post-034 hardening migrations | Owner decision on migration range wording |
| Current Allowed Work | Add status reconciliation / CI validation refinement | Owner approval if desired |

---

## 7. What Must Not Be Updated Yet

Do not mark these as passed based on current evidence:

```text
Gate A1 Fresh DB Validation
Gate A2 Commerce Integration Test
Track B B1 Business Rule Review
Track B B2 ER Diagram V2 Freeze
Track B B3 Migration 035+
Any Track B production implementation task
```

Reason:

The available evidence is useful, but it does not satisfy each gate exactly as written in `ACOS_IMPLEMENTATION_STATUS.md`.

---

## 8. Recommended Reconciliation Plan

1. Decide migration terminology for post-034 hardening migrations.

   Recommended wording:

   ```text
   001-034 = protected historical Commerce Core baseline
   20260726+ = Track A/shared hardening and validation migrations
   Track B migrations = blocked until B1/B2, using the next actual migration number/name after current latest
   ```

2. Split Track A validation status into two layers:

   ```text
   A1 Baseline Replay 001-034
   A1+ Post-034 hardening replay and validation
   ```

3. Run an isolated baseline replay report for 001-034 only, if possible.

4. Run full current replay/report for 001-latest.

5. Update `ACOS_IMPLEMENTATION_STATUS.md` only after the exact replay evidence exists.

6. Keep Track B implementation blocked until Business Rules Content/Retention V1 and ER V2 are approved/frozen.

---

## 9. Current Safe Next Task

Recommended next task:

```text
CORE-DB-001 / CORE-DB-002 planning:
Define and run a clean Fresh DB Validation protocol that separately reports:
1. baseline replay 001-034
2. current full replay 001-latest
3. RLS/security/workflow validations
```

Allowed output:

```text
docs/migrations/SUPABASE_MIGRATION_REPLAY_PROTOCOL.md
docs/migrations/SUPABASE_MIGRATION_V1_STATUS.md or equivalent status update after validation
```

Forbidden:

```text
Do not edit historical migrations 001-034.
Do not generate Track B migrations.
Do not mark A1 passed before the replay protocol actually passes.
```

---

## 10. Audit Conclusion

Status:

```text
PARTIAL DRIFT FOUND
NO BLOCKED IMPLEMENTATION REQUIRED BY THIS AUDIT
NO SCHEMA CHANGE MADE
```

The repository work and roadmap are aimed at the same product foundation, but the status file is behind the implemented validation/security work.

The safest next move is not new feature work. It is a controlled Track A validation reconciliation that produces exact evidence for:

```text
001-034 baseline replay
001-latest full replay
RLS/security/workflow validation gates
```

Only after that should `ACOS_IMPLEMENTATION_STATUS.md` promote any Track A database or security tasks.
