# Phase 1B Platform-Led Signup Part 7D Local URL And Redirect Selection

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART7D`
**Status:** OWNER APPROVED / FROZEN FOR LOCAL DEVELOPMENT
**Local Origin:** `http://localhost:3000`
**Production Origin:** Deferred until an approved deployment exists
**Approval Date:** 2026-07-29
**Migration:** None

## Selection

Phase 1B development continues locally before any public deployment. The
approved local application origin is:

```text
http://localhost:3000
```

The fixed local Auth destinations are:

```text
http://localhost:3000/auth/platform/callback
http://localhost:3000/onboarding
```

This approval does not create either route, enable public signup, change
Supabase Auth configuration, deploy the application or purchase a domain.

## Redirect Boundary

- The callback path remains exactly `/auth/platform/callback`.
- Successful platform signup may redirect only to `/onboarding`.
- No request-provided `origin`, `next`, external URL or protocol-relative URL is
  accepted.
- Wildcard redirect URLs are forbidden.
- Local development permits only the exact `localhost` origin above.
- `127.0.0.1`, alternative ports and LAN addresses are separate origins and are
  not approved by this selection.
- Admin login and member invitation callback behavior remain unchanged.

## Production Deferral

No production origin is guessed or frozen before deployment. When online
testing is required, the Owner must approve the exact HTTPS origin returned by
the selected hosting environment.

The later production decision must:

1. use one canonical HTTPS origin with no path, query or fragment;
2. derive the exact callback as `{origin}/auth/platform/callback`;
3. derive the exact onboarding destination as `{origin}/onboarding`;
4. add only those exact URLs to the Supabase Auth Site URL and redirect
   allowlist;
5. configure the matching Turnstile production hostname;
6. keep preview deployments isolated from production credentials and data;
7. reject wildcard domains and arbitrary preview origins for production Auth.

Vercel preview deployment is the preferred future online test path for the
current Next.js application. GitHub remains the source and CI boundary; a
static-only GitHub Pages deployment is not approved for server-only Auth and
dynamic application routes.

## Environment Contract

The future runtime adapter must read a server-controlled canonical origin. It
must never derive a security-sensitive callback from an untrusted request
`Host`, `Origin`, `Referer` or forwarded header.

Local and future production configuration must be separate. A production
process must fail closed when its exact approved HTTPS origin is absent or when
the configured origin is localhost.

## Current Runtime Gate

Local URL selection resolves the Part 7D design decision but does not make
signup runtime-ready. The following remain blocked:

- dedicated platform callback and onboarding routes;
- CAPTCHA/Supabase Auth environment configuration;
- durable rate-limit migration and adapter;
- production SMTP/email provider and cost policy;
- exact production origin and redirect allowlist;
- public signup enablement.

## Validation Required

- exact local callback and onboarding URLs;
- rejection of external, wildcard, protocol-relative and request-derived URLs;
- production rejection of HTTP and localhost;
- environment isolation;
- unchanged Admin and member-invite callbacks;
- no new route, Auth send or deployment side effect;
- static, typecheck and production build gates.
