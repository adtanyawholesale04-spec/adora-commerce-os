# Phase 1D Part 3E Server Application Runtime Contract Review

**Task ID:** `PHASE-1D-CHECKOUT-PART3E-SERVER-RUNTIME-CONTRACT`
**Status:** OWNER FROZEN / R01-R24 APPROVED / IMPLEMENTED LOCALLY / PRODUCTION NOT APPLIED
**Prepared:** 2026-08-01
**Depends On:** Owner-frozen D01-D24, CO-BR-001 to CO-BR-044, C01-C24,
PE01-PE24, AC01-AC30, CP01-CP30 and locally validated Parts 3B-3D
**Migration:** None proposed
**Runtime Implementation:** Local-only implementation authorized and completed
**Payment Provider / Manual Payment:** Not included
**Production:** Not authorized; P16 remains mandatory

## Objective

Define the application boundary that may connect the authenticated Storefront
experience to the existing guarded cart and atomic checkout RPCs. The boundary
must preserve customer-session authorization, deterministic retries, controlled
results and the separately privileged `ORDER_PLACED` attribution handoff.

The contract-review step created no runtime or database object. The later
Owner-approved implementation added local-only Server Actions and feature
flags, but no provider call, database object or Production change.

## Pre-Implementation Repository Reconciliation

1. `src/app/store/actions.ts` currently owns preference cookies only. There is
   no protected cart or checkout Server Action.
2. `src/lib/storefront/service.ts` is a server-only public read boundary. It
   uses a secret client for published projections and must not become the
   authenticated checkout mutation client.
3. `src/lib/supabase/server.ts` creates the cookie-backed customer-session
   client required by the authenticated cart and checkout RPCs.
4. `src/lib/supabase/admin.ts` creates a secret client. Its use must remain
   confined to reviewed server-only service operations and must never replace
   the customer authorization enforced by `api_submit_storefront_checkout`.
5. Part 3D already provides `api_submit_storefront_checkout`; its matching
   retry returns the original order and its controlled reprice result creates
   no order, payment or inventory hold.
6. `api_record_attribution_event` accepts only `service_role`. Therefore
   `ORDER_PLACED` must occur after checkout commit through a separate adapter.
7. The canonical order is durable retry evidence if attribution fails. No new
   queue, checkout-session, order, payment, customer or attribution master is
   required for this runtime layer.

## Recommended Owner Decision Table

| ID | Topic | Recommended decision |
|---|---|---|
| R01 | Runtime scope | Limit Part 3E runtime to authenticated cart/checkout application services, Server Actions and post-commit `ORDER_PLACED` attribution; exclude manual payment, verification, provider, webhook and Production activation |
| R02 | Module ownership | Put typed orchestration in `src/lib/storefront/checkout.ts`, thin form adapters under the Storefront route, and the privileged attribution adapter in a distinct `server-only` module |
| R03 | Availability gate | Require `ACOS_STOREFRONT_CHECKOUT_ENABLED=true` and `ACOS_STOREFRONT_CHECKOUT_KILL_SWITCH!=true`; default disabled and fail closed when configuration is absent |
| R04 | Customer session | Execute cart/start/submit RPCs only with `createSupabaseServerClient()` so the database receives the authenticated customer JWT and performs canonical ownership checks |
| R05 | Service-role confinement | Never submit checkout with the secret client; allow the secret client only after a successful commit for canonical order lookup and `api_record_attribution_event` |
| R06 | Tenant resolution | Accept the route `organizationSlug` as navigation intent, resolve the canonical organization on the server, and never accept an organization UUID from browser form fields |
| R07 | Authentication preflight | Call `auth.getUser()` before mutation; return `auth_required` when no verified session exists and let every database tenant/membership/customer/entitlement check remain authoritative |
| R08 | Action input | Accept only cart ID, exactly one address source, optional coupon text and request ID; reject unknown address keys and never accept customer, totals, price, stock, promotion, payment or attribution values from the browser |
| R09 | Input normalization | Trim bounded text at the application edge for usability while preserving the database as final normalization and validation authority; never log address, phone or coupon text |
| R10 | Request ID lifecycle | Generate one UUID when a submit intent is created, retain it across transport retry, double click and matching resubmission, and never generate a replacement merely because the network response was lost |
| R11 | Reprice reconfirmation | On `CHECKOUT_REPRICE_REQUIRED`, refresh the canonical cart, require explicit customer confirmation and issue a new request ID for the newly confirmed commercial intent |
| R12 | In-progress behavior | Map `REQUEST_IN_PROGRESS` to a retryable pending result using the same request ID; disable duplicate submit while the current request is pending |
| R13 | Idempotency conflict | Map `IDEMPOTENCY_CONFLICT` to a terminal form error and require a new explicit submit intent; never silently replace the request ID inside the failed action |
| R14 | Controlled error catalog | Expose only allowlisted stable UI codes: `feature_disabled`, `auth_required`, `cart_not_found`, `cart_not_ready`, `address_required`, `address_invalid`, `coupon_invalid`, `coupon_unavailable`, `item_unavailable`, `promotion_unavailable`, `checkout_reprice_required`, `request_in_progress`, `request_conflict`, and `persistence_error` |
| R15 | Error privacy | Collapse authorization, foreign-tenant and unknown-resource failures into non-enumerating results; retain raw database text only in sanitized server diagnostics |
| R16 | Success parser | Strictly parse the AC27 response allowlist and reject malformed success payloads; never return address, phone, coupon text, warehouse slices, cost, internal error or secret fields to the client |
| R17 | Success navigation | After a valid order result, revalidate only the affected Storefront cart/order surfaces and navigate to an authenticated same-tenant order confirmation route; never place private order data in the URL |
| R18 | Attribution source | Resolve organization, customer, order, currency, amount and occurred time from the committed canonical order; browser values and the checkout response are not attribution authority |
| R19 | Attribution identity | Record `ORDER_PLACED` with the canonical customer ID and order ID, `source=STOREFRONT`, bounded currency/amount metadata, and no address, phone, email, coupon, proof or provider payload |
| R20 | Derived attribution request | Derive a stable UUID from a versioned domain separator plus organization ID and order ID; retries for the same order reuse it and another event/order cannot share it |
| R21 | Post-commit failure | Attribution failure never rolls back or compensates valid checkout truth and never invokes `api_compensate_storefront_checkout`; return checkout success with an internal retryable attribution state |
| R22 | Attribution retry | Retry after a matching checkout retry and through a server-only reconciliation function that scans canonical Storefront orders missing `ORDER_PLACED`; the order remains the durable source and no new queue is introduced |
| R23 | Observability | Log only action code, sanitized result code, request ID, organization/order opaque IDs and attribution retry state; exclude contact, address, coupon, auth token, secret and raw RPC payloads |
| R24 | Delivery gate | After Owner freeze, implement local-only typed services/actions and tests behind disabled flags; migration, manual payment, provider, public activation and Production apply require separate authorization |

