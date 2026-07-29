# Phase 1B Platform-Led Signup Part 1 Owner Decision Table

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART1`
**Status:** OWNER APPROVED / FROZEN
**Prepared Date:** 2026-07-29
**Owner Approval Date:** 2026-07-29
**Migration:** None authorized

## Objective

Freeze the product and security rules needed to design the Phase 1B contract
and ER addendum. These recommendations do not authorize schema, Auth callback,
signup write, public visibility, messaging or monetization implementation.

## Recommended Decisions

| ID | Decision | Recommended safe value |
|---|---|---|
| D01 | Central account source | Reuse one Supabase `auth.users` identity and one idempotently created `profiles` row |
| D02 | Tenant side effects | Platform signup creates no organization, organization membership, tenant `customers` row or `customer_profile_links` row |
| D03 | Initial privacy | Account is private by default and exposes no anonymous/public customer data |
| D04 | Onboarding lifecycle | Use a separate platform onboarding projection with `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`; derive abandonment by age instead of adding a terminal status |
| D05 | Completion requirements | Require display name, at least one platform interest and current Community Terms acceptance; public-profile intent is optional |
| D06 | Acquisition source | Persist first-touch source once; allow `PLATFORM_DIRECT`, `PLATFORM_CAMPAIGN`, `REFERRAL`; reject unknown source values and store only an approved campaign/referral identifier allowlist |
| D07 | Acquisition immutability | First-touch acquisition is immutable; later touchpoints belong to future append-only events and never rewrite first-touch |
| D08 | Platform audit/event boundary | Use an additive append-only profile-scoped platform account event boundary with event type, profile, request id, sanitized metadata and timestamp; never create a synthetic organization |
| D09 | Account-created event | Emit `customer_account_created` exactly once after profile creation through a server-only idempotent boundary |
| D10 | Platform interests | Create platform-global topic and profile-interest projections; do not reuse organization-scoped `interest_topics/customer_interests` |
| D11 | Interest privacy | Interests remain private onboarding preferences in Phase 1B and are not exposed publicly |
| D12 | Community Terms | Store versioned acceptance with profile, terms type, version, accepted timestamp and evidence request id; append new acceptance for a new version |
| D13 | Terms withdrawal | Withdrawal disables community/public-profile eligibility prospectively; it does not delete acceptance history |
| D14 | Creator terms | Show preview only in Phase 1B; do not require or persist creator/commission acceptance until a later creator action contract |
| D15 | Public profile in Phase 1B | Store only an optional draft and explicit opt-in intent; do not publish anonymously until Phase 3 moderation/report/block gates are approved |
| D16 | Public field allowlist | Draft may contain display name, handle candidate, bio and avatar reference only; never copy email, phone, address, orders, points, coupons, wallet or commission |
| D17 | Store transition | Store join, verified purchase or booking may start a separate tenant customer/link workflow; platform signup alone never does |
| D18 | Identity matching | Email, phone or provider match may create a review candidate only; no automatic link or merge |
| D19 | Availability control | Signup and onboarding use a server-controlled platform feature flag; organization entitlements do not determine account creation |
| D20 | Verification | Require Supabase-confirmed email or phone before onboarding reaches `COMPLETED` |
| D21 | Idempotency | Profile creation, acquisition capture, terms acceptance, onboarding update and account-created event each require a client/request idempotency key |
| D22 | Abuse controls | Apply per-IP and normalized-destination signup throttles, generic duplicate responses, server-side verification and a platform kill switch; exact numeric thresholds remain deployment configuration |
| D23 | Direct access | Browser may call approved guarded server actions only; direct writes to onboarding, acquisition, terms, events, interests or public-profile projections are denied |
| D24 | Phase 1B exclusions | No Verified Review, public feed posting, payout, commission, ads, provider messaging or automatic campaign enrollment |

## Decision Consequences

### Required Persistence Candidates

Part 2 may design additive projections for:

```text
platform_account_onboarding
platform_account_acquisitions
platform_account_events
platform_interest_topics
profile_interests
profile_terms_acceptances
public_profile_drafts
```

Names and columns are candidates only. Part 2 must minimize the schema, map
foreign keys to `profiles`, define RLS/direct-role denial, and determine whether
some candidates can be combined without weakening lifecycle or audit history.

### Event, Audit, Consent, Entitlement And Ledger

| Control | Phase 1B decision |
|---|---|
| Event | Required for account creation and later onboarding milestones |
| Audit | Required for acquisition, terms, public-profile intent and administrative intervention |
| Consent | Community Terms is separate from tenant marketing consent; no marketing consent is inferred |
| Entitlement | Platform feature flag required; tenant entitlements apply only after a tenant relationship exists |
| Ledger | Not required because Phase 1B moves no points, rewards, commission, wallet or money |

## Forbidden Interpretations

- `profiles` must not become a duplicate tenant customer master.
- A platform profile is not a member or customer of every organization.
- A missing organization must not be repaired by creating a platform tenant.
- Community Terms must not be stored as `customer_consents`.
- Platform interests must not be written into a merchant's interest taxonomy.
- Public-profile opt-in intent is not permission to publish before Phase 3.
- Verification success is not evidence of purchase, booking or creator
  eligibility.
- A feature flag is not a substitute for Auth, RLS, guarded writes or audit.

## Owner Approval

The Project Owner approved recommended decisions D01-D24 in full on
2026-07-29. These values are frozen for Phase 1B Part 2 contract and ER design.
Any change requires a new explicit Owner decision record.

## Part 2 Gate

Part 2 Contract & ER Addendum is **READY**. This approval authorizes
contract/schema design only. It does not authorize a migration, Auth callback,
signup write path, public visibility, messaging or monetization runtime.
