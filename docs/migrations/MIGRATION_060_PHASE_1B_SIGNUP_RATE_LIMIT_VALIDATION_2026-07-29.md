# Migration 060 Phase 1B Signup Rate-Limit Validation

**Status:** VALIDATED
**Migration File:** `supabase/migrations/20260729150650_phase_1b_signup_durable_rate_limit_boundary.sql`
**Date:** 2026-07-29

## Evidence

- Supabase local database fresh replay passed from migration `001` through the
  Part 8B migration.
- Focused suite:
  `supabase/validation/phase-1b-signup-rate-limit-boundary-suite.mjs`
- SQL fixture:
  `supabase/validation/046_phase_1b_signup_rate_limit_boundary_test.sql`
- Concurrency fixture: 20 simultaneous connections, limit five, exactly five
  allowed and all 20 attempts counted.

## Validated Cases

- IP, destination, global and key-version isolation;
- malformed/raw identifier rejection;
- bounded window, attempt limit, key version and cleanup batch size;
- atomic creation/increment under concurrency;
- denied attempts continue increasing the counter;
- expired-window cleanup after the 24-hour retention boundary;
- RLS enabled with no policies;
- no direct table access for `anon`, `authenticated` or `service_role`;
- no function execution for `anon` or `authenticated`;
- guarded function execution for `service_role`;
- no cron schedule or production runtime adapter.

No historical migration was edited.
