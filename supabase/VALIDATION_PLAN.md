# Supabase Validation Plan

Status: blocked until migration SQL files and Docker runtime are present.

## Current State

- Starter pack contains `supabase/MIGRATION_README.md`.
- Migration status document says migrations `001-034` are complete.
- The actual SQL files are not present in this workspace yet.
- Supabase CLI is available through `npx.cmd supabase` at version `2.109.1`.
- Docker is not currently available in PATH, so Supabase local cannot start yet.

## Validation Gate

Run only against a fresh local or development Supabase database.

```text
1. Install / expose Docker Desktop or another supported Docker runtime
2. Add migrations 001-034 under supabase/migrations
3. Run npx.cmd supabase db reset
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
