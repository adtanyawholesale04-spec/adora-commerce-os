# Track B Campaign Core Migration Contract Review

**Task:** `ENG-DB-040`
**Status:** APPROVED / IMPLEMENTED
**SQL status:** VALIDATED in local fresh replay
**Track:** Track B - Customer Engagement Platform
**Scope:** Campaign definition and campaign run summary after validated Audience migration 041

## Dependency Baseline

- Audience migration `20260728165559_audience_041.sql` is validated.
- Content Core migration `20260728161057_content_core_035.sql` is validated.
- Consent / Suppression migration `20260728163536_consent_suppression_038.sql` is validated.
- No Messaging or provider migration is included.

## Owner Approval Record

Owner approval recorded 2026-07-29:

- Campaign Core follows Audience 041 and is implemented as migration 042;
- Campaign lifecycle transitions remain guarded service/RPC responsibilities;
- structural checks require an audience snapshot before `PREPARING`, `RUNNING`, or `COMPLETED`;
- consent and suppression are rechecked at dispatch time;
- Messaging jobs, provider calls, and dispatch workers remain out of scope.

## Implemented Scope

```text
marketing_campaigns
campaign_runs
```

Validated boundaries include campaign status/purpose/channel constraints, snapshot references, run counters, tenant-scoped FKs, and updated-at behavior for campaign definitions.

## Security Boundary

- RLS is enabled on both tables.
- Direct privileges are revoked from `public`, `anon`, and `authenticated`.
- Campaign data does not freeze consent or suppression eligibility.
- Run counters are operational summaries and are not provider delivery truth.

## Validation Evidence

Migration `20260728170527_campaign_core_042.sql` was generated with the Supabase CLI and replayed from `001` through current. Catalog validation confirmed RLS, Audience/Content/profile FKs, snapshot gate, lifecycle/timestamp/counter checks, updated-at trigger, and direct-role denial.

**NEXT:** `ENG-DB-041` Messaging Dispatch contract review; Campaign 042 is complete without dispatch implementation.
