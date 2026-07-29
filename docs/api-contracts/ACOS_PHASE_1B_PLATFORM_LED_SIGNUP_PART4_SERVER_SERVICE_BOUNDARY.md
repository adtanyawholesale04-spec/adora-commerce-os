# Phase 1B Platform-Led Signup Part 4 Server Service Boundary

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART4`
**Status:** IMPLEMENTED / VALIDATED
**Depends On:** Owner-frozen D01-D24 and validated Part 3 database boundary
**Date:** 2026-07-29

## Implemented Boundary

`src/lib/platform-signup/service.ts` is a server-only application service over
the six Part 3 service-role RPCs. No route, Server Action, signup page or browser
database client is introduced by Part 4.

The service:

- defaults signup to disabled;
- reads only server environment availability controls;
- fails closed when the kill switch is active;
- requires an injected abuse-control adapter for account bootstrap;
- accepts only opaque SHA-256-style IP and normalized-destination hashes;
- normalizes and bounds display name, handle, bio, interests and references;
- maps database failures to the frozen controlled result catalog;
- never returns raw Supabase/database/provider errors;
- never creates or reads tenant customer data.

## Deployment Controls

```text
ACOS_PLATFORM_SIGNUP_ENABLED=true
ACOS_PLATFORM_SIGNUP_KILL_SWITCH=false
```

Neither variable may use a `NEXT_PUBLIC_` prefix. The signup feature remains
unavailable unless explicitly enabled and supplied with a production-capable
abuse-control adapter.

Numeric throttle thresholds and storage remain deployment concerns. Part 4 does
not introduce an in-memory production throttle or a new persistence source.

## Exclusions

- no Auth signup page or Auth account creation;
- no callback integration;
- no public profile publication;
- no organization, membership, customer or customer-profile link creation;
- no tenant consent, entitlement or interest access;
- no payment, payout, ledger, ads, messaging or media behavior.

## Validation

- server-only and no browser exposure;
- default-disabled and kill-switch behavior;
- fail-closed abuse adapter behavior;
- bounded normalization and opaque hash requirements;
- exact six-RPC mapping;
- controlled error sanitization;
- static tests, lint, typecheck and production build.
