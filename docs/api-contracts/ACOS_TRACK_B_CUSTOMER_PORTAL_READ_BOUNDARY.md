# Track B Customer Portal Read Boundary

**Status:** IMPLEMENTED / VALIDATED  
**Migration:** `20260728195007_customer_portal_read_snapshot_boundary.sql`  
**RPC:** `public.api_get_customer_portal_snapshot(uuid, uuid)`

## Boundary

The portal is authenticated and read-only. The server derives `profile_id` from `auth.uid()` and resolves the customer only through an `ACTIVE` row in `customer_profile_links` for the requested organization. A browser-supplied `customer_id` is never accepted as authority.

The snapshot reuses existing Commerce Core sources: customer profile, active addresses, non-draft orders and items, loyalty accounts and transactions, customer-targeted active coupons, and customer consent state. It does not create duplicate customer, order, payment, wallet, or loyalty sources.

## Security Contract

- `authenticated` execution only; `public` and `anon` execution revoked.
- Active organization membership is required.
- Cross-tenant and unlinked profiles receive controlled denial or an unavailable state without private rows.
- Source tables remain protected by existing tenant RLS and browser grants.
- Every available snapshot records an append-only `CUSTOMER_PORTAL_READ` audit event with optional request id.
- No write, mutation, consent change, notification mark-read, coupon redemption, or payment operation is exposed.

## Validation

Migration 054 validation covers linked-customer scope, order/item projection, audit recording, direct source-table RLS denial, cross-tenant denial, and anonymous execution denial. The focused suite, Supabase security suite, workflow suite, and migration replay passed on 2026-07-29.
