# Phase 1B Platform-Led Signup Part 2 Service Contract

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART2-SERVICE`
**Status:** OWNER APPROVED / FROZEN
**Depends On:** Frozen decisions D01-D24 and Phase 1B ER addendum
**Owner Approval Date:** 2026-07-29
**Migration:** Not authorized

## Boundary

All Phase 1B mutations run in server-only application services using a verified
Supabase user and service-role database boundary. Browser code never receives a
service key and never writes the proposed tables directly.

The account bootstrap transaction creates or reuses only:

```text
profiles
platform_account_onboarding
platform_account_acquisitions
platform_account_events
```

It creates no organization, membership, tenant customer or ownership link.

## Guarded Operations

### bootstrapPlatformAccount

Input is derived from the verified Auth user plus sanitized first-touch data.

```text
require platform signup feature flag
require confirmed Auth email or phone
create/reuse profiles by auth_user_id
capture immutable first-touch acquisition
create/reuse NOT_STARTED onboarding
append CUSTOMER_ACCOUNT_CREATED exactly once
return private onboarding snapshot
```

Retry with the same request id returns the same profile and acquisition result.
A conflicting first-touch retry returns `acquisition_already_captured` without
rewriting history.

### getPlatformOnboardingSnapshot

Returns only:

```text
profile id and display name
onboarding status/timestamps
active platform interest catalog
selected interest ids
current Community Terms version and acceptance state
private public-profile draft
store_membership_count
```

`store_membership_count` may be zero. The response includes no tenant customer,
CRM, order, coupon, loyalty, notification, consent or campaign-private data.

### updatePlatformInterests

- accepts a bounded unique list of active topic IDs;
- replaces current selected state atomically;
- requires at least one selected topic for onboarding completion;
- appends one sanitized `PLATFORM_INTERESTS_UPDATED` event;
- never writes tenant `customer_interests`.

### recordCommunityTermsDecision

- accepts only the current active Community Terms version;
- appends `ACCEPTED` or `WITHDRAWN`;
- never updates/deletes prior terms events;
- withdrawal immediately makes completion/public-profile eligibility false;
- never creates tenant marketing consent.

### updatePublicProfileDraft

- accepts display name, handle candidate, bio and opt-in intent only;
- normalizes handle server-side and returns a generic conflict;
- remains private regardless of opt-in intent;
- appends `PUBLIC_PROFILE_INTENT_UPDATED` when intent changes;
- accepts no avatar until the media contract is approved.

### completePlatformOnboarding

Atomically rechecks:

```text
active profile
confirmed Auth email or phone
non-empty profile display name
at least one selected active platform interest
current Community Terms accepted and not withdrawn
platform feature flag enabled
```

On success it sets `COMPLETED` once and appends
`ONBOARDING_COMPLETED`. Public-profile intent does not affect completion.

## Controlled Results

```text
account_ready
onboarding_in_progress
onboarding_completed
feature_disabled
auth_contact_not_verified
acquisition_already_captured
invalid_acquisition_source
invalid_interest_selection
current_terms_not_accepted
terms_version_not_current
public_handle_unavailable
rate_limited
request_conflict
persistence_error
```

Errors returned to the browser contain no existence oracle, raw destination,
provider error, database error, referral secret or cross-tenant identifier.

## Idempotency And Failure

- Each mutation requires a UUID request id.
- The same request and same normalized payload reuses its result.
- The same request with a different normalized payload returns
  `request_conflict`.
- Auth account creation may precede persistence; a callback retry repairs only
  missing profile/onboarding/event rows.
- No failure path creates a tenant relationship.
- Events and terms history are append-only and never rolled back by a later UI
  failure.

## Abuse And Availability

The application boundary enforces:

```text
server-controlled feature flag
per-IP throttle
normalized-destination throttle
generic duplicate-account response
verified Auth contact requirement
platform kill switch
bounded text/list payloads
```

Numeric thresholds remain deployment configuration and are not stored in the
ER contract.

## Event, Audit, Consent, Entitlement And Ledger

| Control | Required behavior |
|---|---|
| Event/audit | Append profile-scoped events for account creation and guarded milestones |
| Consent | Community Terms remains separate from tenant marketing consent |
| Entitlement | Platform feature flag gates signup; tenant entitlements are not read |
| Ledger | None; reject any value movement |
| Moderation | Public publication remains unavailable until Phase 3 |

## Validation Contract

1. New and retried bootstrap produce one Auth-linked profile.
2. Bootstrap produces no organization, membership, tenant customer or ownership
   link.
3. No-membership snapshot contains no tenant-private rows.
4. First-touch acquisition is immutable and sanitized.
5. Interests never cross into merchant taxonomy.
6. Terms acceptance/withdrawal history is append-only and version-correct.
7. Draft remains private and passes the field allowlist.
8. Completion fails closed when any prerequisite is missing.
9. Direct `anon`/`authenticated` table writes and function execution are denied.
10. Cross-profile access, request replay conflict and feature-kill-switch cases
    pass.

## Owner Approval

The Project Owner approved this service contract in full on 2026-07-29.
Operations, controlled results, idempotency, failure, abuse, privacy and
validation behavior are frozen for Part 3.

This approval does not itself authorize migration SQL, server implementation or
signup UI. Part 3 requires a separate explicit execution instruction.
