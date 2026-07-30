# ER Addendum Phase 1C Storefront MVP

**Task ID:** `PHASE-1C-STOREFRONT-PART2-ER`
**Status:** OWNER APPROVED / FROZEN FOR PART 3
**Depends On:** Owner-frozen decisions D01-D18 and proposed SF-BR-001 to SF-BR-036
**Owner Approval Date:** 2026-07-31
**Migration:** Not authorized
**Runtime:** Not authorized

## Scope

Define the minimum additive persistence for a product-only, read-only
Storefront. The addendum does not alter frozen Core tables and does not create
new customer, product, order, payment, service or booking masters.

## Relationship Map

```text
organizations
  -> organization_storefronts
  -> storefront_slug_history
  -> storefront_product_listings -> products -> product_variants
                                               -> inventory_balances -> warehouses

organizations
  -> organization_entitlements -> features(code = storefront)

guarded Storefront mutations
  -> audit_logs
```

`organizations.slug` remains the current canonical store slug.

## Status Catalog

```text
storefront_publication_status:
  PRIVATE
  PUBLISHED

storefront_product_visibility:
  HIDDEN
  VISIBLE

public_availability:
  IN_STOCK
  SOLD_OUT
```

`public_availability` is derived and is never persisted.

## Proposed Entities

### organization_storefronts

One Storefront settings row per organization.

| Column | Rule |
|---|---|
| id | UUID primary key |
| organization_id | FK `organizations`; unique and required |
| publication_status | `PRIVATE` or `PUBLISHED`; default `PRIVATE` |
| tagline | nullable, trimmed, maximum 160 characters |
| description | nullable, trimmed, maximum 1,000 characters |
| published_at | required only while `PUBLISHED` |
| published_by | nullable FK `profiles`; same active tenant member at transition time |
| created_at / updated_at | managed timestamps |

Required tenant key:

```text
unique (organization_id)
unique (organization_id, id)
```

The entity does not store name, slug, currency, timezone, entitlement,
subscription or theme. Those remain canonical elsewhere.

### storefront_product_listings

Explicit public-listing projection for a Core product.

| Column | Rule |
|---|---|
| id | UUID primary key |
| organization_id | required tenant FK |
| storefront_id | same-tenant FK `organization_storefronts` |
| product_id | same-tenant FK `products` |
| public_handle | normalized 3-63 character handle |
| visibility | `HIDDEN` or `VISIBLE`; default `HIDDEN` |
| sort_order | non-negative integer; default 0 |
| visible_at | required only while `VISIBLE` |
| created_by / updated_by | nullable FK `profiles`; actor evidence |
| created_at / updated_at | managed timestamps |

Required constraints:

```text
unique (organization_id, product_id)
unique (organization_id, public_handle)
foreign key (organization_id, storefront_id)
  -> organization_storefronts(organization_id, id)
foreign key (organization_id, product_id)
  -> products(organization_id, id)
```

No row means hidden. A `VISIBLE` row does not override product, variant,
organization, entitlement or publication lifecycle.

### storefront_slug_history

Append-only route and redirect evidence for guarded changes to
`organizations.slug`.

| Column | Rule |
|---|---|
| id | UUID primary key |
| organization_id | FK `organizations`; required |
| old_slug | globally unique normalized slug |
| new_slug | normalized slug current at change time |
| changed_by | FK `profiles`; required same-tenant actor |
| request_id | UUID required and globally unique for idempotency |
| changed_at | immutable timestamp |

Old slugs remain reserved. Update and delete are forbidden. A historical slug
does not expose a private, suspended, archived or unentitled Storefront.

## Reused Entities

### organizations

Reused fields:

```text
id
name
slug
status
currency_code
updated_at
```

No frozen column is changed by this addendum. Slug mutation occurs through a
new guarded action and existing uniqueness remains authoritative.

### products

Reused public-safe inputs:

```text
id
organization_id
name
description
category_id
brand_id
status
updated_at
```

`product_code`, `created_by`, `archived_at` and internal IDs are not returned.

### product_variants

Reused public-safe inputs:

```text
id
organization_id
product_id
variant_name
base_price
status
```

`stock_code`, barcode, cost, minimum selling price, dimensions, weight and
archive fields are not returned.

### inventory_balances and warehouses

Only a same-tenant aggregate of `available` for active warehouses is used to
derive `IN_STOCK` or `SOLD_OUT`. No inventory field or warehouse identity is
returned.

### features and organization_entitlements

Proposed additive seed:

```text
features.code = storefront
features.feature_type = BOOLEAN
features.status = ACTIVE
```

