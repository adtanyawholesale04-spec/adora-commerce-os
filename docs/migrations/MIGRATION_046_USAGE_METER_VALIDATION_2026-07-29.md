# Migration 046 Usage Meter Boundary Validation

**Migration:** `20260728174238_usage_meter_boundary_046.sql`
**Status:** `VALIDATED`
**Date:** 2026-07-29
**Track:** Track B — Customer Engagement Platform

## Scope

- Idempotent seeds for 11 approved `METERED` feature codes and units.
- Service-role-only `api_record_usage_meter` for atomic period aggregate upsert.
- Audit-backed request idempotency and source attribution.
- Entitlement lookup with high-cost fail-closed behavior and quota rejection.
- Direct authenticated/public RPC and DML denial for usage and entitlement tables.
- Deterministic `subscription_usage_period_unique` constraint for the guarded upsert.

## Evidence

- Fresh local Supabase replay reached Migration 046 successfully.
- `npm run validate:usage-meter-boundary` passed.
- `npm run validate:supabase-security` passed.
- `npm run validate:supabase-workflows` passed, including usage meter boundary.
- `npm run validate:commerce-integration` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed: 58/58.

## Explicit Non-Scope

This migration does not add billing, provider settlement, usage event ledger, or Admin usage controls. Workflow integration and quota read-model design remain follow-up work.

## Next Gate

Integrate the guarded meter boundary with approved Track B service workflows, then review a read-only quota/usage model before enabling Admin controls.
