# ADORA Commerce OS (ACOS)
# Business Rules - Phase 1C Storefront MVP

**Document:** `BUSINESS_RULES_PHASE_1C_STOREFRONT_MVP.md`
**Task ID:** `PHASE-1C-STOREFRONT-PART2-BUSINESS-RULES`
**Status:** OWNER APPROVED / FROZEN FOR PART 3
**Depends On:** Phase 1C Owner-frozen decisions D01-D18
**Owner Approval Date:** 2026-07-31
**Migration:** Not authorized
**Runtime:** Not authorized

## 0. Purpose

These rules define the product-only, read-only Storefront MVP. They preserve
Commerce Core as the source of truth and provide a narrow public projection
without opening protected tenant tables.

## 1. Scope

### SF-BR-001 - Product-only MVP

Phase 1C includes store profile, product listing, product detail, public-safe
price, coarse availability, SEO metadata and disabled join/follow affordances.

**Status:** PROPOSED FROM D01

### SF-BR-002 - Deferred commerce capabilities

Service, package, booking, product media persistence, promotion/member-benefit
claims, custom domains, cart, checkout, payment and public mutations are
deferred.

**Status:** PROPOSED FROM D09, D10, D14 AND D17

### SF-BR-003 - Canonical sources only

The Storefront must reuse:

```text
organizations
products
product_variants
categories
brands
warehouses
inventory_balances
features
organization_entitlements
audit_logs
```

No customer, product, order, payment, service or booking master may be
duplicated.

**Status:** PROPOSED FROM D01 AND D11

## 2. Route and Slug

### SF-BR-004 - Canonical route

The canonical route is:

```text
/store/[organizationSlug]
/store/[organizationSlug]/products/[productHandle]
```

`organizations.slug` remains the canonical store slug. A second Storefront
master slug is forbidden.

**Status:** PROPOSED FROM D02

### SF-BR-005 - Slug normalization

Store slugs and product handles must:

1. be lowercase ASCII;
2. use only `a-z`, `0-9` and single hyphens;
3. start and end with an alphanumeric character;
4. be between 3 and 63 characters;
5. reject consecutive hyphens; and
6. reject reserved platform paths.

Initial reserved values are:

```text
admin
api
auth
login
logout
onboarding
portal
signup
store
support
www
```

**Status:** PROPOSED

### SF-BR-006 - Slug change history

Every organization slug change must use a guarded action, preserve the old
slug in append-only history, reserve old slugs against reuse and write an audit
record. A valid old slug returns a permanent redirect only when the destination
Storefront remains publicly eligible.

**Status:** PROPOSED FROM D02 AND D13

## 3. Publication and Entitlement

### SF-BR-007 - Private by default

A Storefront defaults to `PRIVATE`. Organization creation or activation must
never publish it automatically.

**Status:** PROPOSED FROM D03

### SF-BR-008 - Storefront lifecycle

The only persisted publication states in Phase 1C are:

```text
PRIVATE
PUBLISHED
```

Legal transitions are `PRIVATE -> PUBLISHED` and `PUBLISHED -> PRIVATE`.
Suspension and archival are derived from the canonical organization lifecycle.

**Status:** PROPOSED FROM D03 AND D04

### SF-BR-009 - Public eligibility

A Storefront is publicly readable only when all conditions are true:

1. `organizations.status = ACTIVE`;
2. Storefront publication status is `PUBLISHED`;
3. the organization has a currently valid enabled `storefront` entitlement;
4. the request resolves to the current canonical slug or valid slug history;
5. the requested record satisfies every product visibility rule; and
6. the server projection completes without an authorization or integrity
   ambiguity.

Any failure returns the same public not-found result.

**Status:** PROPOSED FROM D04 AND D12

### SF-BR-010 - Exact entitlement

Phase 1C proposes the existing `features.code` value:

```text
storefront
```

It is a `BOOLEAN` feature. Absence, inactivity, expiry or disabled entitlement
fails closed. Plan assignment and commercial pricing are outside Part 2.

**Status:** PROPOSED FROM D12 / OWNER FREEZE REQUIRED

## 4. Product Listing and Visibility

