# ACOS Track B Customer Portal Part 2 Auth Session Integration

**Task:** `PORTAL-P2-AUTH-SESSION-001`
**Status:** IMPLEMENTED / LOCAL VALIDATED
**Migration:** None

## Objective

Provide a customer-specific entry and exit path for the existing private
Customer Portal while preserving the canonical Supabase Auth, profile,
membership and customer ownership sources.

## Boundary

- `/portal/login` is the customer-facing Magic Link entry.
- The server action accepts only email and one transient Turnstile token.
- Supabase Auth uses `shouldCreateUser: false`; account creation remains the
  separately guarded platform signup flow.
- The callback destination is fixed server-side to `/portal` and never accepts
  a browser-supplied customer or organization identifier.
- `/auth/callback` continues to isolate optional member-invitation acceptance.
- `/portal` remains `force-dynamic` and resolves private data only through the
  validated `api_get_customer_portal_snapshot` ownership boundary.
- Sign-out revokes the current Auth session and clears only the active
  organization selection cookie before returning to the customer login page.

## Session Refresh

`src/proxy.ts` runs only for `/portal/:path*`. It uses the public Supabase key,
calls `auth.getClaims()` early, synchronizes refreshed cookies to the request
and response, and forwards the no-cache headers supplied by `@supabase/ssr`.
It does not authorize customer data, query tenant tables, redirect by role, or
use a service-role credential. The Portal server read boundary remains the
authorization authority.

## Security And Tenant Controls

- No `user_metadata`, email match or phone match is used for authorization.
- No new Auth, customer, profile, membership or customer-link source exists.
- Anonymous and unlinked accounts receive controlled states without private
  rows.
- Active organization and customer ownership continue to be derived
  server-side through existing membership and `customer_profile_links` rules.
- No migration, permission grant, provider activation or Production change is
  included.

## Validation

- Static contract test for the fixed callback, CAPTCHA, no-account-creation,
  sign-out and scoped SSR proxy boundaries.
- Existing Portal read/RLS, signup callback and member invitation tests.
- Lint, typecheck, repository tests and production build.
- Local route checks for `/portal` and `/portal/login`.

Local validation passed 400 repository tests, lint, typecheck, production
build, and HTTP 200 checks for both Portal routes on 2026-08-02. The focused
database suite was not rerun because Docker was unavailable; this Part has no
schema or RLS change and the previously validated Portal read boundary remains
unchanged.
