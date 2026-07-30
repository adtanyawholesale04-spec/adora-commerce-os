# Phase 1C Storefront Visibility and Read-Model Contract Review

**Task ID:** `PHASE-1C-STOREFRONT-CONTRACT-REVIEW`
**Review Date:** 2026-07-31
**Status:** OWNER APPROVED / PART 3 IMPLEMENTED / LOCAL VALIDATED
**Runtime:** Local and controlled preview only
**Migration:** Additive Part 3 migration; local only, production not applied
**Approved Provider Spend:** USD 0

## Purpose

This review defines the first safe boundary for the Phase 1C Storefront MVP.
It does not authorize a public route, a database migration, anonymous access to
Commerce Core, signup, checkout, payment or production activation.

## Evidence Reviewed

The review follows:

1. `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`;
2. `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`;
3. `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`;
4. `docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_GROWTH_GUIDE.md`;
5. the current Business Rules, frozen ER/schema and migration status;
6. the implemented organization, catalog, inventory, promotion, membership and
   Admin read-model boundaries; and
7. the approved P16 Web-app-first sequencing decision.

## Repository and Dependency Audit

| Concern | Canonical source or evidence | Disposition |
|---|---|---|
| Store identity | `public.organizations` | Reuse organization `id`, `name`, `slug` and lifecycle; public profile fields and publication state do not yet exist |
| Products | `public.products` | Reuse; only `ACTIVE` products may become eligible |
| Variants and price | `public.product_variants` | Reuse active variants and `base_price`; never expose cost or protected pricing fields |
| Availability | `public.inventory_balances` | Derive a bounded availability state; never expose warehouse rows or exact quantities |
| Categories, brands and tags | Existing Commerce Core catalog sources | Reuse through the public projection only |
| Promotions and benefits | Existing promotion/coupon/loyalty sources | No public claim until eligibility and projection rules are frozen |
| Membership and follow | Existing customer/store membership boundaries | CTA may be shown only as disabled preview until the guarded flow is authorized |
| Product media | No frozen canonical product-media relationship | Use a controlled placeholder; do not repurpose community content media as product master data |
| Services, packages and booking | No canonical frozen source found | Defer from the first MVP; do not create an inferred or duplicate source |
| Public Storefront read | No approved anonymous projection exists | A new bounded contract is required before implementation |
| Storefront entitlement | No approved Storefront entitlement code found | Default deny until the entitlement rule and code are frozen |

The existing Admin product read model is authenticated, tenant-scoped and
permission-aware. It is not an anonymous Storefront API and must not be exposed
or reused by bypassing its authorization boundary.

## Implementation Dependencies

Phase 1C runtime and migration implementation remain blocked because:

1. no frozen Phase 1C Storefront Business Rules document exists;
2. no frozen Storefront ER addendum exists;
3. Storefront publication and visibility fields are not present in the frozen
   schema;
4. no canonical service/package/booking source exists;
5. no approved public Storefront entitlement exists;
6. no approved public product-media relationship exists; and
7. the proposed document in `docs/design/` is not Owner-frozen and conflicts
   with the currently implemented blue visual tokens.

Part 1 Owner approval resolves the decision-table blocker only. The remaining
dependencies must be designed and frozen in Part 2 rather than resolved by
inference.

## Frozen Owner Decision Table

The Owner approved every recommended value D01-D18 on 2026-07-31. The durable
approval evidence is
`ACOS_PHASE_1C_STOREFRONT_OWNER_DECISION_FREEZE.md`.