Public eligibility requires at least one currently valid enabled entitlement
for the organization and feature. No plan mapping or commercial price is
authorized by Part 2.

### audit_logs

Reuse the append-only Core audit source for:

```text
STOREFRONT_SETTINGS_UPDATED
STOREFRONT_PRODUCT_LISTING_UPDATED
STOREFRONT_PUBLISHED
STOREFRONT_UNPUBLISHED
ORGANIZATION_SLUG_UPDATED
```

No separate Storefront event or ledger table is proposed.

## Proposed Permissions

```text
storefront.view
storefront.manage
storefront.publish
```

Admin reads require `storefront.view`. Settings and product listings require
`storefront.manage`. Publication and unpublication require
`storefront.publish`. Organization slug change requires both
`organization.settings.edit` and `storefront.publish`.

## Guarded Mutation Direction

Part 3 may propose exact authenticated RPCs for:

```text
upsert Storefront settings
set product listing visibility and handle
publish/unpublish Storefront
change canonical organization slug
```

Every mutation must:

1. resolve the active profile and same-tenant active membership;
2. enforce exact permissions;
3. validate lifecycle and entitlement where relevant;
4. accept a required client request ID;
5. use transaction-safe idempotency;
6. write the approved audit action atomically; and
7. return a field-bounded result.

Direct table writes remain denied.

## Public Read Direction

Part 3 may propose service-role-only, `SECURITY INVOKER` RPCs for:

```text
resolve Storefront by current or historical organization slug
list eligible Storefront products
read one eligible Storefront product
page eligible active variants
```

The anonymous browser calls a server application service, never Supabase Core
tables or these RPCs directly.

Database posture:

1. enable RLS on all three proposed tables;
2. revoke table access from `PUBLIC`, `anon` and `authenticated`;
3. grant public-read RPC execution only to `service_role`;
4. use a fixed search path;
5. keep public-read RPCs `SECURITY INVOKER`;
6. return exact composite/JSON allowlists rather than table row types; and
7. make private, suspended, archived, unentitled and unknown slugs
   indistinguishable to public callers.

## Public Read Shapes

### Storefront

```text
canonical_slug
redirect_required
store_name
tagline
description
currency_code
publication_updated_at
```

### Product summary/detail

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

### Variant

```text
variant_id
variant_name
base_price
availability
```

Forbidden outputs include exact inventory, organization ID, warehouse ID,
product code, stock code, barcode, cost, margin, minimum selling price,
creator, entitlement source, member, customer and audit data.

## Read Bounds and Index Direction

```text
product page size: 24 maximum
variant page size: 50 maximum

organization_storefronts(organization_id) unique
organization_storefronts(publication_status, organization_id)
storefront_product_listings(organization_id, product_id) unique
storefront_product_listings(organization_id, public_handle) unique
storefront_product_listings(storefront_id, visibility, sort_order, product_id)
storefront_slug_history(old_slug) unique
storefront_slug_history(organization_id, changed_at desc)
storefront_slug_history(request_id) unique
```

Public list order uses listing sort order, product update time and product ID.
Variant pagination uses variant name and variant ID as stable order keys.

## Delete and Retention Direction

- `organization_storefronts` is retained with its organization and is not
  hard-deleted by UI.
- `storefront_product_listings` may be hidden but not hard-deleted by ordinary
  UI.
- `storefront_slug_history` is append-only and cannot be updated or deleted.
- Organization archival immediately denies public reads without erasing
  Storefront audit or slug history.
- Privacy/legal deletion requires a separately approved retention workflow.

## Migration Direction

A future Part 3 migration would be additive and forward-only:

1. create the three proposed tables and constraints;
2. add RLS and direct-role denial;
3. seed the proposed feature and permissions;
4. add append-only slug-history protection;
5. create guarded mutation RPCs;
6. create service-role-only public read RPCs;
7. preserve all frozen Core tables and migrations; and
8. add focused tenant, lifecycle, entitlement, field-leak and direct-role
   validation.

No migration file may be generated until this addendum and its Business Rules
receive explicit Owner freeze.

## Owner Approval

The Project Owner approved this ER addendum in full on 2026-07-31.

The three additive entities, status catalogs, reuse of
`organizations.slug`, permanent slug reservation, default-hidden product
listings, public handles, feature and permission codes, service-role-only RPC
architecture, field allowlists, pagination limits, audit actions and migration
direction are frozen for Phase 1C Part 3.

Part 3 migration drafting is ready, but no migration is authorized until the
Owner explicitly instructs the project to proceed with Part 3.
