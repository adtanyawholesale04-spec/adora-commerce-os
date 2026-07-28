# Track B Customer Portal P1 Contract Review

**Task:** `PORTAL-P1-CONTRACT-001`  
**Phase:** Phase 1 — Customer Portal MVP  
**Status:** READ BOUNDARY IMPLEMENTED / UI AND WRITE ACTIONS DEFERRED
**Depends on:** `ACOS_TRACK_B_PHASE_0_FOUNDATION_ALIGNMENT_CONTRACT.md`

## Objective

Define a read-first Customer Portal boundary where an authenticated customer can see only their own account, memberships, eligible tenant-scoped commerce history, consent state, and in-app notifications. The read-only service boundary is implemented separately; routes and write actions remain deferred.

## Source-of-Truth Mapping

| Portal surface | Existing source | Read rule | Write status |
|---|---|---|---|
| Account/profile | Auth session plus existing `profiles` identity boundary | Current authenticated profile only | Profile edit requires separate guarded contract |
| Store membership | `organization_memberships` plus customer membership relation | Only active memberships owned by current identity | No browser write |
| Orders/receipts | Commerce Core `customers`, `orders`, order items, and payment read contract | Current customer and organization scope only | Read-only in this task |
| Coupons | Existing tenant-scoped coupon/customer benefit source | Only benefits addressed to current customer | Claim/redeem deferred to guarded action |
| Points | Existing loyalty account and append-only transaction/ledger source | Current customer and organization scope only | No balance mutation |
| In-app notifications | Existing notification recipient boundary | Recipient identity must match current profile/customer | Read/mark-read needs separate action contract |
| Consent | Existing `customer_consents` / suppression boundary | Current customer, organization, purpose, and channel only | Consent update requires guarded consent contract |

No new customer, order, payment, wallet, or loyalty source of truth is permitted.

## Identity and Tenant Boundary

1. Resolve the authenticated Supabase identity server-side.
2. Resolve the canonical profile/customer link without accepting a browser-supplied customer or organization as authority.
3. Derive visible organizations only from active customer membership.
4. Apply `organization_id` and current-customer ownership predicates to every tenant-scoped read.
5. A platform-led account with no store membership receives an empty state and no store-private rows.
6. Cross-tenant reads, staff membership permissions, and platform-private data are outside this portal boundary.

## Public vs Private Data

The initial portal is private. It must not expose a public profile, community content, customer contact details, addresses, invoices, complete purchase history, points, coupons, wallet, or commission income to another customer or anonymous visitor.

Public profile opt-in belongs to a later contract and is not inferred from portal login.

## Feature Scope

### In scope for contract

- authenticated customer dashboard shell;
- profile summary read;
- membership list read;
- order history read-only;
- receipt/payment status read-only where the existing read contract allows it;
- coupon/benefit read-only;
- point balance and ledger read-only;
- notification inbox read-only;
- consent state read-only.

### Deferred

- profile edit;
- membership join/leave;
- coupon claim/redeem;
- point redemption;
- notification mark-read mutation;
- consent changes;
- public profile/community opt-in;
- wallet, commission, payout, affiliate, and creator surfaces.

## Required Controls

| Control | Requirement |
|---|---|
| Auth | Server-side authenticated session required |
| RLS | Existing RLS must enforce current identity and tenant scope; no bypass |
| Permission | Customer self-read is distinct from staff `customer.view`; no staff permission grants customer cross-tenant access |
| Audit | Read access to sensitive financial/customer fields follows existing audit/observability policy; all future mutations require append-only audit |
| Consent | Marketing consent is displayed by purpose/channel; dispatch checks consent and suppression again |
| Entitlement | Portal visibility is plan/tenant gated when commercial policy is approved; no quota values inferred now |
| Idempotency | Future mutations require request identity and idempotency key |

## Migration Position

**Migration required for this review:** Yes, additive forward migration `20260728195007_customer_portal_read_snapshot_boundary.sql`.

Implementation must stop if a missing link requires changing protected Commerce Core tables or creating a duplicate customer/order/payment table. Any forward migration needs a separate contract, RLS review, validation SQL, and Owner approval where the private-data boundary changes.

## Current Schema Finding

The current frozen schema does not contain a verified customer-to-auth/profile ownership link:

- `profiles.auth_user_id` links `profiles` to `auth.users`;
- `customers` is tenant-scoped but has no `profile_id` or `auth_user_id`;
- `customer_identities` links provider/external identities to `customers`, but does not establish authenticated Supabase ownership.

Migration 052 now provides the additive `customer_profile_links` association boundary. The portal selects a customer only through an `ACTIVE` link for the current authenticated profile and requested organization. It must not guess by email/phone, use staff `customer.view`, or query a browser-supplied `customer_id`.

## Validation Plan Before Implementation

1. Authenticated customer sees only their own profile and customer rows.
2. Customer with memberships in multiple organizations sees each membership only in its own tenant context.
3. Platform-led account with no membership sees no store-private order, coupon, point, notification, or staff data.
4. Cross-customer and cross-tenant reads return no rows or controlled denial.
5. Order/payment/loyalty reads reuse existing source tables and preserve financial status.
6. Consent display is scoped by organization, purpose, and channel.
7. Public/anonymous requests cannot access private portal data.
8. RLS, permission, audit, and read-model tests pass without direct browser database writes.

## Gate Result

The Customer Portal P1 read boundary is **IMPLEMENTED AND VALIDATED**. Identity merge follows the approved conservative policy: no automatic merge and no cross-organization customer-row equivalence. Portal UI, notification recipient mapping, consent mutations, and all other writes remain separate contracts.
