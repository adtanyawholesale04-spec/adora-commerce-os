# Phase 1B Platform-Led Signup Part 7C Durable Rate Limit Selection

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART7C`
**Status:** OWNER APPROVED / FROZEN
**Store:** Existing Supabase Postgres
**Approval Date:** 2026-07-29
**Migration:** Required later; not authorized by this selection

## Selection

The existing Supabase Postgres project is the approved durable shared store for
platform-signup rate limiting. This avoids a new provider, account and cost
boundary while allowing all application instances to enforce the same limits.

This approval freezes the storage and privacy design only. It does not create a
table, function, scheduled cleanup job or public signup route.

## Privacy Boundary

- Never persist a raw IP address, email address, phone number or CAPTCHA token.
- Never use an unkeyed or plain hash for rate-limit identities.
- Derive bucket keys with HMAC-SHA256 and a server-only secret pepper.
- Keep the pepper in `ACOS_SIGNUP_ABUSE_HASH_SECRET`; never expose it through a
  `NEXT_PUBLIC_` variable, database row, log, audit payload or browser response.
- Include a key-version value so a controlled pepper rotation can invalidate or
  age out old buckets without recovering source identifiers.
- Normalize the destination before HMAC derivation using the frozen Part 2
  normalization rules.

The planned rows are operational abuse-control state, not customer identity,
consent, entitlement, audit or usage-ledger records.

## Planned Durable Boundary

The later forward-only migration must add a platform-private, service-role-only
bucket store and a guarded atomic consume operation. Exact schema and function
names remain migration-plan decisions.

Each bucket must be scoped to one of these dimensions:

| Scope | Purpose |
|---|---|
| `IP` | Bound repeated attempts from one network source |
| `DESTINATION` | Bound repeated attempts toward one normalized email address |
| `GLOBAL` | Provide a deployment-level circuit breaker during broad abuse |

The durable operation must:

1. accept only the HMAC digest, key version, scope, window and configured limit;
2. atomically create/increment the matching bucket and return allow/deny;
3. count denied attempts so repeated abuse cannot reset pressure;
4. use database time for window evaluation;
5. fail closed on unavailable storage, invalid input or ambiguous state;
6. expose no browser, `anon` or `authenticated` table/function access;
7. remain separate from Supabase Auth CAPTCHA validation.

Concurrent requests across application instances must not exceed the configured
limit because of read-then-write races.

## Threshold And Retention Policy

Part 7C does not freeze numeric limits. Per Part 2 decision D22, limits and
windows remain bounded server deployment configuration and require validation
before rollout.

- Expired bucket rows must be retained for no longer than 24 hours after their
  window ends.
- A later cleanup mechanism may use a guarded worker or scheduled database job.
- Cleanup implementation and scheduling require separate approval.
- No permanent per-attempt audit record is permitted.
- Aggregate operational metrics may contain scope, allow/deny outcome and
  coarse counts, but never a digest or source identifier.

## Authorization And Isolation

The later implementation must:

- enable RLS on the bucket table;
- revoke all direct access from `public`, `anon` and `authenticated`;
- grant execution only to the approved server role;
- use an explicit safe `search_path` for any `SECURITY DEFINER` function;
- avoid `organization_id`, membership creation and tenant side effects because
  this boundary runs before organization membership exists.

## Failure Contract

Rate-limit denial and internal limiter failure both map to the existing
controlled application result `rate_limited`. Raw database details, digests,
limits and counters must not reach the browser.

## Validation Required Before Runtime

- atomic concurrent consumption at and beyond the limit;
- shared enforcement across separate service instances;
- IP, destination and global scope isolation;
- window expiry and database-time behavior;
- denied-attempt accounting;
- HMAC key-version rotation;
- no raw or reversibly encoded identifiers in rows, logs or errors;
- fail-closed database outage behavior;
- RLS, grants and direct-role denial;
- cleanup and 24-hour post-window retention;
- CAPTCHA, Admin Auth and member-invite regression;
- fresh migration replay, security, workflow, static, typecheck and build gates.