### SF-BR-011 - Explicit product listing

An active Core product is not public merely because the Storefront is
published. It requires one Storefront product-listing row with visibility
`VISIBLE`. No row and `HIDDEN` both mean not public.

**Status:** PROPOSED FROM D03 AND D05

### SF-BR-012 - Product eligibility

A listed product is publicly eligible only when:

1. the product belongs to the same organization as the Storefront;
2. `products.status = ACTIVE`;
3. at least one same-tenant variant has `status = ACTIVE`; and
4. its public handle is normalized and unique within the organization.

Draft, inactive and archived products are never public.

**Status:** PROPOSED FROM D05

### SF-BR-013 - Variant eligibility

Only variants belonging to an eligible product with
`product_variants.status = ACTIVE` may appear. Barcode, stock code, cost,
minimum selling price, dimensions and weight remain private.

**Status:** PROPOSED FROM D05 AND D08

### SF-BR-014 - Listing order

Product lists sort by:

```text
sort_order ascending
products.updated_at descending
products.id ascending
```

The final identifier tie-break prevents unstable pagination.

**Status:** PROPOSED

## 5. Price and Availability

### SF-BR-015 - Public price

Public price is calculated from active variants' `base_price`:

1. one distinct value returns one price;
2. multiple values return minimum and maximum price; and
3. no active variant returns no public product.

Cost, margin and minimum selling price are forbidden.

**Status:** PROPOSED FROM D08

### SF-BR-016 - Coarse inventory

Variant availability is `IN_STOCK` only when the sum of
`inventory_balances.available` across same-tenant active warehouses is greater
than zero. Otherwise it is `SOLD_OUT`.

No exact quantity, warehouse, reservation, allocation or movement data may be
returned.

**Status:** PROPOSED FROM D07

### SF-BR-017 - Product sold-out state

A product is `IN_STOCK` when at least one eligible variant is `IN_STOCK`.
Otherwise it remains visible as `SOLD_OUT`, and every conversion CTA is
disabled.

**Status:** PROPOSED FROM D06

## 6. Public Read Contract

### SF-BR-018 - Server-only projection

Anonymous browsers call the ACOS Web server. The Web server calls a reviewed,
service-role-only Storefront RPC. Browser code must never receive a service key
or direct Core-table access.

The RPC runs as `SECURITY INVOKER`, has a fixed search path, returns an exact
allowlist and performs all lifecycle, entitlement, tenant and visibility
checks. This is an approved service boundary, not an ad hoc bypass.

**Status:** PROPOSED FROM D11

### SF-BR-019 - Database grants

All proposed Storefront tables have RLS enabled. Table access is revoked from
`PUBLIC`, `anon` and `authenticated`. Storefront mutation RPCs are
authenticated and permission-checked. Public read RPCs are executable only by
`service_role`.

**Status:** PROPOSED FROM D11

### SF-BR-020 - Public store allowlist

The store projection may return only:

```text
canonical_slug
store_name
tagline
description
currency_code
publication_updated_at
```

Timezone, organization identifiers, subscription records, entitlement sources,
members and internal settings are forbidden.

**Status:** PROPOSED

### SF-BR-021 - Public product allowlist

The product projection may return only:

```text
public_handle
name
description
category_name
brand_name
price_min
price_max
currency_code
availability
sort_order
updated_at
```

Internal product code, creator, archive fields and raw foreign keys are
forbidden.

**Status:** PROPOSED

### SF-BR-022 - Public variant allowlist

The variant projection may return only:

```text
variant_id
variant_name
base_price
availability
```

The opaque variant identifier is exposed only for stable UI selection and
future guarded checkout references. It grants no direct read authority.

**Status:** PROPOSED

### SF-BR-023 - Read bounds

Product list pages contain exactly at most 24 products. Variant pages contain
at most 50 variants. Both use stable cursor pagination, return a bounded total
indicator and reject negative or oversized limits.

**Status:** PROPOSED FROM D16

### SF-BR-024 - No read audit

Anonymous Storefront reads do not write audit events in Phase 1C. Operational
logs may record bounded request metadata without IP, cookie, email, phone or
customer identity persistence.

