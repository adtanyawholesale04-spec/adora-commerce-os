# Track B Customer Identity Ownership Boundary Contract Review

**Task:** `PORTAL-P1-IDENTITY-OWNERSHIP-001`  
**Phase:** Phase 1 — Customer Portal MVP  
**Status:** CONTRACT REVIEW / MIGRATION NOT IMPLEMENTED  
**Depends on:** `ACOS_TRACK_B_IDENTITY_MERGE_POLICY.md`

## Objective

Define how an authenticated ACOS profile is linked to the existing tenant-scoped Commerce Core customer row so Customer Portal reads can prove ownership without guessing from email, phone, or browser input.

## Non-Negotiable Boundary

- `public.customers` remains the canonical customer master.
- `public.profiles` remains the canonical authenticated identity projection through `auth_user_id`.
- The ownership link is an association boundary, not a replacement customer table.
- Every association is tenant-scoped by `organization_id` and must pass RLS and ownership validation.
- No browser-supplied `customer_id`, email, phone, or provider identity is authoritative.
- No cross-organization customer-row merge is introduced.

## Recommended Additive Design

Add a forward-only association table only after Owner approval of the implementation contract:

```text
customer_profile_links
- id
- organization_id
- customer_id -> customers
- profile_id -> profiles
- link_status: PENDING / ACTIVE / REVOKED
- link_source: OWNER / VERIFIED_SIGNUP / IMPORT / PROVIDER_LINK
- verification_method
- verified_at
- revoked_at
- created_by / created_at / updated_at
```

Required uniqueness and integrity candidates:

- unique active link per `(organization_id, customer_id)`;
- unique active link per `(organization_id, profile_id)` unless multi-customer-per-profile is explicitly approved;
- composite foreign keys `(organization_id, customer_id)` and `(organization_id, profile_id)`;
- no link across organizations;
- no active link to blocked, archived, or merged customer rows;
- all status changes append audit evidence.

This is a proposed association contract only. It is not a migration instruction.

## Link Creation Rules

| Source | Default behavior | Required proof |
|---|---|---|
| Store-led authenticated signup | Create or reuse one same-organization active link | Authenticated session, verified customer onboarding, organization context |
| Owner-assisted linking | Allowed as a guarded action | `customer.edit` or separately approved permission, reason, step-up confirmation, audit |
| Email/phone match | Candidate only | Never creates a link automatically |
| Provider identity | Candidate or verified external evidence only | Provider-specific verification contract; no direct authority |
| Platform-led account without membership | No customer link | Empty private-store state |
| Cross-organization customer rows | Reject | Separate memberships do not authorize cross-tenant linking |

## Read Authorization

The future Portal read service must:

1. Resolve `auth.uid()` to one active `profiles` row server-side.
2. Resolve the active link for the requested organization from the server-derived profile.
3. Require the organization to be an active customer membership context.
4. Query customer-owned orders, loyalty, coupons, notifications, and consent only through the resolved link and `organization_id`.
5. Return an empty state for no active link; never broaden the query by email/phone.
6. Reject a browser-supplied customer or organization that does not match the resolved context.

Staff `customer.view` access is not a substitute for customer self-ownership and must not be reused for the Portal.

## Merge Interaction

The approved Identity Merge Policy remains in force:

- automatic linking or merging is forbidden;
- same-organization manual merge requires a separate guarded contract;
- merge must define link reassignment before runtime;
- ambiguous or unsupported link reassignment rejects the merge atomically;
- cross-organization links are never reassigned across tenant boundaries.

## Migration / Security / Audit

| Requirement | Decision |
|---|---|
| Migration | Required only if additive link table is approved; no historical migration edits |
| RLS | Required on link table and every Portal read source |
| Permission | Self-read derives from authenticated ownership; staff permissions remain separate |
| Audit | Required for create, verify, revoke, owner-assisted link, and merge-related reassignment |
| Consent | Not a substitute for ownership; marketing dispatch still checks consent/suppression |
| Entitlement | Portal feature gate remains plan/tenant controlled after commercial policy approval |
| Ledger | Not required for the link itself; required if a later workflow moves value |

## Validation Gate Before Migration

1. Auth profile can link only to a same-organization customer.
2. One customer cannot be exposed to another authenticated profile.
3. A profile with no link sees no private customer data.
4. A platform-led profile with no membership sees no tenant-private rows.
5. Cross-tenant link insert/update is rejected by database constraints/RLS.
6. Duplicate active links are rejected deterministically.
7. Revoked/merged/blocked customer links cannot authorize reads.
8. Staff customer reads cannot be accidentally reused as customer self-reads.
9. Link creation/revocation is idempotent and auditable.
10. Fresh replay, security suite, tenant-isolation suite, and Portal ownership suite pass.

## Current Gate

**BLOCKED FOR IMPLEMENTATION.** The additive design is ready for Owner review, but the exact cardinality rule for one profile to one customer per organization, link creation proof, and migration/RLS implementation must be explicitly approved before creating migration or enabling private Portal reads.
