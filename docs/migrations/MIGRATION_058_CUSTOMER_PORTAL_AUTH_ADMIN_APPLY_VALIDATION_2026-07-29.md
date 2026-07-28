# Migration 058 Customer Portal Auth Admin Apply Validation

**Migration:** `20260728205449_customer_portal_auth_admin_apply_boundary.sql`
**Date:** 2026-07-29
**Status:** VALIDATED

## Boundary

- `api_apply_customer_contact_change` is service-role-only and accepts only a verified request.
- The transition from `VERIFIED` to `APPLIED` is tenant-scoped to the request organization and linked `profiles.auth_user_id`.
- Repeated apply calls return an idempotent `already_applied` result.
- `api_record_customer_contact_change_apply_failure` records a sanitized retryable failure audit without storing the raw contact value.
- `src/lib/portal/contact-admin.ts` is server-only and calls Supabase Auth Admin only after reading the service-role-only request.

## Validation Gates

- Fresh `npx.cmd supabase db reset --local` replay passed.
- `npm.cmd run validate:customer-portal-auth-admin-apply` passed.
- `npm.cmd run validate:supabase-security` passed.
- `npm.cmd run validate:supabase-workflows` passed.
- `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd test` passed.

## Explicit Non-Scope

- No browser exposure of the Auth Admin client or secret key.
- No direct SQL update to `auth.users`.
- No update to canonical `customers` contact fields.
- No notification provider dispatch or customer notification mutation.
