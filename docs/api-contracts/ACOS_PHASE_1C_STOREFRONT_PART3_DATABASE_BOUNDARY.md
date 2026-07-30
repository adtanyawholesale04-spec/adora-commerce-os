# Phase 1C Part 3 Storefront Database Boundary

**Task ID:** `PHASE-1C-STOREFRONT-PART3`
**Implementation Date:** 2026-07-31
**Status:** IMPLEMENTED / LOCAL VALIDATED / PRODUCTION NOT APPLIED
**Runtime:** Server boundary only; no public route enabled

## Scope

Part 3 implements the additive database boundary approved by the frozen
Storefront Business Rules and ER addendum. Existing organization, product,
variant and inventory tables remain canonical.

## Additive Entities

| Entity | Purpose | Default |
|---|---|---|
| `organization_storefronts` | Tenant-owned publication settings | `PRIVATE` |
| `storefront_product_listings` | Explicit per-product public visibility | `HIDDEN` |
| `storefront_slug_history` | Append-only old-to-new slug evidence | No row |

All three tables have RLS enabled. `anon` and `authenticated` receive no direct
table access. Slug history is append-only.

## Feature And Permissions

- feature: `storefront` (`BOOLEAN`, active, no plan mapping);
- permission: `storefront.view`;
- permission: `storefront.manage`;
- permission: `storefront.publish`.

The feature is default-deny because no organization receives an entitlement
from this migration.

## Guarded Mutations

Authenticated members may call only the reviewed `SECURITY DEFINER` boundary:

- `api_upsert_storefront_settings`;
- `api_set_storefront_product_listing`;
- `api_set_storefront_publication`;
- `api_change_storefront_slug`.

Every mutation resolves the active profile, verifies tenant permission, uses a
bounded request ID for idempotency, and writes the approved audit action. Slug
changes additionally require `organization.settings.edit`.

## Server-Only Public Read Projection

Only `service_role` may execute:

- `api_get_public_storefront`;
- `api_list_public_storefront_products`;
- `api_get_public_storefront_product`;
- `api_list_public_storefront_product_variants`.

These RPCs are `SECURITY INVOKER`, bounded, and fail closed unless the
organization is active, the Storefront is published, the `storefront`
entitlement is active, and each product is explicitly visible. They return
coarse `IN_STOCK` or `SOLD_OUT` availability only.

The projection excludes cost, protected prices, stock codes, warehouse
identity and exact inventory quantities. Historical slugs resolve only to a
canonical redirect response.

## Audit Actions

- `STOREFRONT_SETTINGS_UPDATED`
- `STOREFRONT_PRODUCT_LISTING_UPDATED`
- `STOREFRONT_PUBLISHED`
- `STOREFRONT_UNPUBLISHED`
- `ORGANIZATION_SLUG_UPDATED`

No new event or ledger source is introduced because this phase remains a
read-only Storefront.

## Validation

- fresh local migration replay: pass;
- focused tenant, permission, entitlement, idempotency and projection suite:
  pass;
- Supabase database lint: pass;
- full Supabase security suite: pass;
- public/anon `SECURITY DEFINER` exposure: zero.

## Closed Boundaries

- no browser or anonymous direct database access;
- no public Storefront route enabled;
- no plan entitlement granted automatically;
- no signup, cart, checkout, order, payment or payout mutation;
- no production migration applied;
- P16 remains a production activation blocker.

## Next Gate

Phase 1C Part 4 may implement the local read-only Storefront list and detail UI
through the server-only RPC adapter. Public deployment and production data
remain separately unauthorized.
