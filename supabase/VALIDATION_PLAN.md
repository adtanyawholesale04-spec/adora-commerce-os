# Supabase Validation Plan

Status: migration replay passed; RLS hardening baseline passed.

## Current State

- Starter pack contains `supabase/MIGRATION_README.md`.
- Migration status document says migrations `001-034` are complete.
- Migration files `001-034` are present under `supabase/migrations`.
- Supabase config exists at `supabase/config.toml`.
- Supabase CLI is available through `npx.cmd supabase` at version `2.109.1`.
- Docker Desktop is installed under `C:\Users\Tanya\AppData\Local\Programs\DockerDesktop`.
- `docker.exe` is available at `C:\Users\Tanya\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`, but is not in PATH.
- WSL is installed and Docker Desktop Linux engine is healthy.
- `npx.cmd supabase start` completed successfully.
- `npx.cmd supabase db reset` replayed migrations `001-035` successfully.

## Validation Gate

Run only against a fresh local or development Supabase database.

```text
1. Test Auth -> Profile -> Membership -> RLS
2. Test cross-tenant access denial
3. Test inventory reservation race conditions
4. Test append-only ledger enforcement
5. Test QC label gate through RPC/application boundary
6. Run advisors/security review before staging
```

## 2026 Supabase Notes

- New public schema tables are not automatically exposed to Data API by default on new projects.
- Exposed tables still require RLS policies and explicit grants.
- Avoid `auth.role()` policy checks; use policy `TO` clauses plus row predicates.
- Never use user-editable metadata for authorization.
