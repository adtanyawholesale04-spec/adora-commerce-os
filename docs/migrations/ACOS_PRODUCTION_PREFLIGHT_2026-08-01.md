# ACOS Production Preflight 2026-08-01

**Status:** PREPARED / READ-ONLY EVIDENCE COMPLETE / PRODUCTION APPLY BLOCKED

## Scope

This preflight inspected repository, local Supabase and linked Production
metadata without applying migrations, changing data, deploying an Edge
Function, connecting Vercel or enabling a public feature.

## Production Identity

```text
project: ACOS Production
project ref: pirewyrhddrhmtiwmlaw
region: ap-northeast-1 (Tokyo)
health: ACTIVE_HEALTHY
Postgres: 17
linked project: VERIFIED
```

The separate `ADORA-Project` in Singapore is not linked to this repository and
was not queried beyond project-list metadata.

## Migration Evidence

```text
repository migration files: 97
duplicate migration versions: 0
local migrations applied: 97
Production migrations applied: 86
Production pending migrations: 11
remote-only migration drift: 0
dry-run: PASS / NO WRITE
```

The linked Production history matches the repository through
`20260729184744_reconcile_extensions_and_profiles_rls_initplan.sql`.
The dry-run would apply these files in order:

1. `20260730194013_phase_1c_storefront_boundary.sql`
2. `20260730194153_phase_1c_storefront_guarded_functions.sql`
3. `20260731172908_phase_1d_checkout_foundation.sql`
4. `20260731182133_phase_1d_promotion_evaluator.sql`
5. `20260731183955_phase_1d_guarded_cart_rpcs.sql`
6. `20260731195612_phase_1d_atomic_checkout_layer3.sql`
7. `20260731220202_phase_1d_manual_payment_additive_schema.sql`
8. `20260801023901_phase_1d_manual_payment_customer_submission_boundary.sql`
9. `20260801054812_phase_1d_manual_payment_guarded_payment_snapshot.sql`
10. `20260801103336_phase_1d_manual_payment_staff_review_reads.sql`
11. `20260801105844_phase_1d_manual_payment_staff_review_actions.sql`

No migration was applied, repaired, pulled or edited during this preflight.

## Security And Compatibility Evidence

- Production and local database lint both report one existing warning in
  `public.api_assign_fulfillment`: an audit JSON text value is assigned to a
  UUID output variable without an explicit cast.
- The Fulfillment assignment functional and permission suites pass, and the
  warning is already present in Production. It is not introduced by the 11
  pending migrations. Any correction must use a new forward-only migration.
- Local `supabase/config.toml` uses Postgres 17, matching Production.
- The repository does not pin extension versions, so the announced Supabase
  extension-version deprecation does not require a migration rewrite.
- Data API auto-exposure is not enabled in local configuration. Pending
  boundaries use explicit grants, RLS and guarded functions rather than
  relying on automatic table exposure.
- Production currently reports zero deployed Edge Functions. Carrier webhook
  deployment and secrets remain closed.

## Validation Evidence

```text
repository tests: 391 / 391 PASS
lint: PASS
typecheck: PASS
production build: PASS with network access
Supabase security suite: PASS
Commerce integration: PASS
Phase 1B signup rate-limit functional/concurrency: PASS
Phase 1C Storefront boundary: PASS
Phase 1D promotion evaluator: PASS
Phase 1D guarded cart functional/concurrency: PASS
Phase 1D atomic checkout/coupon race: PASS
Phase 1D manual-payment schema/concurrency: PASS
Phase 1D customer submission/races: PASS
Phase 1D guarded payment snapshot/concurrency: PASS
Phase 1D staff review reads: PASS
Phase 1D staff review actions/race: PASS
```

Two local validation gates remain unresolved:

1. Carrier webhook E2E was unstable across two bounded attempts. One run
   reached Flash and Kerry before J&T returned HTTP 502; the second run did
   not load the local provider secret before the 30-second timeout. No
   Production function is deployed.
2. Checkout foundation validation found the local-only QA checkout
   entitlement created for browser testing. Its migration-origin assertion
   requires a clean local reset/replay; the schema itself and downstream
   Phase 1D suites passed.

## Environment And Deployment Evidence

- `.env.example` remains secret-free and all risky feature flags default to
  disabled with kill switches enabled.
- `.env.local` is ignored by Git and contains only local runtime values. It is
  not Production evidence.
- No local `.vercel/project.json` exists, so a Vercel project and Production
  environment inventory cannot yet be verified from this workspace.
- The CLI session warned that `SUPABASE_AUTH_CAPTCHA_SECRET` was unset. The
  frozen design stores the Turnstile secret in Supabase Auth, but any future
  config deployment must provide its required substitution without exposing
  the value.
- Production environment values, Resend runtime credentials and carrier
  webhook secrets were not read or changed.

## Recovery Gate

P16 remains an active Production blocker. The commerce-core logical restore
drill passed, but recurring restorable backup and compatible managed
Auth/Storage recovery are still unproven. ACOS Production remains on the Free
plan without a verified recurring provider-managed recovery set.

## Blocking Disposition

Production migration apply is **BLOCKED** until the Owner separately approves
and closes or accepts all of the following:

1. P16 recurring backup plus managed Auth/Storage recovery disposition.
2. Clean local reset/replay and complete regression rerun.
3. Forward-fix or explicit acceptance of the existing Fulfillment lint warning.
4. Carrier Edge Runtime stability if carrier deployment is included in the
   release scope.
5. Vercel project link and secret-name-only Production environment inventory.
6. A migration change window, rollback target and post-apply validation plan.

This report does not authorize `supabase db push`, migration repair, Production
data changes, Vercel deployment, provider activation or public traffic.

## Recommended Next Gate

`OWNER PREFLIGHT BLOCKER DISPOSITION`

Resolve the clean local replay first because it is zero-provider-cost and
produces the final database evidence needed before deciding on backup spend or
Production application.
