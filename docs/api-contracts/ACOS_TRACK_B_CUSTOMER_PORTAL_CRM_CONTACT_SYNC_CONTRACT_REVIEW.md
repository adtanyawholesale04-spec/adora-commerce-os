# Track B Customer Portal CRM Contact Synchronization Contract Review

**Task ID:** `PORTAL-P1-PART5-CRM-CONTACT-SYNC-REVIEW`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-07-29

## Objective

Define the guarded cross-module contract that may synchronize a verified Customer Portal contact change from the Auth boundary into the canonical tenant-owned `public.customers` row. This review does not enable the write.

## Task Envelope

```text
PROJECT: ADORA Commerce OS
TRACK: B - Customer Engagement
MODULE: Customer Portal / Customer Master integration
PHASE: Customer Portal P1 Part 5
TASK ID: PORTAL-P1-PART5-CRM-CONTACT-SYNC-REVIEW

ALLOWED SOURCES:
- customer_contact_change_requests
- customer_profile_links
- profiles.auth_user_id
- customers.email / customers.email_normalized
- customers.phone / customers.phone_normalized
- audit_logs

FORBIDDEN:
- browser or authenticated direct table write
- cross-organization synchronization
- automatic customer merge
- consent or suppression migration
- customer identity row creation by inference
- order, payment, fulfillment, loyalty, or historical record rewrite
```

## Source Ownership

- `auth.users.email` and `auth.users.phone` are authentication destinations.
- `public.customers.email` and `public.customers.phone` are tenant CRM contact fields and remain the canonical customer-master values for that organization.
- `customer_profile_links` proves the approved same-tenant relationship; it does not make Auth and CRM contact values equivalent.
- One authenticated profile may belong to multiple organizations. A contact change in Organization A must never update Organization B's customer row.

## Recommended Guarded Flow

```text
verified contact request
  -> Auth Admin apply completes
  -> explicit CRM sync request for the same organization/customer
  -> lock request and customer row
  -> recheck active customer/profile link
  -> evaluate CRM conflict policy
  -> update raw + normalized CRM fields atomically
  -> append sanitized audit evidence
```

The existing request status `APPLIED` means Auth Admin apply completed. CRM synchronization must not reinterpret or extend that lifecycle. Successful CRM sync should be represented by an append-only audit action linked to the request, unless Owner approves a new schema lifecycle separately.

## Owner Decision Table

| Decision | Recommended safe value | Why |
|---|---|---|
| Trigger | Explicit server-only sync after request is `APPLIED`; no database trigger | Keeps Auth and Customer Master ownership separate |
| Tenant scope | Update only the request's `organization_id` + `customer_id` resolved through the active link | Prevents cross-store propagation |
| Existing non-empty CRM value | Do not overwrite automatically; return `crm_contact_conflict` for support resolution | Merchant CRM data may have a different operational owner |
| Empty CRM value | Allow guarded fill from the verified Auth value | Lowest-risk useful synchronization |
| Same normalized value | Return idempotent success without rewriting | Safe retry behavior |
| Duplicate value on another customer | Block automatic sync and require same-organization identity/merge review | Avoids silently joining customer identities |
| Raw/normalized fields | Update the selected pair atomically (`email` + `email_normalized` or `phone` + `phone_normalized`) | Prevents search and display drift |
| Customer lifecycle | Allow only target customer status `ACTIVE`; block `MERGED`, `BLOCKED`, and `ARCHIVED` | Avoids mutating inactive identity records |
| Consent | Do not copy, grant, revoke, or retarget consent automatically | Consent is destination- and purpose-specific |
| Suppression | Do not clear or migrate suppression automatically | A verified identity change is not permission to send |
| Customer identities | Do not create or rewrite `customer_identities` from email/phone inference | Provider identities require their own verified contract |
| Audit privacy | Store request/customer/contact type, result, actor type, and request ID; never store the raw contact value | Minimizes PII exposure |
| Permission boundary | Service-role-only application boundary; no browser, authenticated RPC, or staff direct table write | Protects private canonical data |
| Failure policy | Leave Auth apply intact, keep CRM sync retryable, and record sanitized failure audit | Cross-system rollback is unsafe |

## Owner Approval

The Project Owner approved every recommended safe value on 2026-07-29. The
frozen decision record is:

```text
docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_CRM_CONTACT_SYNC_OWNER_DECISION_FREEZE.md
```

Implementation must follow that record without widening scope.

## Proposed Service Contract After Approval

```text
applyVerifiedCustomerContactToCrm(
  organizationId,
  contactChangeRequestId,
  clientRequestId
)

success:
  synced
  already_synced
  already_matching

controlled failure:
  contact_request_not_applied
  customer_link_not_active
  customer_not_active
  crm_contact_conflict
  crm_duplicate_contact_conflict
  tenant_scope_denied
  persistence_error
```

The database write should be one service-role-only RPC so the customer update and audit append are atomic. It must revoke execute from `public`, `anon`, and `authenticated`. No new permission, role, status, table, or column is approved by this review.

## Validation Required After Owner Freeze

- empty CRM field receives only the verified value;
- existing different CRM value is denied without mutation;
- same normalized value is idempotent;
- another same-tenant customer with the normalized value causes a controlled conflict;
- cross-tenant request/customer combinations are denied;
- inactive, merged, blocked, and archived customers are denied;
- raw and normalized fields change atomically;
- consent, suppression, customer identity, order, payment, and fulfillment records remain unchanged;
- direct `anon` and `authenticated` execution is denied;
- audit contains no raw email or phone;
- fresh migration replay, security suite, workflow suite, lint, typecheck, and static tests pass.

## Current Gate

Part 1 Owner Decision Freeze is complete. Part 2 guarded database boundary is
`IMPLEMENTED / VALIDATED`. The approval document itself did not enable a CRM
contact write; Migration 059 provides the separately validated boundary.
