# ACOS Production Preflight 2026-08-01

**Status:** LOCAL REPLAY VALIDATED / PRODUCTION APPLY BLOCKED

## Scope

This preflight inspected repository, local Supabase and linked Production
metadata. Part 1 then reset only the local Supabase database and replayed all
committed migrations. No Production migration, data, Edge Function, Vercel
connection or public feature was changed.

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
local migrations applied after clean replay: 97 / 97
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

No Production migration was applied, repaired or pulled. No historical
migration file was edited.

## Part 1 Local Replay Evidence

```text
target: Supabase local stack only
reset: PASS / destructive local QA data cleared
replay: PASS / all 97 repository migrations applied
local migration history: PASS / every repository migration recorded
Production write: NONE
```

The approved `supabase db reset --local` completed successfully on the local
stack. The replay included the latest Phase 1C and Phase 1D migrations. The
local database restarted cleanly after replay.

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
Phase 1D checkout foundation after clean replay: PASS
Phase 1D manual-payment schema/concurrency: PASS
Phase 1D customer submission/races: PASS
Phase 1D guarded payment snapshot/concurrency: PASS
Phase 1D staff review reads: PASS
Phase 1D staff review actions/race: PASS
```

The earlier local-only checkout entitlement contamination was removed by the
approved reset. The checkout migration-origin gate and carrier webhook E2E
both pass after the clean replay. Production still has zero deployed Edge
Functions, so carrier deployment remains a separately closed release scope.

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
2. Forward-fix or explicit acceptance of the existing Fulfillment lint warning.
3. Vercel project link and secret-name-only Production environment inventory.
4. A migration change window, rollback target and post-apply validation plan.

This report does not authorize `supabase db push`, migration repair, Production
data changes, Vercel deployment, provider activation or public traffic.

## Recommended Next Gate

`OWNER PREFLIGHT BLOCKER DISPOSITION`

The local replay gate is complete. The next decision is Owner disposition of
P16 recovery, the existing lint warning, Vercel environment readiness and the
Production migration change window before any apply approval.
