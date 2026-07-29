# Track B Customer Portal CRM Contact Sync Owner Decision Freeze

**Task ID:** `PORTAL-P1-PART5-CRM-CONTACT-SYNC-OWNER-FREEZE`
**Status:** OWNER APPROVED / FROZEN
**Part 2 Status:** IMPLEMENTED / VALIDATED
**Owner Approval Date:** 2026-07-29

## Approval

The Project Owner approved every recommended safe value in
`ACOS_TRACK_B_CUSTOMER_PORTAL_CRM_CONTACT_SYNC_CONTRACT_REVIEW.md`.

This freeze authorizes contract-led implementation planning. It does not itself
enable a database write, create a migration, or authorize direct client access
to canonical customer contact data.

## Frozen Decision Table

| Decision | Frozen Value |
|---|---|
| Trigger | Explicit server-only sync after the contact request is `APPLIED`; no database trigger |
| Tenant scope | Update only the request organization/customer resolved through the active same-tenant link |
| Existing non-empty CRM value | Never overwrite automatically; return `crm_contact_conflict` |
| Empty CRM value | Allow guarded fill from the verified Auth value |
| Same normalized value | Return idempotent success without rewriting |
| Duplicate value on another customer | Block and require same-organization identity/merge review |
| Raw/normalized fields | Update the selected raw and normalized pair atomically |
| Customer lifecycle | Allow only `ACTIVE`; deny `MERGED`, `BLOCKED`, and `ARCHIVED` |
| Consent | Do not copy, grant, revoke, or retarget consent |
| Suppression | Do not clear or migrate suppression |
| Customer identities | Do not create or rewrite identity rows from contact inference |
| Audit privacy | Record identifiers, contact type, result, actor type and request id; never raw contact values |
| Permission boundary | Service-role-only application; deny browser, `anon`, `authenticated`, and staff direct writes |
| Failure policy | Keep Auth apply intact, keep CRM sync retryable, and append sanitized failure audit |

## Implementation Gate

Part 2 implemented one atomic service-role-only database boundary that follows
this table. Any change to these values requires a new Owner decision before
implementation.

The implementation must not:

- extend or reinterpret the existing `APPLIED` request lifecycle;
- add customer, identity, consent, suppression, order, or payment sources;
- infer cross-tenant identity;
- expose raw contact values in logs, audit payloads, errors, or tests;
- edit a frozen migration.

## Required Part 2 Evidence

- migration created through the repository migration workflow;
- `PUBLIC`, `anon`, and `authenticated` execution denied;
- active link and tenant relationship rechecked inside the transaction;
- empty, matching, conflicting, duplicate, inactive and cross-tenant cases tested;
- raw and normalized fields proven atomic;
- consent, suppression and identity records proven unchanged;
- sanitized audit and idempotent retry proven;
- fresh replay, security, workflow and static gates passed.
