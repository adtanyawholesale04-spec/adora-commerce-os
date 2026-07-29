# ER Addendum Phase 1B Platform-Led Signup

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART2-ER`
**Status:** OWNER APPROVED / FROZEN FOR MIGRATION PLANNING
**Depends On:** Frozen decisions D01-D24
**Owner Approval Date:** 2026-07-29
**Migration:** Not authorized

## Scope

Define the minimum additive persistence needed for a private platform-led
account with no organization membership. This addendum does not alter
`auth.users`, `profiles`, `organizations`, `customers`,
`organization_memberships` or `customer_profile_links`.

These entities are platform/profile-owned, not merchant tenant-owned. They must
not receive a synthetic `organization_id`.

## Relationship Map

```text
auth.users
  -> profiles
       -> platform_account_onboarding
       -> platform_account_acquisitions
       -> platform_account_events
       -> profile_platform_interests -> platform_interest_topics
       -> profile_terms_events -> platform_terms_versions
       -> public_profile_drafts
```

No relationship from this graph to a tenant customer or membership is created
by Phase 1B.

## Status Catalog

```text
onboarding_status:
  NOT_STARTED
  IN_PROGRESS
  COMPLETED

acquisition_source:
  PLATFORM_DIRECT
  PLATFORM_CAMPAIGN
  REFERRAL

terms_type:
  COMMUNITY

terms_version_status:
  DRAFT
  ACTIVE
  RETIRED

terms_event_type:
  ACCEPTED
  WITHDRAWN
```

Abandonment is derived from an incomplete row's age. It is not persisted as a
new lifecycle status.

## Proposed Entities

### platform_account_onboarding

One mutable current-state projection per profile.

| Column | Rule |
|---|---|
| profile_id | PK/FK `profiles`; one onboarding state per account |
| status | constrained onboarding status; default `NOT_STARTED` |
| public_profile_opt_in_intent | boolean, default false; never grants public visibility |
| started_at | required for `IN_PROGRESS` or `COMPLETED` |
| completed_at | required only for `COMPLETED` |
| updated_at | managed timestamp |

Completion is guarded and requires an active profile, verified Auth contact,
non-empty `profiles.display_name`, at least one selected platform interest and
current Community Terms acceptance.

### platform_account_acquisitions

One immutable first-touch row per profile.

| Column | Rule |
|---|---|
| profile_id | PK/FK `profiles` |
| source | constrained acquisition source |
| campaign_reference | nullable sanitized opaque reference; allowed only for `PLATFORM_CAMPAIGN` |
| referral_reference | nullable sanitized opaque reference; allowed only for `REFERRAL` |
| request_id | required unique idempotency evidence |
| captured_at | immutable timestamp |

No arbitrary UTM JSON, URL, email, phone or provider payload is stored.

### platform_account_events

Append-only profile-scoped event/audit evidence.

| Column | Rule |
|---|---|
| id | UUID PK |
| profile_id | FK `profiles` |
| event_type | constrained service-owned event catalog |
| request_id | required |
| metadata_json | sanitized allowlisted metadata only |
| occurred_at | immutable timestamp |

Initial event catalog:

```text
CUSTOMER_ACCOUNT_CREATED
ONBOARDING_STARTED
ONBOARDING_COMPLETED
ACQUISITION_CAPTURED
PLATFORM_INTERESTS_UPDATED
COMMUNITY_TERMS_ACCEPTED
COMMUNITY_TERMS_WITHDRAWN
PUBLIC_PROFILE_INTENT_UPDATED
```

Enforce one `CUSTOMER_ACCOUNT_CREATED` per profile and idempotency per
`(profile_id, event_type, request_id)`.

### platform_interest_topics

Platform-global taxonomy, separate from merchant `interest_topics`.

| Column | Rule |
|---|---|
| id | UUID PK |
| slug | globally unique normalized slug |
| name | non-empty display name |
| description | nullable |
| status | `ACTIVE` or `INACTIVE` |
| sort_order | non-negative integer |
| created_at / updated_at | managed timestamps |

Only active topics may be newly selected. Topic administration is deferred to a
separate platform-admin contract.

### profile_platform_interests

Private current preference projection.

| Column | Rule |
|---|---|
| profile_id | FK `profiles` |
| interest_topic_id | FK `platform_interest_topics` |
| selected | boolean |
| selected_at | required when selected |
| deselected_at | required when not selected |
| updated_at | managed timestamp |

Primary key is `(profile_id, interest_topic_id)`. Rows are retained when
deselected so the current projection remains deterministic; the account event
records each guarded update.

### platform_terms_versions

Version catalog for platform terms.

| Column | Rule |
|---|---|
| id | UUID PK |
| terms_type | `COMMUNITY` in Phase 1B |
| version | non-empty immutable version |
| status | `DRAFT`, `ACTIVE`, `RETIRED` |
| document_uri | approved internal/public document reference |
| content_hash | immutable evidence hash |
| effective_at | required for `ACTIVE` |
| created_at | immutable timestamp |

Only one active version per terms type is allowed. Creator/commission terms are
not persisted in Phase 1B.

### profile_terms_events

Append-only acceptance/withdrawal history.

| Column | Rule |
|---|---|
| id | UUID PK |
| profile_id | FK `profiles` |
| terms_version_id | FK `platform_terms_versions` |
| event_type | `ACCEPTED` or `WITHDRAWN` |
| request_id | required idempotency evidence |
| evidence_json | sanitized request context; no raw destination |
| occurred_at | immutable timestamp |

Current acceptance is the latest event for the current active terms version.
Withdrawal never deletes or rewrites acceptance history.

### public_profile_drafts

Private draft only; no anonymous/public policy is permitted in Phase 1B.

| Column | Rule |
|---|---|
| profile_id | PK/FK `profiles` |
| display_name | non-empty draft display name |
| handle_candidate | nullable normalized candidate; not a published handle |
| bio | nullable length-limited text |
| opt_in_intent | boolean, default false |
| updated_at | managed timestamp |

Email, phone, address, orders, points, coupons, wallet and commission columns are
forbidden. Avatar persistence is deferred until the platform media provider and
asset ownership contract are frozen.

## Access And Integrity

- Enable RLS on every proposed table.
- Revoke table access from `PUBLIC`, `anon` and `authenticated`.
- Permit writes only through reviewed service-role functions called by
  server-only application services.
- Self-read also goes through a minimized server boundary; no browser table
  reads are required.
- Append-only triggers protect account events and terms events.
- No FK to `organizations`, `customers`, tenant interests, tenant consent or
  tenant entitlements is allowed.
- No delete cascade may erase acquisition, account-event or terms history.

## Index Direction

```text
platform_account_events(profile_id, occurred_at desc)
platform_account_events(profile_id, event_type, request_id) unique
platform_interest_topics(status, sort_order)
profile_platform_interests(profile_id, selected)
profile_terms_events(profile_id, occurred_at desc)
platform_terms_versions(terms_type, version) unique
platform_terms_versions(terms_type) unique where status = ACTIVE
public_profile_drafts(handle_candidate) unique where handle_candidate is not null
```

## Owner Approval

The Project Owner approved this ER addendum in full on 2026-07-29. Its entity
boundaries, status catalog, relationships, privacy rules, RLS direction and
deferred avatar/public behavior are frozen for Phase 1B Part 3.

Part 3 migration drafting is **READY**, but no migration is authorized until the
Owner explicitly instructs the project to proceed with Part 3.
