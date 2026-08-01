# Phase 1D Manual Payment Part 3B Customer Submission Service Contract Review

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART3B-SERVICE-CONTRACT`
**Status:** OWNER APPROVED / MS01-MS24 FROZEN / IMPLEMENTATION NOT AUTHORIZED
**Prepared:** 2026-08-01
**Depends On:** Owner-frozen PS01-PS24, AS01-AS24 and locally validated Part 3A customer submission RPC
**Migration:** None proposed
**Runtime Implementation:** Not authorized and not created
**UI / Storage / Production:** Not authorized

## Objective

Define the application boundary that may later connect an authenticated
Storefront order surface to `api_submit_storefront_payment_proof`. The service
must preserve the customer JWT, canonical tenant and payment authority,
deterministic retry, privacy-safe errors and the reference-only evidence model.

This review creates no Server Action, service module, feature flag, UI, Storage
object, database object or Production change. The Project Owner froze
MS01-MS24 on 2026-08-01; Part 3C implementation remains separately gated.

## Repository Reconciliation

1. `src/lib/storefront/checkout.ts` already establishes the approved pattern:
   a `server-only` typed service uses `createSupabaseServerClient()` and never
   substitutes the secret client for a customer mutation.
2. `src/app/store/actions.ts` already owns thin Server Actions for guarded cart
   and checkout operations. It contains no manual-payment action.
3. `src/lib/supabase/server.ts` supplies the cookie-backed customer session and
   is the only approved client candidate for the submission RPC.
4. Part 3A provides
   `api_submit_storefront_payment_proof(uuid,uuid,text,uuid)` to authenticated
   callers. The RPC derives customer, payment, amount, currency and lifecycle
   state from canonical records.
5. Part 3A returns a bounded reference-only result and never settles payment,
   marks an order paid, verifies evidence or stores binary proof.
6. No new customer, order, payment, transaction, proof or idempotency source is
   required by this service layer.

## Recommended Owner Decision Table

| ID | Topic | Recommended decision |
|---|---|---|
| MS01 | Runtime scope | Limit Part 3C to a disabled-by-default authenticated Storefront submission service and thin Server Action for the existing reference-only RPC; exclude staff review, settlement, provider, Storage, UI activation and Production |
| MS02 | Module ownership | Put typed orchestration in `src/lib/storefront/manual-payment.ts` and the thin form adapter in `src/app/store/actions.ts`; do not mix it into the public read service or privileged admin client |
| MS03 | Availability gate | Require `ACOS_STOREFRONT_MANUAL_PAYMENT_ENABLED=true` and `ACOS_STOREFRONT_MANUAL_PAYMENT_KILL_SWITCH!=true`; default disabled and fail closed when absent |
| MS04 | Customer session | Execute the RPC only with `createSupabaseServerClient()` so the authenticated customer JWT reaches the database; never use `createSupabaseSecretClient()` or service role |
| MS05 | Authentication preflight | Call `auth.getUser()` before mutation and return `auth_required` without invoking the RPC when no verified session exists; database identity and ownership checks remain authoritative |
| MS06 | Tenant resolution | Accept `organizationSlug` only as route intent, resolve the canonical active organization on the server and never trust a browser-supplied organization UUID |
| MS07 | Exact action input | Accept only `organizationSlug`, `orderId`, `paymentReference` and `requestId`; reject or ignore every customer, payment, amount, currency, status, method, proof, Storage and provider field |
| MS08 | Input normalization | Validate UUID shape, trim the reference for usability and enforce the same 6-100 character `[A-Z0-9._/-]` catalog before RPC; the database remains final normalization authority |
| MS09 | Sensitive reference handling | Submit reference through a POST Server Action body only; never put it in URL, cookie, analytics, client telemetry or logs and never return it in success or failure payloads |
| MS10 | Request ID lifecycle | Create one UUID per explicit customer submit intent and preserve it across double click, lost-response retry and matching resubmission; never replace it automatically after a transport failure |
| MS11 | RPC ownership | Call only `api_submit_storefront_payment_proof` with canonical organization ID plus order ID, normalized reference and stable request ID; no direct table write is allowed |
| MS12 | Result shape | Return a discriminated union with `ok`, stable code and only the bounded Part 3A identifiers/status/deadline/idempotency fields; reject malformed or overbroad RPC data |
| MS13 | Success code | Map a valid result to `payment_proof_submitted`; expose no reference, amount, customer, membership, audit, metadata, token, secret or internal database field |
| MS14 | Controlled error catalog | Expose only `feature_disabled`, `auth_required`, `payment_reference_invalid`, `order_not_payable`, `payment_expired`, `payment_reference_conflict`, `payment_attempt_pending`, `request_conflict` and `persistence_error` |
| MS15 | Privacy mapping | Collapse membership, customer-link, checkout-entitlement, foreign-tenant, foreign-customer and unknown-order failures into non-enumerating `order_not_payable`; do not expose raw database text |
| MS16 | Localization ownership | Return stable machine codes only; Thai/English copy belongs to the later Storefront UI dictionary and must not be embedded in the service or database |
| MS17 | Retry classification | Mark only `persistence_error` as transport-retryable with the same request ID; matching idempotent success is success, while reference conflict, pending attempt, expiry and request conflict require explicit customer resolution |
| MS18 | Double-submit control | The later UI disables submit while pending, but correctness remains in database idempotency and uniqueness; the service must not rely on browser state for concurrency safety |
| MS19 | Success revalidation | After strict success parsing, revalidate only the normalized same-tenant Storefront order surface; never place private order or payment data in a redirect URL |
| MS20 | Diagnostics | Permit only operation name, controlled code, request ID and opaque organization/order IDs in sanitized server diagnostics; exclude reference, contact, auth token, raw RPC data and database error text |
| MS21 | Binary proof boundary | Do not accept files, MIME type, bucket, object path or signed URL; private binary proof remains a separately reviewed Storage phase |
| MS22 | Settlement isolation | Do not verify/reject evidence, mutate paid/order/fulfillment state, allocate stock, consume coupons, call a provider or emit settlement events; Part 3A audit remains authoritative for submission |
| MS23 | Validation matrix | Require source contract, unit tests with injected customer client, auth/tenant/input/error/parser/retry/privacy tests, existing static suite, lint, typecheck and build before Part 3C can be locally complete |
| MS24 | Delivery gate | Owner freeze is required before Part 3C runtime work; migration, UI enablement, Storage, staff verification, public activation and Production each require separate authorization |

## Owner Decision Freeze

On 2026-08-01, the Project Owner approved the recommended values for
MS01-MS24 in full. This freezes the customer-session, canonical tenant,
input/output allowlist, feature-gate, idempotency, controlled-error, privacy,
retry, revalidation and delivery contracts.

The approval freezes the contract only. It does not itself authorize Part 3C
runtime implementation, a migration, UI enablement, private proof Storage,
staff verification, settlement, provider integration, public activation or
Production changes.

## Proposed Application Flow

```text
authenticated Storefront order form
  -> thin Server Action parses exact allowlisted fields
  -> disabled-by-default manual-payment service
  -> auth.getUser() with cookie-backed customer client
  -> resolve organization from route slug
  -> api_submit_storefront_payment_proof
  -> strict result parser and controlled error mapping
  -> same-tenant order surface revalidation
