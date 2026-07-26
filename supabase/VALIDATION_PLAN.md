# Supabase Validation Plan

Status: blocked until WSL/Docker Linux engine is available.

## Current State

- Starter pack contains `supabase/MIGRATION_README.md`.
- Migration status document says migrations `001-034` are complete.
- Migration files `001-034` are present under `supabase/migrations`.
- Supabase config exists at `supabase/config.toml`.
- Supabase CLI is available through `npx.cmd supabase` at version `2.109.1`.
- Docker Desktop is installed under `C:\Users\Tanya\AppData\Local\Programs\DockerDesktop`.
- `docker.exe` is available at `C:\Users\Tanya\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`, but is not in PATH.
- WSL is not installed, so Docker Desktop Linux engine returns HTTP 500 and Supabase local cannot start yet.

## Validation Gate

Run only against a fresh local or development Supabase database.

```text
1. Install WSL and make Docker Desktop Linux engine healthy
2. Add Docker CLI to PATH or keep using the full Docker Desktop binary path
3. Run `npx.cmd supabase db reset`
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