## Owner Decision Freeze

On 2026-08-01, the Project Owner approved the recommended values for R01-R24
in full. This freezes the customer-session, feature-flag, idempotency,
controlled-error, service-role isolation, post-commit attribution, retry,
privacy and delivery contracts.

The approval authorized the local-only implementation described by R24. It did
not authorize manual payment, a provider, public activation, a scheduler,
Production migration apply or P16 closure.

## Proposed Application Flow

```text
authenticated Storefront form
  -> thin Server Action validates shape and stable request ID
  -> resolve canonical organization from route slug
  -> cookie-backed Supabase customer client
  -> guarded cart/start/submit RPC
  -> strict controlled-result parser
  -> committed order success
  -> separate server-only attribution adapter
  -> api_record_attribution_event(ORDER_PLACED)
  -> success navigation
```

The checkout RPC and attribution RPC deliberately use different clients and
different authorization boundaries. A secret client must never be passed into
the customer mutation service as a convenience fallback.

## Runtime Result Contract

The approved application service returns a discriminated union:

```text
success:
  ok=true
  code=checkout_submitted
  orderId, orderNumber, paymentId
  orderStatus, currencyCode, persisted totals
  reservedUntil, paymentDueAt, idempotencyReused
  attributionState=recorded|retry_pending

controlled failure:
  ok=false
  one allowlisted code from R14
  retryable=true only for request_in_progress or persistence_error
```

`attributionState` is server workflow state. It must not be presented as a
checkout failure and must not expose service-role or internal event details.

## Post-Commit Attribution Reconciliation

The canonical order, not an in-memory promise, is the recovery source. The
local runtime provides an idempotent server-only operation that:

1. selects a bounded page of `STOREFRONT` orders;
2. excludes orders already linked to an `ORDER_PLACED` attribution event;
3. derives the R20 request ID from canonical organization/order identity;
4. calls the existing guarded attribution RPC;
5. treats `idempotency_reused` as success; and
6. records only sanitized retry diagnostics.

Part 3E does not authorize a scheduler, external queue or Production worker.

## Validation Matrix

1. feature flag defaults disabled and kill switch wins;
2. anonymous and expired-session submissions fail before mutation;
3. secret client is absent from customer checkout submission;
4. route slug resolves tenant server-side and form organization IDs are ignored;
5. exact input/address allowlists and size boundaries;
6. same request ID survives double click and lost-response retry;
7. reprice confirmation requires a fresh explicit request ID;
8. controlled errors cannot enumerate foreign tenant resources;
9. malformed or overbroad RPC responses fail closed;
10. checkout success is retained when attribution fails;
11. attribution receives canonical order/customer identity only;
12. deterministic attribution request IDs are stable and domain-separated;
13. repeated handoff creates one attribution event;
14. reconciliation finds missing events without duplicating existing events;
15. logs and client results contain no private address/contact/coupon/token data;
16. no manual payment/provider/Production path becomes reachable; and
17. lint, typecheck, tests and build pass.

## Implementation Reconciliation

The approved local implementation now includes:

1. `src/lib/storefront/checkout.ts`, a typed, disabled-by-default service that
   uses the cookie-backed customer client for canonical tenant resolution and
   guarded cart/checkout RPC execution;
2. `src/lib/storefront/checkout-attribution.ts`, a separate `server-only`
   secret boundary for canonical order lookup, deterministic UUID v5 request
   derivation, `ORDER_PLACED` recording and bounded reconciliation;
3. thin Storefront Server Actions that parse form intent, preserve caller
   request IDs and revalidate only a normalized Storefront path; and
4. source/contract tests plus lint, typecheck and build gates.

The runtime flags remain disabled in `.env.example`; no current UI invokes the
actions and no database migration was added by Part 3E.

## Remaining Blocked Gates

The following remain separately blocked:

- manual payment proof and staff verification boundaries;
- payment provider selection, credentials, webhook and network calls;
- scheduler/worker deployment;
- Production migration apply and public Storefront checkout activation; and
- P16 recovery closure.

## Review Outcome

The repository now contains the Owner-frozen, local, disabled-by-default Part
3E application runtime without a new migration or duplicate commerce source.
Customer mutations retain the authenticated JWT, service-role use stays
post-commit, and attribution failure cannot invalidate commerce truth.
