# Phase 1C Storefront Owner Decision Freeze

**Task ID:** `PHASE-1C-STOREFRONT-PART1-OWNER-FREEZE`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / D01-D18 FROZEN
**Runtime:** Local and controlled preview only
**Migration:** None
**Approved Provider Spend:** USD 0

## Owner Approval

The Owner approves all recommended values D01-D18 from
`ACOS_PHASE_1C_STOREFRONT_VISIBILITY_READ_MODEL_CONTRACT_REVIEW.md`.

This approval freezes the Phase 1C Storefront MVP direction. It authorizes
Part 2 Business Rules and ER design work only. It does not authorize a
database migration, anonymous runtime access, public launch, signup, checkout
or payment.

## Frozen Decisions

| ID | Frozen value |
|---|---|
| D01 | The first Storefront MVP is product-only; service, package and booking remain deferred until canonical sources are separately approved |
| D02 | The Storefront route is `/store/[organizationSlug]` |
| D03 | Publication is explicit opt-in and defaults to `PRIVATE` |
| D04 | A public store requires organization `ACTIVE` and Storefront `PUBLISHED` |
| D05 | A public product requires product `ACTIVE` and at least one active variant |
| D06 | An unavailable product remains visible as `SOLD_OUT` and its conversion CTA is disabled |
| D07 | Public inventory is only `IN_STOCK` or `SOLD_OUT`; exact stock, reservations, allocations and warehouse location remain private |
| D08 | Public price uses active variant `base_price` and a range when needed; cost, margin and protected pricing controls remain private |
| D09 | Promotion and member-benefit claims are deferred from the first public projection |
| D10 | Product media uses a controlled placeholder until a canonical product-media relationship is approved |
| D11 | Public reads use a bounded server/RPC projection with no direct anonymous access to protected Commerce Core tables |
| D12 | Storefront entitlement defaults to deny and requires a separately approved feature code |
| D13 | Controlled preview is `noindex`; canonical SEO/social metadata applies only after publication |
| D14 | Join/follow is a disabled preview CTA until the guarded flows and P16 production gate are authorized |
| D15 | Phase 1C keeps the current blue visual tokens, Noto Sans Thai, Thai/English and light/dark support |
| D16 | Product pagination is 24 products per page and product variants must be bounded by the read contract |
| D17 | Custom domain support is deferred |
| D18 | Delivery order is Business Rules and ER freeze, migration/read boundary, UI, then responsive/accessibility/browser QA |

## Visual-System Clarification

D15 freezes the currently implemented blue visual baseline for Phase 1C only.
It does not approve or reject the proposed Dark Purple/Wisteria/Sunglow palette
in `docs/design/ACOS_BRAND_DESIGN_SYSTEM_GUIDE.md`.

That guide remains `PROPOSED FOR OWNER REVIEW`. A later Brand Design System
freeze may replace the Phase 1C visual baseline through an explicit,
independently validated decision.

## Security and Data Boundaries

The frozen contract requires:

1. canonical organization, product, variant and inventory sources only;
2. no duplicate product, customer, order or payment source;
3. no inferred service, package or booking source;
4. no exact inventory, cost, customer, internal or warehouse data in the public
   projection;
5. tenant, lifecycle, publication, entitlement and field allowlist checks that
   fail closed;
6. no direct `anon` grants on protected Commerce Core tables;
7. no ad hoc `service_role` bypass;
8. audit evidence for slug, publication and Storefront-setting mutations; and
9. no mutation, payment or ledger behavior in the read-only Phase 1C MVP.

## Part 2 Entry Gate

Part 2 may now create:

1. frozen Phase 1C Storefront Business Rules;
2. a Storefront ER addendum;
3. exact publication, visibility, slug, entitlement, event and audit rules;
4. the public-safe field allowlist;
5. product and variant read bounds; and
6. an additive forward-only migration plan.

Part 2 must stop before migration generation or runtime implementation and
request Owner approval for the resulting Business Rules and ER addendum.

## Boundaries That Remain Closed

```text
public Storefront runtime: NOT AUTHORIZED
anonymous Commerce Core access: NOT AUTHORIZED
database migration: NOT AUTHORIZED
service/package/booking source: NOT AUTHORIZED
join/follow mutation: NOT AUTHORIZED
public platform signup: DISABLED
checkout/payment: NOT AUTHORIZED
production launch: BLOCKED BY P16
```

`ACOS_PLATFORM_SIGNUP_ENABLED` remains false and
`ACOS_PLATFORM_SIGNUP_KILL_SWITCH` remains true in Production.

## Decision

`OWNER APPROVED / D01-D18 FROZEN / PART 2 DESIGN DELIVERED`

Phase 1C Part 2 Business Rules and ER addendum are delivered for Owner freeze.
Part 3 remains blocked.