**Status:** PROPOSED

## 7. Mutation, Permission and Audit

### SF-BR-025 - Proposed permissions

Phase 1C proposes:

```text
storefront.view
storefront.manage
storefront.publish
```

`storefront.publish` is separate because public exposure is higher risk than
editing private settings.

**Status:** PROPOSED / OWNER FREEZE REQUIRED

### SF-BR-026 - Guarded mutations

Storefront settings, product listing visibility, publication and organization
slug changes must use authenticated, same-tenant, permission-checked,
idempotent guarded RPCs. Direct table writes remain denied.

**Status:** PROPOSED

### SF-BR-027 - Audit actions

The existing append-only `audit_logs` source records:

```text
STOREFRONT_SETTINGS_UPDATED
STOREFRONT_PRODUCT_LISTING_UPDATED
STOREFRONT_PUBLISHED
STOREFRONT_UNPUBLISHED
ORGANIZATION_SLUG_UPDATED
```

Each record requires organization, actor, entity, before/after allowlist,
reason and request ID. Secrets and private customer data are forbidden.

**Status:** PROPOSED

### SF-BR-028 - Publish transaction

Publishing must atomically validate active organization, active entitlement,
normalized canonical slug and at least one eligible visible product. Failed
validation leaves the Storefront private and writes no success audit.

**Status:** PROPOSED

### SF-BR-029 - Automatic fail-closed behavior

Public reads stop immediately when organization status, entitlement,
publication, product status, variant status or product listing visibility no
longer qualifies. No separate unpublish job is required for read denial.

**Status:** PROPOSED

## 8. SEO, Language and UI

### SF-BR-030 - Preview SEO

Local and controlled preview must emit `noindex, nofollow`. Published
Storefronts may emit canonical URL, title, description and basic social
metadata derived only from the public allowlist.

**Status:** PROPOSED FROM D13

### SF-BR-031 - Language and appearance

The UI uses Noto Sans Thai, Thai/English and light/dark preferences. Phase 1C
keeps the current blue visual tokens. Merchant-entered names and descriptions
are not automatically translated.

**Status:** PROPOSED FROM D15

### SF-BR-032 - Required UI states

Store and product routes must implement loading, empty, not-found, sold-out,
error, offline/retry and disabled-action states on mobile and desktop.

**Status:** PROPOSED

### SF-BR-033 - Join/follow placeholder

Join and follow controls remain disabled and explain availability without
starting signup, membership, consent or mutation workflows.

**Status:** PROPOSED FROM D14

### SF-BR-034 - Product media placeholder

Phase 1C uses a controlled visual placeholder. Community content media,
external URLs and Storage objects must not be treated as canonical product
media.

**Status:** PROPOSED FROM D10

## 9. Production and Delivery Gates

### SF-BR-035 - P16 remains binding

Part 2 does not close or weaken P16. Public production activation, real signup,
checkout, payment and material production-data creation remain blocked until
the recovery gate is completed.

**Status:** APPROVED EXISTING BOUNDARY

### SF-BR-036 - Ordered delivery

The order remains:

```text
Owner-freeze these Business Rules and ER addendum
Additive migration and guarded read boundary
Read-only Storefront UI
Responsive, accessibility and browser QA
P16 recovery completion before production activation
```

**Status:** PROPOSED FROM D18

## 10. Part 2 Exit Gate

Part 2 exits only after the Owner approves:

1. rules SF-BR-001 through SF-BR-036;
2. exact Storefront entities and status values;
3. feature code `storefront`;
4. permissions `storefront.view`, `storefront.manage` and
   `storefront.publish`;
5. slug and product-handle rules;
6. public allowlists and read bounds;
7. server-only RPC posture; and
8. audit action catalog.

## 11. Owner Approval

The Project Owner approved SF-BR-001 through SF-BR-036 in full on 2026-07-31.
The product-only scope, canonical sources, route and slug policy, publication,
entitlement, visibility, public field allowlists, read bounds, permissions,
audit catalog and delivery gates are frozen for Phase 1C Part 3.

Part 3 is ready, but migration generation or application still requires an
explicit Part 3 instruction. Public runtime and Production remain closed.
