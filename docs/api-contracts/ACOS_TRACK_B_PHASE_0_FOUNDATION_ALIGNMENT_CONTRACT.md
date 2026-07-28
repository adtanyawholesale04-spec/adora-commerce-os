# Track B Phase 0 Foundation Alignment Contract

**Task:** `C2C-P0-FOUNDATION-001`  
**Phase:** Phase 0 — Foundation Alignment  
**Status:** PARTIALLY RECONCILED / IMPLEMENTATION GATED  
**Owner approval:** Business Rules V1 gate reconciled on 2026-07-29

## Objective

Define the non-destructive foundation contract for Customer Community Commerce before starting Customer Portal, Storefront, Feed, Review, Attribution, Commission, or provider runtime implementation.

This document is a contract and decision record. It does not create tables, change protected migrations, enable writes, expose private data, or select a paid provider.

## Canonical Source Mapping

| Domain | Canonical source of truth | Track B use | Prohibited duplicate |
|---|---|---|---|
| Tenant | `organizations` / active membership context | Scope every tenant-owned read/write | Separate community tenant table |
| Customer identity | Commerce Core customer/account identity and profile boundary | Link portal, membership, consent, public-profile opt-in | `community_customers`, `feed_customers`, or parallel customer master |
| Product | Commerce Core products/variants | Product-linked content, storefront read model, review target reference | Community product catalog |
| Order/payment | Commerce Core orders/order items/payments | Verified purchase evidence and attribution read projection | Community order/payment history |
| Content/media | Track B content/media boundaries | Post, review, media metadata and visibility | Product/order/customer source replacement |

## Acquisition Paths

| Path | Required behavior | Data boundary | Event candidate |
|---|---|---|---|
| Store-led signup | Link or create the existing customer identity, then create/reuse store membership | Customer sees only own private data for the store; community participation is opt-in | `customer_joined_store` |
| Platform-led signup | Create/reuse the central customer identity without granting store membership | No store private data until membership exists | `customer_account_created` |
| Community opt-in | Explicitly enable public profile/community participation | Public profile is a separate projection; private account fields never enter it | `customer_opted_into_community` |

Identity merge follows the approved conservative policy in `ACOS_TRACK_B_IDENTITY_MERGE_POLICY.md`: no automatic merge, no cross-organization customer-row merge, and manual same-organization merge only through a future guarded contract.

## Tenant and Visibility Contract

| Data class | Visibility | Required control |
|---|---|---|
| Private customer account, contact, address, receipts, order history, points, coupons, wallet, commission | Owner only or explicitly authorized tenant context | Auth, tenant membership, RLS, exact permission, audit |
| Tenant-private store/customer/segment/campaign data | Same organization only | `organization_id`, RLS, permission, audit |
| Public profile and public content | Public only after explicit opt-in and moderation policy | Public projection, field allowlist, report/block/moderation path |
| Platform-private cost, fraud, provider secrets, cross-tenant aggregates | Platform service/admin boundary only | Server-only access, audit, aggregation/privacy review |

No public profile may expose phone, real email, address, invoices, complete purchase history, points balance, private coupons, wallet, or commission income.

## Foundation Pillars

| Pillar | Phase 0 decision | Status |
|---|---|---|
| Identity and consent | Existing identity plus store membership; consent is separate by store/community/channel and checked again before delivery; merge is manual, same-organization, guarded, and never automatic | APPROVED |
| Storefront conversion center | Reuse Commerce Core product/service/order/payment sources; no duplicate catalog or order history | APPROVED DIRECTION |
| Trust layer | Verified purchase/booking evidence, moderation, report/block, fraud guard before monetization | APPROVED DIRECTION |
| Event system | Use central event names for signup, opt-in, storefront, checkout, review, attribution, reward, and moderation | APPROVED DIRECTION |
| Ledger | Required for points, rewards, commission, wallet, payout, refund, and reversal; not replaced by aggregate fields | APPROVED DIRECTION |
| Policy/moderation | Visibility, report, block, suspension/ban, appeal, and sensitive-claim policy are required before public community release | APPROVED DIRECTION |
| Owner dashboard | Core Admin dashboard remains the operating shell; community metrics are a later read-model increment | PARTIAL / READ MODEL PENDING |
| Entitlement | Portal, storefront, community, review, affiliate, wallet/payout, rewards, ads, messaging, and analytics must be tenant/plan gated | APPROVED DIRECTION |

## Open Decisions That Block Implementation

| Decision | Why it blocks | Required owner action |
|---|---|---|
| Media storage provider | Upload, processing, quota, recovery, and signed URL behavior depend on provider | Select provider strategy, such as Supabase Storage or Cloudflare R2 |
| Commercial plan/quota policy | Entitlement, campaign recipient limits, storage quota, and provider spend limits need commercial values | Approve plan/quota model before enforcing commercial behavior |
| Identity merge policy | Wrong merge can cross tenant or expose private account data | Approved conservative policy in `ACOS_TRACK_B_IDENTITY_MERGE_POLICY.md`; runtime contract remains separate |

Media provider and commercial quota remain `DECISION REQUIRED`; no implementation may infer their values. Identity merge policy is approved, but its runtime implementation remains separately gated.

## Migration and Security Position

- Migration required for this contract: **No**.
- Historical migrations remain frozen.
- No new customer/product/order/payment source is created.
- No direct browser table writes are allowed.
- Any future tenant-owned table requires `organization_id`, RLS, permission, audit, and focused cross-tenant validation.
- Any public projection requires an explicit field allowlist and private/public separation test.

## Required Validation Before Phase 1/P1 Implementation

1. Validate customer identity and store membership ownership across multiple stores.
2. Validate platform-led accounts cannot see tenant-private data without membership.
3. Validate public profile opt-in does not expose private account fields.
4. Validate event names and idempotency keys are stable and tenant-scoped.
5. Validate feature entitlement denies gated surfaces by plan/tenant.
6. Validate consent/suppression is checked again at marketing dispatch.
7. Validate audit evidence exists for identity-link, consent, moderation, entitlement, and value movement boundaries.

## Gate Result

Phase 0 is **partially reconciled**. The canonical source map, tenant/privacy direction, trust/event/ledger direction, entitlement direction, and conservative identity-merge policy are recorded. Implementation remains gated by media provider and commercial quota decisions plus separate runtime contracts. The next safe work is a contract-only Customer Portal read model review that does not enable private-data reads until its auth, membership, RLS, and permission contract is approved.
