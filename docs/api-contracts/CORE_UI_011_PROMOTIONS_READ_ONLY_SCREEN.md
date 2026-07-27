# CORE-UI-011 Promotions Read-Only Screen

Status: IMPLEMENTED

## Scope

`/admin/promotions` provides a read-only Promotions workspace for campaign definitions, versions, rules, actions, coupon/trigger code surfaces, and applied benefit snapshots.

## Permission Boundary

- Required read permission: `promotion.view`
- Optional boundary indicators:
  - `promotion.create`
  - `promotion.publish`
  - `order.view` for readable order labels on applied benefits

This screen does not create, edit, publish, validate, simulate, evaluate, reserve, consume, release, or rewrite promotion records.

## Read Model

Server read model: `src/lib/admin/promotions.ts`

Tables read through Supabase server client and tenant RLS:

- `promotion_campaigns`
- `promotion_campaign_versions`
- `promotion_rules`
- `promotion_actions`
- `coupons`
- `promotion_trigger_codes`
- `promotion_applied_benefits`
- `orders` only when the active membership has `order.view`

The first UI read intentionally excludes raw rule/action `value_json` and applied benefit `snapshot_json`.

## Snapshot Limits

- Campaigns: latest 75
- Versions: latest 150 for visible campaigns
- Rules/actions: latest 200 for visible versions
- Coupons/trigger codes: latest 150 for visible versions
- Applied benefits: latest 150 for visible campaigns

## Guarded Workflows

The following remain blocked from this screen:

- Promotion create/edit
- Promotion publish/validate
- Rule builder persistence
- Preview/simulator
- Checkout evaluation
- Coupon redemption lifecycle mutations
- Applied benefit historical rewrite

These require service contracts and the production promotion engine.

## Supabase Security Notes

Supabase API access is controlled by database grants plus RLS policies. This screen relies on existing authenticated server-side Supabase access, tenant-scoped RLS, and the Admin shell permission context before issuing reads.

References:

- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
