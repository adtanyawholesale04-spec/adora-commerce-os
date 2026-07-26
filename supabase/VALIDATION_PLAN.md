# Supabase Validation Plan

Status: blocked until migration SQL files are present.

## Current State

- Starter pack contains `supabase/MIGRATION_README.md`.
- Migration status document says migrations `001-034` are complete.
- The actual SQL files are not present in this workspace yet.
- Supabase CLI is not currently available in PATH on this machine.

## Validation Gate

Run only against a fresh local or development Supabase database.

```text
1. Install / expose Supabase CLI
2. Add migrations 001-034 under supabase/migrations
3. Run supabase db reset
4. Resolve SQL dependency and constraint errors
5. Test Auth -> Profile -> Membership -> RLS
6. Test cross-tenant access denial
7. Test inventory reservation race conditions
8. Test append-only ledger enforcement
9. Test QC label gate through RPC/application boundary
10. Run advisors/security review before staging
```

## 2026 Supabase Notes

- New public schema tables are not automatically exposed to Data API by default on new projects.
- Exposed tables still require RLS policies and explicit grants.
- Avoid `auth.role()` policy checks; use policy `TO` clauses plus row predicates.
- Never use user-editable metadata for authorization.
