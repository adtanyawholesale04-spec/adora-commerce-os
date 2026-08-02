# ACOS Track B Customer Portal Part 3 Dashboard Experience

Status: IMPLEMENTED / LOCAL VALIDATED
Date: 2026-08-02

## Objective

Turn the existing `/portal` read model into a clear mobile-first customer dashboard without changing Commerce Core authority, tenant ownership, permissions, or guarded mutation contracts.

## Reused Boundaries

- Authentication and cookie refresh: existing Supabase Auth session boundary.
- Customer ownership: active `customer_profile_links` only.
- Portal data: `api_get_customer_portal_snapshot` and `api_get_customer_portal_notifications` only.
- Address and consent writes: existing server actions and guarded RPCs only.
- Customer, order, coupon, loyalty, notification, and consent sources remain canonical.

## Presentation Contract

1. The page exposes stable overview, order, notification, and account anchors.
2. Mobile uses a four-item bottom navigation with touch targets that do not resize.
3. Desktop retains the compact in-page navigation.
4. Summary metrics use a stable two-column mobile grid and four-column desktop grid.
5. Order dates and currency follow the selected Thai or English locale.
6. Order and payment state remain visible as text and are not represented by color alone.
7. Light/dark and Thai/English controls continue to use the shared preference boundary.
8. Anonymous, unlinked, missing-membership, and query-error states remain fail closed.

## Explicit Non-goals

- No migration, schema, RLS, permission, entitlement, event, audit, or ledger change.
- No direct browser write and no new customer, product, order, or payment source.
- No public or Production activation.
- No coupon claim, point redemption, bill, receipt, review, or community mutation.

## Validation

- Static contract test for mobile navigation, stable anchors, responsive metric grid, locale-aware date/currency, and existing guarded boundaries.
- Full unit/static suite, lint, typecheck, and production build.
- Responsive visual QA at mobile and desktop widths for controlled portal states.

## Validation Result

- 403 repository tests passed, including the focused Part 3 and existing portal boundary suites.
- Lint, typecheck, and production build passed.
- `390x844` and `1440x900` browser checks passed with no horizontal overflow or console errors.
- Ready-state mobile navigation is covered structurally; authenticated mutation workflows remain covered by their existing focused suites.
