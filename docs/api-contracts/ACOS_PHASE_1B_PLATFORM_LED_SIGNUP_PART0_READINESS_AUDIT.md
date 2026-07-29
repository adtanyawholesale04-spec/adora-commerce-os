# Phase 1B Platform-Led Signup Part 0 Readiness Audit

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART0`
**Status:** VALIDATED / OWNER DECISIONS REQUIRED
**Audit Date:** 2026-07-29
**Migration:** Not required for Part 0

## Objective

Determine which existing ACOS sources can support a platform-led account with
no store membership and which decisions must be frozen before any signup write,
schema migration, public profile or community access is implemented.

This audit changes no schema, Auth runtime, RLS policy, entitlement, consent,
customer source or public visibility.

## Required Phase 1B Outcome

A user may create a central private account and complete limited onboarding
without receiving access to any organization's CRM data. Public profile remains
opt-in. Verified review, payout, commission and promoted campaigns remain out of
scope.

## Reusable Repository Dependencies

| Capability | Current evidence | Readiness |
|---|---|---:|
| Authentication | Supabase `auth.users` and server clients | REUSABLE |
| Central private identity projection | `public.profiles` has a unique `auth_user_id` and does not require organization membership | REUSABLE |
| Tenant membership | `organization_memberships` is explicit and optional for a profile | REUSABLE; MUST NOT AUTO-CREATE |
| Tenant customer master | `customers` remains canonical and requires `organization_id` | REUSABLE ONLY AFTER STORE RELATIONSHIP |
| Customer ownership | `customer_profile_links` requires same-tenant membership and customer | REUSABLE ONLY AFTER STORE RELATIONSHIP |
| No-membership isolation | Portal ownership/read contracts and validations return no tenant-private data without active membership/link | REUSABLE / VALIDATED |
| Identity merge policy | Automatic and cross-organization merge are forbidden | REUSABLE / FROZEN |
| Audit infrastructure | `audit_logs` is append-only and tenant-scoped | REUSABLE FOR TENANT EVENTS ONLY |
| Tenant consent | `customer_consents` and immutable consent events are organization/customer scoped | REUSABLE ONLY AFTER STORE RELATIONSHIP |
| Tenant interests | `interest_topics` and `customer_interests` are organization/customer scoped | REUSABLE ONLY AFTER STORE RELATIONSHIP |
| Tenant entitlements | Plans and `organization_entitlements` gate organization features | REUSABLE FOR STORE FEATURES ONLY |
| Empty-state UI foundation | `/portal` already has bilingual no-membership handling | REUSABLE, REQUIRES PHASE 1B UX CONTRACT |

## Gaps And Decisions

| Gap | Repository finding | Part 1 decision required |
|---|---|---|
| Central account lifecycle | `profiles.status` has only `ACTIVE/INACTIVE`; no onboarding lifecycle exists | Define signup completion, retry and abandonment states without overloading profile status |
| Acquisition source | No canonical platform acquisition persistence exists | Define allowed sources, attribution fields, retention and audit behavior |
| Platform-global audit | `audit_logs.organization_id` is mandatory | Decide approved platform audit boundary; do not create a fake organization |
| Platform interests | Existing topics/interests require organization and customer | Decide whether platform interests need a separate global projection or are deferred |
| Terms acceptance | No versioned community/creator terms acceptance source exists | Define terms, version, accepted timestamp, evidence, withdrawal/reacceptance and required action gates |
| Public profile | No separate public-profile projection exists | Freeze private-by-default state, field allowlist, opt-in, moderation and deactivation rules |
| Platform event | `integration_events` is organization-scoped integration infrastructure | Define the canonical `customer_account_created` event boundary and idempotency before reuse or extension |
| Account-to-customer transition | A platform profile may exist without a `customers` row | Define when store join/purchase/booking creates or links the tenant customer; never infer by email/phone |
| Feature eligibility | Current entitlements are organization-scoped | Decide whether signup/onboarding is globally available or controlled by a platform feature flag |
| Abuse controls | No approved signup throttling/verification contract was found | Define verification, rate-limit, duplicate-candidate and suspension behavior |

## Protected Core Position

- Do not create a platform or synthetic organization to satisfy tenant foreign
  keys.
- Do not create a tenant `customers` row, `organization_memberships` row or
  `customer_profile_links` row at platform signup.
- Do not infer or merge identity from email, phone, provider identity or display
  name.
- Do not reuse tenant marketing consent as community terms acceptance.
- Do not put private profile fields into a future public profile.
- Do not reuse organization entitlements as user-level creator eligibility.
- Do not enable verified review, payout, commission, ads or provider messaging.

## Expected Future Impact

Likely modules:

```text
src/app/auth
src/app/portal
src/lib/supabase
src/lib/portal
supabase/migrations (forward-only, after freeze)
supabase/validation
tests
```

Likely protected sources to reuse but not modify destructively:

```text
auth.users
profiles
organizations
organization_memberships
customers
customer_profile_links
audit_logs
organization_entitlements
```

Migration is likely for approved onboarding, acquisition, terms or public
projection persistence, but Part 0 does not authorize its shape or creation.

## Required Validation Gates

1. Signup is idempotent and does not duplicate the authenticated profile.
2. No organization membership, customer row or ownership link is created by
   platform signup.
3. A no-membership account cannot read any tenant-private CRM, order, coupon,
   loyalty, notification or consent row.
4. Acquisition and terms evidence is immutable or audit-backed and contains no
   unnecessary private data.
5. Public profile is absent/private until explicit opt-in and exposes only an
   approved field allowlist.
6. Identity candidates never trigger automatic linking or merge.
7. Cross-tenant, anonymous, authenticated-direct-write and service-boundary
   tests pass.
8. Fresh migration replay, security, workflow, static and build gates pass.

## Gate Result

Phase 1B implementation is **not ready**. Part 1 Owner Decision Freeze is
**ready** and must resolve the gaps above before ER addendum, migration planning
or runtime implementation.
