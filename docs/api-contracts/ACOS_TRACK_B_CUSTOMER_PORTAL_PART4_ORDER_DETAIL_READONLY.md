# ACOS Track B Customer Portal Part 4 Order Detail Read-only

Status: IMPLEMENTED / LOCAL VALIDATED  
Date: 2026-08-02

## Objective

Give an authenticated customer a readable order detail view while reusing the existing Customer Portal snapshot. The detail is an expandable row, so it does not create a second order endpoint or duplicate order history source.

## Contract

- Resolve customer ownership and tenant through the existing `api_get_customer_portal_snapshot` boundary.
- Display only order fields already present in the validated snapshot: order number, created date, order status, payment status, fulfillment status, totals, and order items.
- Keep all states visible as text; color is supplemental only.
- Use the selected Thai/English locale for dates and currency.
- Keep the detail keyboard accessible with native `details/summary` semantics and visible focus.

## Non-scope

- No order, payment, fulfillment, refund, return, receipt, or address mutation.
- No new RPC, table, view, migration, grant, RLS policy, event, audit, ledger, or entitlement change.
- No new customer, product, order, or payment source.
- No Production or public activation.

## Validation

- Static contract tests verify the existing snapshot RPC, no browser database client/write, detail fields, locale formatting, and native expandable semantics.
- Full tests, lint, typecheck, production build, and responsive browser QA are required before commit.

## Validation Result

- 405 repository tests passed, including the focused order-detail, dashboard, and existing Portal boundary suites.
- Lint, typecheck, and production build passed.
- Anonymous browser states were checked at `390x844` and `1440x900` with no horizontal overflow or console errors.
- The authenticated ready-state expansion is covered by the static contract suite; no Auth bypass or synthetic database write was used for browser QA.
