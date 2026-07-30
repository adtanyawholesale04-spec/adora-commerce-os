# Phase 1C Storefront Part 4 Read-Only UI

**Task ID:** `PHASE-1C-STOREFRONT-PART4`
**Implementation Date:** 2026-07-31
**Status:** IMPLEMENTED / LOCAL VALIDATED
**Runtime:** Local controlled preview only
**Migration:** None in Part 4
**Production:** NOT ACTIVATED / BLOCKED BY P16

## Scope

Part 4 implements the approved product-only Storefront preview at:

- `/store/[organizationSlug]`;
- `/store/[organizationSlug]/products/[productHandle]`.

Both routes are dynamic, read-only and `noindex`. They use the current blue
visual baseline, Noto Sans Thai, Thai/English copy and light/dark preferences.
The controlled product placeholder is used because no canonical product-media
relationship is frozen.

## Server Read Boundary

Browser code receives only the bounded Storefront projection. A server-only
adapter calls exactly these Part 3 RPCs:

- `api_get_public_storefront`;
- `api_list_public_storefront_products`;
- `api_get_public_storefront_product`;
- `api_list_public_storefront_product_variants`.

The adapter does not read Commerce Core tables directly and does not expose a
Supabase secret to client components. It validates returned fields before
building page models and fails closed on missing configuration, unavailable
publication or malformed data.

## Safety Posture

- tenant selection comes from the normalized canonical Storefront slug;
- private, inactive and non-entitled Storefronts resolve to a generic not-found
  state;
- inventory is shown only as `IN_STOCK` or `SOLD_OUT`;
- cost, exact quantity, warehouse, customer and private organization data are
  absent;
- join, follow, cart and order actions are visibly disabled with an explanation;
- signup, checkout and payment routes are not linked or activated;
- cursor input is bounded and validated before reaching the RPC boundary;
- theme and locale actions only write preference cookies and use normalized
  Storefront return paths.

## UI States

The implementation includes loading, empty catalog, sold-out, unavailable,
not-found, configuration-error, query-error, offline, retry and disabled-action
states. List and detail layouts use stable responsive dimensions and preserve
keyboard-readable links, labels and status semantics.

## Validation

Part 4 must pass:

1. server-only boundary and secret-leak contract tests;
2. read-only route and disabled-action tests;
3. Thai/English, light/dark and state coverage tests;
4. lint, typecheck, full repository tests and production build;
5. desktop and mobile browser inspection for list and detail routes;
6. generic unknown-store not-found response and `noindex` checks; and
7. local Supabase Storefront boundary validation.

Part 5 remains the formal responsive, accessibility and controlled-preview QA
gate. Completing Part 4 does not authorize a public runtime, production
migration, checkout, payment or production activation.
