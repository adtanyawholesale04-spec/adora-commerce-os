# Migration 063 Phase 1D Promotion Evaluator Validation

**Date:** 2026-08-01
**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

## Migration File

- `20260731182133_phase_1d_promotion_evaluator.sql`

## Result

A fresh local Supabase reset replayed migrations `001` through the Phase 1D
Layer 2 promotion evaluator successfully. The focused promotion evaluator
suite, database lint, Supabase security/workflow/commerce integration suites,
Phase 1C Storefront suite and Phase 1D checkout-foundation suite passed.

Validated behavior includes:

- canonical same-tenant active variant pricing with a THB-only snapshot;
- deterministic percent, fixed-discount and fixed-unit-price arithmetic;
- quantity bounds, campaign/version effective time and UUID tie-break order;
- sequential stacking, non-stackable stop and exclusive-group first winner;
- exact action JSON and fixed-price mapping allowlists;
- fail-closed ambiguous versions, unsupported children and cross-tenant targets;
- minimum-selling-price, non-negative and maximum-benefit invariants;
- bounded snapshots excluding cost, margin, customer and raw promotion data;
- stable `SECURITY INVOKER` execution with empty search path;
- direct execution denied to `PUBLIC`, `anon`, `authenticated` and
  `service_role`; and
- no cart, order, coupon, payment, provider or Production mutation.

The migration has not been pushed to the production Supabase project.
