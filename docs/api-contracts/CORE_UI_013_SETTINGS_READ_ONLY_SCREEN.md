# CORE-UI-013 Settings Read-Only Screen

Status: IMPLEMENTED

## Purpose

Provide a read-only Admin Settings screen for the active organization. The screen exposes tenant profile, subscription, plan feature, entitlement, and usage-counter snapshots without enabling commercial or privileged writes.

## Route

- `/admin/settings`

## Permission Boundary

- Required read permission: `organization.settings.view`
- Optional edit signal: `organization.settings.edit`
- No direct mutation is exposed in this screen.
- Subscription plan changes, entitlement overrides, usage resets, and support tenant access remain owner/service/audit workflow gated.

## Data Sources

The server read model reads only public schema tables through the authenticated Supabase server-client boundary:

- `organizations`
- `organization_subscriptions`
- `plans`
- `features`
- `plan_features`
- `organization_entitlements`
- `subscription_usage`

Sensitive fields such as `config_json`, service-role credentials, Auth Admin data, and support grant scopes are not selected.

## Snapshot Limits

- Organization: active organization only
- Subscriptions: 25 latest
- Plan features: 200 latest matching active subscription plan IDs
- Entitlements: 200 latest
- Usage counters: 200 latest

## UI Contract

The page renders:

- Organization profile card
- Subscription table
- Entitlement table
- Usage counter table
- Plan feature cards
- Read boundary panel
- Blocked workflow panel
- Snapshot scope panel

## Supabase Boundary Notes

Supabase Data API access must remain backed by explicit grants and RLS policies before production exposure. Browser-facing reads must use the regular authenticated client boundary; service role and secret keys must never be exposed to the client.
