# CORE-UI-001 Admin App Shell / RBAC Navigation Contract

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** CORE-UI-001  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## Objective

Create the first Admin MVP shell with a server-side auth boundary, tenant context placeholder, and permission-aware navigation contract.

This task does not implement module CRUD. It only creates the shell that future A3 module screens must use.

---

## Implemented Surface

| Surface | Path | Notes |
|---|---|---|
| Admin shell page | `src/app/admin/page.tsx` | Server component, dynamic, read-only shell |
| Admin auth actions | `src/app/admin/actions.ts` | Magic-link sign-in, sign-out, validated organization switch |
| Auth callback route | `src/app/auth/callback/route.ts` | Exchanges Supabase auth code or OTP token hash server-side |
| Admin context loader | `src/lib/admin/context.ts` | Uses Supabase SSR server client when env is configured |
| Navigation contract | `src/lib/admin/navigation.ts` | Maps modules to approved permission codes and action boundaries |

---

## Authorization Boundary

The shell resolves:

```text
Supabase user
-> profile
-> active organization_membership
-> membership roles
-> permission codes
-> navigation access state
```

If Supabase environment variables are missing, the shell renders a safe missing-env state and grants no permissions.

If the user is not signed in, the shell renders a sign-in-required state and grants no permissions.

Active organization selection is stored in an HTTP-only cookie. The selected organization is accepted only when it belongs to the signed-in user's active memberships; otherwise the shell falls back to the default active membership.

---

## Guardrails

- No service-role key is used.
- No browser-side sensitive mutation is added.
- No database schema, migration, role, permission, status, or financial rule is created.
- Navigation uses only permission codes already seeded in `034_seed_data.sql`.
- Sensitive actions remain documented as server/RPC/service-only boundaries.
- Organization switching validates membership server-side before changing context.

---

## Next Task

Proceed to `CORE-UI-002`:

```text
Implement Products read-only screen.
```

Do not enable module write buttons until the target module service contract and tests exist.
