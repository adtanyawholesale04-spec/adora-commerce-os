# SUPABASE_MIGRATION_V1

Foundation package created from `DATABASE_SCHEMA_V1_FROZEN_V2.md`.

## Included
001–008 cover:
- extensions/helpers
- organizations/auth/memberships/invitations
- roles/permissions
- SaaS subscriptions/entitlements
- integration foundation
- product catalog
- variant options/tags/promotion classes
- contextual sale codes

RLS is intentionally deferred until the schema objects are complete.
Transaction RPCs and append-only triggers are added in later migrations.

## Important deferred references
`008_sale_codes.sql` contains UUID columns for `live_session_id` and `purchase_session_id`.
Their foreign keys are deliberately added later, after those tables exist.

## Suggested validation
Run the migrations against a fresh Supabase development database before applying them to production.
