# Phase 1B Platform-Led Signup Part 8 Implementation Plan

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8`
**Status:** OWNER APPROVED / FROZEN
**Runtime:** Disabled
**Public Signup:** Disabled
**Approval Date:** 2026-07-29
**Migration:** Planned in Part 8B; separately gated

## Objective

Implement the frozen Phase 1B platform-signup boundary locally without
prematurely enabling production delivery, public signup, paid usage or
unreviewed database access.

Part 8 is divided into independently validated parts. Completion of one part
does not authorize a later part.

## Frozen Inputs

| Input | Frozen decision |
|---|---|
| Account model | Central private profile; no organization/customer side effect |
| Auth | Supabase email/password with confirmed email |
| CAPTCHA | Cloudflare Turnstile; Supabase Auth validates the token once |
| Email | Local Mailpit; future Resend Custom SMTP Free, approved spend USD 0 |
| Durable limiter | Existing Supabase Postgres with peppered HMAC bucket keys |
| Local origin | `http://localhost:3000` |
| Callback | `/auth/platform/callback` |
| Onboarding | `/onboarding` |
| Production origin | Deferred until an approved deployment |

## Part 8A: Local Configuration Readiness

**Purpose:** Audit and prepare the local-only configuration contract before any
runtime route is created.

Expected work:

- reconcile Supabase CLI Auth, Mailpit and CAPTCHA capabilities against the
  installed CLI/config format;
- define environment variable names and validation without committing secrets;
- define safe local test-key handling;
- verify the fixed localhost callback and onboarding URLs;
- add a readiness report and configuration tests.

Forbidden:

- production credential reuse;
- Resend account/configuration;
- public route or email delivery;
- migration.

**Gate:** static validation and local Supabase capability evidence.

## Part 8B: Durable Rate-Limit Database Boundary

**Purpose:** Add the approved atomic shared limiter.

Expected work:

- forward-only migration for private rate-limit buckets and guarded consume
  function;
- HMAC digest/key-version inputs only;
- service-role-only execution, RLS defense in depth and direct-role denial;
- bounded expiry/cleanup contract;
- concurrency, expiry, retention and fresh-replay validation.

This is a protected migration and requires separate explicit Owner approval
after the migration plan is reviewed.

Forbidden:

- raw IP/email persistence;
- plain hashes;
- browser/database direct access;
- editing a frozen migration.

## Part 8C: Server Provider Adapters

**Purpose:** Implement the provider-neutral ports behind server-only adapters.

Expected work:

- durable limiter adapter;
- HMAC derivation with server-only pepper;
- signed HTTP-only callback-state codec;
- canonical local-origin validator;
- Supabase Auth signup/session gateways;
- Part 4 bootstrap adapter;
- controlled error mapping and kill-switch checks.

No provider secret may enter browser code. Turnstile validation remains owned
once by Supabase Auth.

**Gate:** unit, privacy, failure and server-only import tests.

## Part 8D: Local Signup, Callback And Onboarding Skeleton

**Purpose:** Add the minimum local user flow while keeping production disabled.

Expected work:

- local signup UI and guarded server action;
- dedicated `/auth/platform/callback` route;
- private `/onboarding` skeleton using the canonical platform projections;
- fixed same-origin redirects;
- local-only feature enablement with production fail-closed behavior.

This part must not create customer, organization membership, payment, payout,
marketing consent or public-profile publication.

**Gate:** permission/privacy review, callback isolation and Admin/member-invite
regression.

## Part 8E: Local End-To-End Validation

**Purpose:** Prove the full local flow before any online deployment.

Required scenarios:

- CAPTCHA test success/failure and single validation ownership;
- Mailpit confirmation capture;
- PKCE callback and confirmed-email enforcement;
- atomic IP/destination/global limiter behavior;
- callback retry after partial persistence failure;
- idempotent profile/onboarding/event creation;
- no tenant/customer/consent side effects;
- logout/login and onboarding resume;
- fresh migration replay, security, workflow, lint, typecheck and build gates.

Passing local E2E does not authorize production.

## Part 8F: Production Readiness Gate

**Purpose:** Review external configuration only when an online deployment is
requested.

Required Owner inputs:

- exact canonical HTTPS application origin;
- approved Resend account, sending domain and sender address;
- DNS verification evidence;
- production Turnstile widget/hostname;
- production Supabase Auth Site URL and exact redirect allowlist;
- provider quota review and confirmed USD 0 cost posture;
- secret destination and rotation plan.

Production rollout remains blocked until every item is validated. Vercel
preview must use isolated test credentials and must not receive production
secrets by default.

## Execution Order

```text
8A Local Configuration Readiness
-> Owner approval for protected migration
-> 8B Durable Rate-Limit Database Boundary
-> 8C Server Provider Adapters
-> 8D Local Signup/Callback/Onboarding Skeleton
-> 8E Local End-To-End Validation
-> explicit deployment request
-> 8F Production Readiness Gate
```

## Global Stop Conditions

Stop and report `BLOCKED` when:

- installed Supabase behavior conflicts with the frozen contract;
- a required secret, domain or provider account is absent;
- a schema decision conflicts with Frozen ER/migration status;
- a route would weaken Admin/member-invite Auth behavior;
- any browser path could access service credentials or private projections;
- any implementation could create unapproved spend;
- production enablement would rely on wildcard or guessed URLs.

## Acceptance

Part 8 planning is complete when:

- Parts 8A-8F have explicit scope and order;
- protected operations remain separately gated;
- local-first implementation cannot silently become production-enabled;
- all Part 7 decisions remain represented;
- implementation status points to Part 8A;
- static project validation passes.
