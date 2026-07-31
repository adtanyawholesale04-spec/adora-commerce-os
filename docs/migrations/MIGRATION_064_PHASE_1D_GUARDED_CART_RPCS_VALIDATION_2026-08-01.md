# Migration 064 Phase 1D Guarded Cart RPC Validation

**Date:** 2026-08-01
**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

## Migration File

- `20260731183955_phase_1d_guarded_cart_rpcs.sql`

## Result

A fresh local Supabase reset replayed migrations `001` through the Phase 1D
Part 3C guarded cart boundary successfully on PostgreSQL 17. The focused SQL
suite, eight-connection concurrency gate and database lint passed.

Validated behavior includes:

- authenticated active profile, membership and customer-link ownership;
- active organization, published Storefront, checkout settings and entitlement;
- stale cart expiry and one active Storefront cart under concurrent resolve;
- exact request hashing, successful retry and conflicting-intent rejection;
- direct browser mutation denial and internal helper execution denial;
- positive bounded quantities with no clamp or partial fulfillment;
- same-tenant visible product/variant checks and active-warehouse stock only;
- deterministic promotion-aware full-cart pricing and THB totals;
- missing-item removal no-op and `OPEN -> READY` checkout start;
- exactly one bounded `checkout_started` event under retry;
- response, event and pricing snapshot privacy allowlists; and
- no inventory reservation, coupon redemption, order, payment or provider work.

Regression gates cover the promotion evaluator, checkout foundation, Phase 1C
Storefront, Supabase security/workflows, Commerce integration, Node tests,
lint, typecheck and production build.

The migration has not been pushed to the production Supabase project.
