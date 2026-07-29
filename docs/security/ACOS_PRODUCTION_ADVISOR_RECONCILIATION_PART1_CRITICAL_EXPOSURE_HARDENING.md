# ACOS Production Advisor Reconciliation
# Part 1 - Critical Exposure Hardening

**Date:** 2026-07-30
**Status:** PRODUCTION VALIDATED
**Migration:** `20260729181733_production_advisor_critical_exposure_hardening.sql`

---

## 1. Objective

Resolve the Part 0 critical exposure and mutable-search-path findings without
changing approved guarded RPC contracts or historical migrations.

---

## 2. Production Evidence

The pre-migration read-only inspection established:

```text
public.rls_auto_enable()
owner: postgres
security definer: true
search_path: pg_catalog
PUBLIC execute: true
anon execute: true
authenticated execute: true
```

The associated event trigger is:

```text
name: ensure_rls
owner: postgres
enabled: O
function: public.rls_auto_enable()
```

Revoking direct function execution from API roles does not remove or disable
the event trigger. The trigger continues to invoke its owner-controlled
function when its event condition is met.

---

## 3. Forward Migration

The migration:

```text
revokes direct rls_auto_enable execution from PUBLIC, anon and authenticated
sets public.set_updated_at() search_path to pg_catalog
sets public.prevent_update_delete() search_path to pg_catalog
```

The Supabase-managed function is checked with `to_regprocedure` so the migration
also replays on local Supabase stacks where automatic RLS is not provisioned.

No function body, trigger binding, table policy, guarded RPC grant or extension
is changed.

---

## 4. Validation Requirements

Before production push:

```text
focused static contract tests: PASS
fresh local replay 001-latest: PASS
security suite: PASS
workflow suite: PASS
helper search_path metadata: PASS
updated-at and append-only regression coverage: PASS
```

After an explicitly approved production push:

```text
migration history matches: PASS
PUBLIC/anon/authenticated cannot execute rls_auto_enable: PASS
ensure_rls remains enabled and postgres-owned: PASS
advisor findings for anonymous rls_auto_enable and mutable search paths clear: PASS
no guarded RPC grant changes: PASS
```

Post-push advisor count:

```text
Before Part 1: 44 WARN
After Part 1: 40 WARN
Resolved: 4 WARN
Remaining:
  authenticated SECURITY DEFINER executable: 36
  extension in public: 2
  RLS initplan performance: 2
```

---

## 5. Exclusions

Part 1 does not:

```text
reconcile the 36 authenticated guarded/helper RPC findings
move pg_trgm or unaccent
optimize profiles RLS policies
connect Vercel credentials
enable production signup
```