| ID | Decision | Recommended value | Safety reason |
|---|---|---|---|
| D01 | First MVP catalog scope | Product-only | No frozen service/package/booking source exists |
| D02 | Public route shape | `/store/[organizationSlug]` | Keeps tenant selection explicit and leaves `/admin` and `/portal` unchanged |
| D03 | Publication posture | Explicit opt-in; default `PRIVATE` | An active organization must not become public automatically |
| D04 | Store eligibility | Organization `ACTIVE` and Storefront `PUBLISHED` | Separates operational lifecycle from public publication |
| D05 | Product eligibility | Product `ACTIVE` with at least one active variant | Prevents draft, inactive and empty catalog items from leaking |
| D06 | Out-of-stock behavior | Display `SOLD_OUT`; disable conversion CTA | Preserves discovery without promising unavailable stock |
| D07 | Inventory projection | `IN_STOCK` or `SOLD_OUT` only | Never expose exact stock, reservations, allocations or warehouse location |
| D08 | Public price | Active variant `base_price`; show a range when needed | Never expose cost, margin or protected price controls |
| D09 | Promotion display | Defer benefit claims from the first projection | Eligibility, consent and member-price rules are not frozen |
| D10 | Product media | Controlled placeholder until a canonical relation is approved | Community content media is not product master data |
| D11 | Public data boundary | Bounded server/RPC projection; no direct anonymous core-table access | Preserves tenant, RLS and field-level protection |
| D12 | Entitlement | Default deny; require an approved Storefront entitlement | Prevents accidental plan or tenant enablement |
| D13 | SEO posture | Preview is `noindex`; canonical metadata only when published | Prevents unfinished or private stores from being indexed |
| D14 | Join/follow behavior | Disabled preview CTA until guarded flows are authorized | P16 signup and production mutations remain closed |
| D15 | Visual baseline | Keep current blue tokens, Noto Sans Thai, Thai/English and light/dark | Avoids silently replacing the implemented system with an unapproved proposal |
| D16 | Pagination bound | 24 products per page; bounded variants per product | Gives the read model a deterministic operational ceiling |
| D17 | Custom domain | Deferred | Phase 1C scope requires slug routing only |
| D18 | Delivery order | Freeze rules and ER, then migration/read boundary, then UI and QA | Prevents UI or schema work from preceding approved contracts |

## Required Public Read Contract

After Owner approval and frozen Business Rules/ER, the public projection must:

1. accept a normalized organization slug and bounded pagination;
2. return only an explicitly published active Storefront;
3. return only eligible active products and variants for that organization;
4. expose public-safe store, product, price and availability fields only;
5. avoid exact inventory, cost, internal notes, customer data and warehouse data;
6. resolve every row from canonical Commerce Core sources;
7. fail closed when entitlement, tenant, publication or lifecycle checks fail;
8. use RLS-safe or explicitly guarded execution with a fixed search path;
9. deny direct table access that is not independently required; and
10. emit audit evidence for publication and slug changes, not for anonymous
    reads unless a later approved policy requires it.

Direct `anon` grants on protected Commerce Core tables and ad hoc
`service_role` bypasses are forbidden.

## Migration, Audit and Consent Impact

| Boundary | Required? | Review disposition |
|---|---|---|
| Migration | Yes, after Owner freeze | Additive and forward-only; old frozen migrations remain unchanged |
| Event | Yes for publication lifecycle | Exact event names belong in frozen Business Rules |
| Audit | Yes for slug/publication/settings mutations | Actor, tenant, before/after and correlation evidence required |
| Ledger | No for read-only Phase 1C | Reassess in checkout/payment phases |
| Consent | No new consent for anonymous catalog reads | Join/follow and marketing remain separately consent-gated |
| Entitlement | Yes | Default deny until an approved Storefront feature code exists |

## Validation Plan

The later implementation must prove:

1. cross-tenant slug and product leakage is impossible;
2. private, suspended, inactive, draft and archived records are hidden;
3. exact inventory and protected product cost never appear;
4. direct anonymous access to protected core tables remains denied;
5. pagination and variant bounds are enforced;
6. entitlement and publication checks fail closed;
7. Thai/English and light/dark rendering work on desktop and mobile;
8. loading, empty, sold-out, unavailable and not-found states are complete;
9. keyboard, focus, contrast and screen-reader semantics pass;
10. lint, typecheck, tests, build and browser QA pass; and
11. production signup, checkout, payment and private production data remain
    disabled throughout controlled preview.

## Ordered Parts

| Part | Scope | Current state |
|---|---|---|
| Part 0 | Repository and dependency audit | COMPLETE |
| Part 1 | Owner Decision Freeze D01-D18 | OWNER APPROVED / COMPLETE |
| Part 2 | Storefront Business Rules and ER addendum | OWNER APPROVED / COMPLETE |
| Part 3 | Additive migration and guarded public read boundary | IMPLEMENTED / LOCAL VALIDATED |
| Part 4 | Read-only Storefront list/detail UI | READY |
| Part 5 | Responsive, accessibility and controlled-preview QA | NOT STARTED |

## Decision

`OWNER APPROVED / PART 3 IMPLEMENTED / PART 4 READY`

Phase 1C Parts 0-3 are complete. The additive migration, guarded mutations and
server-only public projection passed local replay and security validation.
Part 4 read-only UI is ready. Public runtime and production migration remain
unauthorized.