```

The customer JWT is part of the authorization boundary. A service-role client
must never be used as a fallback because that would bypass the ownership and
tenant checks frozen in PS01-PS24 and implemented by Part 3A.

## Proposed Typed Contract

```text
input:
  organizationSlug: string
  orderId: UUID
  paymentReference: string
  requestId: UUID

success:
  ok=true
  code=payment_proof_submitted
  orderId, paymentId, paymentTransactionId, paymentProofId
  transactionStatus=PENDING
  proofStatus=PENDING
  evidenceType=REFERENCE_ONLY
  paymentDueAt
  idempotencyReused

controlled failure:
  ok=false
  one allowlisted code from MS14
  retryable=true only for persistence_error
```

No result includes the bank reference. The client does not provide or receive
canonical amount, currency, customer identity or payment state authority.

## Error Mapping

| Database/application condition | Public service code | Retry posture |
|---|---|---|
| Feature disabled or kill switch active | `feature_disabled` | No automatic retry |
| Missing/expired customer session | `auth_required` | Re-authenticate |
| Invalid reference shape | `payment_reference_invalid` | Customer correction |
| Membership/customer-link/entitlement/foreign or unknown order | `order_not_payable` | No automatic retry |
| Order deadline elapsed | `payment_expired` | No retry |
| Reference belongs to another payment | `payment_reference_conflict` | Customer correction/support |
| Existing pending attempt for the order | `payment_attempt_pending` | Show existing pending state |
| Reused request ID with different intent | `request_conflict` | New explicit intent only |
| Transport, malformed response or unclassified persistence failure | `persistence_error` | Retry same request ID |

## Validation Matrix

1. feature flag defaults disabled and kill switch wins;
2. anonymous sessions never invoke the RPC;
3. the secret client is absent from the customer submission path;
4. route slug resolves the tenant server-side;
5. exact input allowlist excludes amount, payment and proof authority;
6. reference and UUID validation are bounded and fail closed;
7. stable request ID survives matching retry;
8. controlled failures cannot enumerate another tenant or customer;
9. raw database errors and payment references never reach logs/results;
10. strict parsing rejects missing, unknown or overbroad success data;
11. success exposes only the MS12-MS13 fields;
12. no direct table write, verification, settlement or event path exists;
13. no file or Storage input is accepted; and
14. the full static, lint, typecheck and build gates pass.

## Remaining Blocked Gates

- Part 3C local service and Server Action implementation;
- Storefront manual-payment form activation and bilingual UI;
- staff verification, settlement and failure boundaries;
- private proof Storage and signed-access design;
- Production preflight/apply and public activation; and
- P16 full recovery closure.

## Review Outcome

The existing customer-session checkout architecture can safely host a narrow
manual-payment submission service without creating a new source of truth. The
recommended contract keeps tenant and ownership authority in Part 3A, keeps
the bank reference private, makes retries deterministic and leaves every
verification, settlement, Storage, UI and Production gate closed.
