# Phase 1D Manual Payment Part 3D-A1 Guarded Payment Snapshot Contract Review

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART3D-A1-SNAPSHOT-CONTRACT`
**Status:** CONTRACT REVIEW COMPLETE / MR01-MR24 OWNER DECISIONS REQUIRED / IMPLEMENTATION BLOCKED
**Prepared:** 2026-08-01
**Depends On:** Owner-frozen MU01-MU24, CO-BR-001 through CO-BR-044 and locally validated Manual Payment Part 3A
**Migration:** Not created or authorized
**Runtime / UI / Production:** Not created or authorized

## Objective

Define one authenticated, customer-owned and privacy-bounded database read
boundary for the Storefront manual-payment page. The boundary must prove the
same tenant, identity, entitlement, order and payment authority used by the
existing submission RPC while returning only the MU04 snapshot required by the
future UI.

This review creates no SQL function, migration, table, index, policy, grant,
service, route, component, event, audit record, ledger entry or Production
change.

## Repository Reconciliation

1. `orders`, `payments`, `payment_transactions` and `payment_proofs` remain the
   canonical Commerce Core and Manual Payment sources.
2. `customer_profile_links` is the approved ownership association between an
   active profile and the canonical active customer.
3. `api_submit_storefront_payment_proof` already proves active authentication,
   profile, membership, customer link, Storefront publication, checkout
   settings, `storefront.checkout` entitlement, order ownership and canonical
   payment consistency before mutation.
4. `api_get_customer_portal_snapshot` is intentionally broader than this page:
   it returns customer, address, order-item, loyalty, coupon and consent data.
   It must not be reused or trimmed in the browser for this payment surface.
5. Direct `orders` reads use staff permission `order.view`; customer ownership
   must not inherit or weaken that staff RLS policy.
6. Existing composite keys and pending-payment indexes support the proposed
   point lookup. No new table or index is currently indicated.

## Recommended Owner Decision Table

| ID | Topic | Recommended decision |
|---|---|---|
| MR01 | Scope | Add exactly one read-only authenticated RPC for one customer-owned Storefront order payment snapshot; exclude lists, order items, addresses, bank instructions, mutation, staff review, settlement, Storage and Production |
| MR02 | Function | Name the candidate `public.api_get_storefront_order_payment_snapshot(uuid,uuid)` with inputs `p_organization_id` and `p_order_id` only, matching frozen MU03 |
| MR03 | Organization authority | The future server service resolves the route slug to canonical organization ID; the database still validates that exact organization and never treats the browser value as authority |
| MR04 | Authentication | Require `auth.uid()`, one active `profiles` row and one active same-tenant `organization_memberships` row; controlled denial codes are `AUTH_REQUIRED` and `MEMBERSHIP_REQUIRED` |
| MR05 | Customer ownership | Resolve one active `customer_profile_links` row for the active profile and one same-tenant `customers.status = ACTIVE` row; never follow or repair merged customer identity inside this read |
| MR06 | Storefront gate | Require active organization, published `organization_storefronts`, active THB `organization_checkout_settings` and active boolean `storefront.checkout` entitlement at database time |
| MR07 | Order ownership | Match organization ID, order ID, resolved customer ID and `orders.source = STOREFRONT`; the order UUID is navigation only and cannot grant access |
| MR08 | Non-enumeration | Missing, other-customer, other-tenant, non-Storefront and draft orders all return exactly `{"available":false}` after caller context is valid, without revealing which ownership check failed |
| MR09 | Payment invariant | Require exactly one same-tenant `payments` row for the order and internally verify currency and aggregate consistency; inconsistent canonical state returns controlled `PAYMENT_STATE_INCONSISTENT` without partial data |
| MR10 | Exact success envelope | Return only `available` and one `order` object plus one `pending_attempt` object; reject additions unless a later Owner-approved contract widens the allowlist |
| MR11 | Exact order fields | The order object contains only `id`, `order_number`, `order_status`, `payment_status`, `fulfillment_status`, `currency_code`, `grand_total`, `amount_due` and `payment_due_at` |
| MR12 | Pending attempt fields | The pending-attempt object contains only `exists` and `proof_status`; expose no transaction ID, proof ID, reference, submitted time, reviewer or metadata |
| MR13 | Pending derivation | `exists` is true only for the canonical same-tenant pending BANK_TRANSFER payment transaction with its pending reference-only customer proof; `proof_status` is `PENDING` or null only |
| MR14 | Eligibility authority | The RPC returns canonical facts and does not claim payment success; the server service derives form eligibility from frozen MU05 while the submit RPC rechecks every mutation invariant |
| MR15 | Deadline truth | Return the stored canonical `payment_due_at` unchanged; do not persist a viewed/expired state and do not use a browser clock as authority |
| MR16 | Financial representation | Serialize monetary values as fixed two-decimal strings to avoid JSON floating-point ambiguity; never expose cost, margin, discount internals or provider fees |
| MR17 | Privacy | Exclude customer/profile IDs, contact, address, order items, bank reference, provider, proof path, MIME type, metadata, audit, idempotency and internal timestamps |
| MR18 | Execution posture | Implement as `STABLE SECURITY DEFINER` with `SET search_path = ''`, fully qualified objects and no dynamic SQL; privileged execution exists only to cross staff-only table RLS after explicit ownership proof |
| MR19 | Grants | Revoke execution from `PUBLIC`, `anon`, `authenticated` and `service_role`, then grant the exact signature only to `authenticated`; source-table grants and RLS policies remain unchanged |
| MR20 | Write evidence | A successful snapshot creates no event, audit, ledger, consent, idempotency or status row because it is a bounded customer-owned read; security and access evidence is supplied by validation, platform logs and existing Auth context |
| MR21 | Failure contract | Expose only `AUTH_REQUIRED`, `MEMBERSHIP_REQUIRED`, `CUSTOMER_LINK_REQUIRED`, `CHECKOUT_NOT_ENABLED`, `PAYMENT_STATE_INCONSISTENT` and the non-enumerating unavailable envelope; collapse unexpected database text to `PAYMENT_SNAPSHOT_FAILED` |
| MR22 | Concurrency | Use one statement snapshot with no row/advisory locks; a concurrent submit or expiry may make the result stale, so the future service/UI refreshes after action and the mutation boundary remains final authority |
| MR23 | Migration shape | After separate Owner approval, create one CLI-timestamped forward-only migration containing dependency preflight, the function, exact revoke/grant and comment only; add no table, column, index, policy, seed or data repair |
| MR24 | Delivery gate | After MR01-MR24 freeze, request explicit migration authorization, then run fresh replay, focused security/shape/concurrency validation, database lint and full regressions before Part 3D-B service/UI work |

## Proposed Result Contract

```json
{
  "available": true,
  "order": {
    "id": "uuid",
    "order_number": "string",
    "order_status": "PENDING_CONFIRMATION",
    "payment_status": "UNPAID",
    "fulfillment_status": "UNFULFILLED",
    "currency_code": "THB",
    "grand_total": "1000.00",
    "amount_due": "1000.00",
    "payment_due_at": "timestamptz"
  },
  "pending_attempt": {
    "exists": false,
    "proof_status": null
  }
}
```

Unavailable resources return only:

```json
{"available": false}
```

The example is a contract shape, not fixture data and not an implemented API.

## Candidate Validation Matrix

1. fresh migration replay and dependency preflight;
2. `anon` and unauthenticated calls denied;
3. inactive profile, membership, link and customer denied;
4. inactive/unpublished Storefront, settings and entitlement denied;
5. owned eligible order returns the exact success-key allowlist;
6. other customer, other tenant, missing, draft and non-Storefront order return
   the same unavailable envelope;
7. inconsistent payment aggregate returns only the controlled failure;
8. pending reference-only attempt returns boolean/proof status without IDs or
   reference data;
9. succeeded, failed, cancelled and reversed attempts are not exposed as
   pending;
10. no contact, address, line item, reference, provider, proof, metadata,
    internal timestamp, cost or audit field appears in result JSON;
11. exact `SECURITY DEFINER`, empty search path, volatility and grants verified;
12. direct table reads/writes and existing staff RLS posture remain unchanged;
13. concurrent snapshot versus submission/expiry produces no lock or mutation
    and subsequent refresh returns canonical committed truth;
14. database lint, Supabase security/workflow, Commerce, Storefront, checkout
    and Manual Payment regressions pass; and
15. lint, typecheck, static tests and build pass.

## Explicit Non-Scope

- migration generation or application;
- server read service, route or UI;
- bank account, recipient, QR or fee configuration;
- payment reference or proof redisplay;
- private binary proof Storage;
- staff review, settlement, refund or reconciliation;
- analytics, event, audit, ledger or consent writes; and
- Production preflight, apply, rollout or activation.

## Review Outcome

The repository can support the future payment page with one narrow guarded
read function and no new source of truth. MR01-MR24 keep customer ownership
inside the database, preserve staff RLS, return only the MU04 facts and stop
before every migration, runtime, UI and Production boundary.
