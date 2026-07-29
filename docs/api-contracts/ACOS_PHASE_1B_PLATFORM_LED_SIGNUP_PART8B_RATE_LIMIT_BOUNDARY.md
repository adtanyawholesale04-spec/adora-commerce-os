# Phase 1B Platform-Led Signup Part 8B Durable Rate-Limit Boundary

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8B`
**Status:** IMPLEMENTED / VALIDATED
**Owner Approval Date:** 2026-07-29
**Migration:** `20260729150650_phase_1b_signup_durable_rate_limit_boundary.sql`
**Runtime Adapter:** Deferred to Part 8C

## Implemented Boundary

Part 8B adds one platform-private operational bucket table and two guarded
service-role functions:

```text
platform_signup_rate_limit_buckets
api_consume_platform_signup_rate_limit
api_cleanup_platform_signup_rate_limits
```

The boundary runs before organization membership exists and deliberately has no
`organization_id`. It does not create or modify profiles, customers,
memberships, consent, entitlement, audit, payment or usage-ledger records.

## Stored Data

| Field | Rule |
|---|---|
| `scope` | `IP`, `DESTINATION` or `GLOBAL` |
| `identity_digest` | Exactly 64 lowercase hexadecimal HMAC characters |
| `key_version` | Positive bounded pepper-rotation version |
| window timestamps | Database-generated window and expiry state |
| `attempt_count` | Includes allowed and denied attempts |

Raw IP, email, phone, CAPTCHA token and unkeyed/plain hashes are forbidden. HMAC
derivation remains a server-adapter responsibility in Part 8C; the database
rejects malformed digests.

## Atomic Consume

The consume function:

- requires `service_role` claim and execute grant;
- validates scope, digest, key version, window and limit bounds;
- uses database `clock_timestamp()`;
- takes a transaction advisory lock on scope/version/digest;
- creates, increments or resets one bucket atomically;
- counts denied attempts;
- returns only `allowed`, `remaining` and `reset_at`;
- fails closed on invalid input or unavailable database.

Concurrent validation uses 20 independent database connections against a limit
of five and proves exactly five allowed results with an attempt count of 20.

## Cleanup And Retention

`expires_at` is constrained to exactly 24 hours after the window ends. The
guarded cleanup function deletes expired rows in bounded batches of 1-5,000
using `FOR UPDATE SKIP LOCKED`.

No cron schedule is created. Cleanup scheduling remains a later operational
decision.

## Access Control

- RLS is enabled as defense in depth.
- No policies are created.
- `public`, `anon`, `authenticated` and `service_role` receive no direct table
  privileges.
- Only `service_role` may execute the guarded functions.
- Both functions use `SECURITY DEFINER` with empty `search_path` and
  schema-qualified object references.

## Validation Evidence

- fresh local replay from migration `001` through Part 8B passed;
- focused SQL lifecycle/expiry/access test passed;
- 20-connection concurrency gate passed;
- database lint, security and workflow gates are required;
- static lint, typecheck, tests and build are required;
- no historical migration was edited.
