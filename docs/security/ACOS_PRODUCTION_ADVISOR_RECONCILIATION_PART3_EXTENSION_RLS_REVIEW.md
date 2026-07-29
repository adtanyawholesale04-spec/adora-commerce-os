# ACOS Production Advisor Reconciliation
# Part 3 - Extension Dependency and RLS Performance Review

**Date:** 2026-07-30
**Status:** PRODUCTION VALIDATED
**Target:** `ACOS Production` (`pirewyrhddrhmtiwmlaw`)
**Scope:** 2 extension warnings and 2 RLS initplan warnings

---

## 1. Guardrails

Part 3 inspected repository and production catalog evidence. All mutation
probes ran on local Supabase inside transactions that ended with `ROLLBACK`.
Part 3 did not:

```text
move a production extension
replace a production RLS policy
create a forward migration
edit a frozen migration
connect Vercel credentials
enable production signup
```

---

## 2. Extension Decision

Production evidence:

| Extension | Version | Current schema | Relocatable | ACOS dependency |
|---|---|---|---|---|
| `pg_trgm` | `1.6` | `public` | yes | Two GIN trigram indexes |
| `unaccent` | `1.1` | `public` | yes | Frozen capability; no application call found |

The trigram indexes are:

```text
products_name_trgm_idx
product_variants_name_trgm_idx
```

The rollback-only relocation proof moved both extensions to `extensions` and
confirmed:

```text
extensions.similarity works
extensions.unaccent works
both trigram indexes remain present
the transaction rolls back to the original schema
```

Recommended decision:

```text
MOVE pg_trgm TO extensions
MOVE unaccent TO extensions
require future direct function calls to be schema-qualified
do not rebuild or drop existing indexes
```

Reason: both extensions are relocatable and the repository contains no
unqualified application calls that depend on `public`. Moving them removes
objects owned by extensions from the exposed application schema without
changing the frozen requirement that both capabilities remain enabled.

---

## 3. Profiles RLS Decision

Current predicates:

```text
profiles_self_select:
  auth_user_id = auth.uid()

profiles_self_update USING:
  auth_user_id = auth.uid()

profiles_self_update WITH CHECK:
  auth_user_id = auth.uid()
```

Recommended predicates:

```text
profiles_self_select:
  auth_user_id = (select auth.uid())

profiles_self_update USING:
  auth_user_id = (select auth.uid())

profiles_self_update WITH CHECK:
  auth_user_id = (select auth.uid())
```

The rollback-only proof confirmed:

```text
self-select returns only the caller profile
self-update permits the caller profile
cross-user update affects zero rows
USING and WITH CHECK remain present
```

Production currently denies direct table-level `UPDATE` on `profiles` to
`authenticated`. The behavior proof temporarily granted it only inside the
rollback transaction so the policy itself could be exercised. The proposed
migration must not add or change table grants.

Recommended decision:

```text
replace only the three auth.uid() expressions with initplan-safe forms
retain policy names, commands and effective access scope
do not change table grants
```

---

## 4. Proposed Forward Migration Contract

The Owner-approved forward migration is:

```text
supabase/migrations/20260729184744_reconcile_extensions_and_profiles_rls_initplan.sql
```

It:

```text
ensures schema extensions exists
alters pg_trgm and unaccent to schema extensions
replaces profiles_self_select with the initplan-safe predicate
replaces profiles_self_update with initplan-safe USING and WITH CHECK
does not edit migrations 001 or 033
does not add table or function grants
does not drop extension capabilities or trigram indexes
```

Required validation:

```text
fresh local replay
extension relocation behavior
trigram index preservation
self-select and self-update behavior
cross-user denial
database lint
security and workflow suites
repository tests
explicit production push approval
production advisor reconciliation
```

Local validation evidence:

```text
fresh replay through 20260729184744: PASS
extension relocation and trigram index preservation: PASS
profiles self-select/self-update and cross-user denial: PASS
database lint: PASS
security suite: PASS
workflow suite: PASS
carrier webhook E2E: PASS
signup rate-limit concurrency: PASS
local advisors: NO ISSUES FOUND
```

Local advisor output is not used as a substitute for the linked production
advisor count. The expected production transition below must be verified only
after an explicitly approved production push.

Expected advisor result after production verification:

```text
extension_in_public: 2 -> 0
auth_rls_initplan: 2 -> 0
authenticated SECURITY DEFINER: remains 36 by approved Part 2 contract
total WARN: 40 -> 36
```

Production validation evidence:

```text
linked migration 20260729184744: APPLIED
linked dry-run: database up to date
pg_trgm schema: extensions
unaccent schema: extensions
products_name_trgm_idx: PRESENT
product_variants_name_trgm_idx: PRESENT
profiles_self_select initplan: PRESENT
profiles_self_update USING initplan: PRESENT
profiles_self_update WITH CHECK initplan: PRESENT
authenticated profiles UPDATE grant: DENIED
anon profiles UPDATE grant: DENIED
extension_in_public: 0
auth_rls_initplan: 0
authenticated SECURITY DEFINER: 36 ACCEPTED BY PART 2 CONTRACT
total WARN: 36
```

Vercel-to-Supabase credentials and production signup remain blocked until
Part 4 closes the final reconciliation gate.
