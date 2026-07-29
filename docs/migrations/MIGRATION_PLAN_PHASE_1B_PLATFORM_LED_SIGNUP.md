# Migration Plan Phase 1B Platform-Led Signup

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART2-MIGRATION-PLAN`
**Status:** IMPLEMENTED / VALIDATED
**Owner Approval Date:** 2026-07-29
**SQL Generated:** Yes

## Implemented Migrations

- `20260729133840_phase_1b_platform_signup_schema.sql`
- `20260729133843_phase_1b_platform_signup_guarded_functions.sql`

Both migrations were generated with the Supabase CLI and replayed successfully
from migration `001` through latest on 2026-07-29.

## Preconditions

- Decisions D01-D24 remain frozen.
- Phase 1B ER addendum and service contract receive explicit Owner approval.
- Latest repository migration number is rechecked immediately before drafting.
- Supabase CLI migration creation workflow is used.

## Proposed Forward-Only Sequence

One migration should create the approved profile-owned projections, constraints,
indexes, append-only triggers, RLS enablement and direct-role revocations.

A second migration should add only the reviewed service-role guarded functions.
Splitting schema and functions keeps replay evidence and security review clear.

No historical migration may be edited.

## Explicit Non-Goals

- no Auth trigger;
- no organization/customer/membership/link creation;
- no public profile read policy;
- no tenant consent or interest mutation;
- no creator, commission, payout, ads or messaging schema;
- no avatar/media persistence;
- no automatic identity match or merge.

## Required Validation

```text
fresh 001 -> latest replay
schema constraints and append-only tests
profile ownership and cross-profile denial
no-membership tenant isolation
service-role function exposure audit
anon/authenticated direct-role denial
idempotency and request-conflict fixtures
feature flag / kill switch behavior
static tests, lint, typecheck and build
```

Part 3 is implemented and validated. Feature flags, kill switch and abuse
throttles remain server/deployment controls as frozen in the Part 2 contract.
