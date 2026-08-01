# Phase 1D Manual Payment Part 4C Staff Review Forward-only Migration Contract Review

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART4C`

**Prepared Date:** 2026-08-01

**Owner Approval Date:** 2026-08-01

**Status:** OWNER APPROVED / RM01-RM30 FROZEN / SQL NOT AUTHORIZED

**Depends On:** Owner-frozen SR01-SR24, SC01-SC30 and RV01-RV24

**Migration / Local Apply / Production Apply:** NOT AUTHORIZED

## 1. Objective

Translate the frozen staff-review, settlement and service contracts into an
exact forward-only migration plan before any SQL is generated. This review
reuses the canonical order, payment, inventory, coupon, idempotency, audit and
attribution sources. It creates no migration, function, policy, grant, runtime,
UI, feature activation or Production change.

## 2. Frozen Owner Decisions

The Project Owner explicitly approved all recommended values RM01-RM30 on
2026-08-01. These values are now the frozen forward-only Staff Review migration
baseline.

| ID | Decision | Frozen value |
|---|---|---|
| RM01 | Migration layering | Use two separately generated forward-only migrations: Layer A read RPCs, then Layer B guarded actions and hardening |
| RM02 | Frozen history | Never edit, rename, reorder or repair a frozen migration; actual filenames come only from `supabase migration new` after implementation approval |
| RM03 | Preflight | Each layer fails before DDL when required canonical objects, constraints, policies, grants or expected target-function state differ from this contract |
| RM04 | Queue function | Layer A reserves exactly `api_list_storefront_payment_reviews(uuid,timestamptz,uuid,integer) returns jsonb` |
| RM05 | Detail function | Layer A reserves exactly `api_get_storefront_payment_review(uuid,uuid) returns jsonb` |
| RM06 | Read authorization | Queue requires active same-tenant `payment.view`; detail requires both `payment.view` and `payment.verify`; all denial and ineligible cases remain non-enumerating |
| RM07 | Read shape | Queue is reference-free, oldest-first keyset paginated, defaults to 25 and clamps to 1-50 without a total count; detail returns only the RV10 allowlist |
| RM08 | Read security | Both read functions are `SECURITY DEFINER`, schema-qualified with fixed `search_path = public`, revoked from `PUBLIC`, `anon` and `service_role`, and granted only to `authenticated` |
| RM09 | Read side effects | Layer A is read-only and adds no audit, event, ledger, idempotency, status, timestamp or business-data write |
| RM10 | Action functions | Layer B reserves exactly `api_verify_storefront_payment(uuid,uuid,text,text,uuid)` and `api_reject_storefront_payment(uuid,uuid,text,text,uuid)`, each returning bounded `jsonb` |
| RM11 | Atomic write hardening | Layer B revokes authenticated insert/update/delete on `payments`, `payment_transactions` and `payment_proofs` in the same migration that grants guarded actions |
| RM12 | Policy hardening | Layer B removes only the five legacy write policies `payments_permission_update`, `payment_transactions_permission_insert`, `payment_transactions_permission_update`, `payment_proofs_permission_insert` and `payment_proofs_permission_update`; permission-aware select policies remain |
| RM13 | Action grants | Action functions are revoked from `PUBLIC`, `anon` and `service_role` and granted only to `authenticated`; every call independently authenticates and authorizes in the database |
| RM14 | Review idempotency | Add dedicated internal review claim/complete/response helpers for `PAYMENT_VERIFY` and `PAYMENT_REJECT`; do not widen checkout-only helpers |
| RM15 | Intent hash | Hash an exact versioned tuple of operation, organization, reviewer, transaction, expected status and normalized reason; matching retry reuses the bounded terminal response and changed intent fails |
| RM16 | Helper exposure | All internal review idempotency and response helpers revoke execute from `PUBLIC`, `anon`, `authenticated` and `service_role` |
| RM17 | Settlement helper | Add one internal non-executable approval settlement helper implementing SC01-SC30; no independent runtime role can call it |
| RM18 | Authorization order | Resolve `auth.uid()`, active profile, active same-tenant membership/role, `payment.verify` and active `storefront.checkout` before mutation; customer ownership never grants staff authority |
| RM19 | Lock order | Lock canonical order, payment, selected transaction and proof first, then coupon, ordered reservations, ordered balances and allocation lineage in SC07 order |
| RM20 | Review guards | Enforce maker-checker separation, exact expected `PENDING` state, unexpired payment deadline, active stock holds, immutable THB amount/currency and first-committer-wins concurrency |
| RM21 | Approval writes | Perform exactly the SC09-SC20 transaction/proof/payment/order, allocation, inventory, coupon, history, audit and idempotency writes atomically |
| RM22 | Rejection writes | Perform only the SC22-SC24 selected transaction/proof terminal transitions, reviewer evidence, one privacy-bounded audit and idempotency completion; keep order, payment, holds and coupon unchanged |
| RM23 | Reason validation | Trim once, require 8-500 characters, reject control/line abuse and private payment-reference, contact, URL or credential-like content; never return the reason in the action response |
| RM24 | Audit | Append exactly one `PAYMENT_VERIFIED` or `PAYMENT_REJECTED` audit with tenant, reviewer, opaque entity IDs, bounded statuses, reason and request ID; exclude reference, proof payload and provider data |
| RM25 | Source invariants | Preserve one canonical order/payment source, exact aggregate consistency, reservation-to-allocation lineage, inventory ledger truth, coupon cardinality and append-only history |
| RM26 | Rejection event recorder | Add one narrow service-role-only `api_record_storefront_payment_failed_event(uuid,uuid,uuid)` that proves the matching committed rejection audit and source cart before idempotently recording `payment_failed` |
| RM27 | Approval event handoff | Reuse the existing service-role `ORDER_PAID` attribution boundary after commit with a deterministic derived request UUID; event failure never compensates financial truth |
| RM28 | Data preflight | Require zero count-only blockers for canonical candidate cardinality, amount/currency, deadline/hold, successful-transaction, allocation-lineage, coupon and legacy-policy/grant assumptions; perform no automatic repair |
| RM29 | Rollback posture | Use transaction rollback before commit and a new forward-fix migration after release; provide no down migration, destructive rewrite or automatic reversal of settled financial truth |
| RM30 | Delivery gate | Require Owner freeze, separate SQL authorization, fresh replay, catalog/grant/RLS checks, direct-write denial, functional/privacy/idempotency/race/failure-injection suites and database lint before local activation; Production remains blocked by P16 |

## 3. Planned Migration Layers

### Layer A - Private Review Reads

Layer A contains only the two Owner-frozen read functions and their exact
execution grants. It may be replayed locally before Layer B, but the Admin
review feature remains disabled and no action surface is introduced. Queue and
detail results are bounded JSON objects and never expose a storage path,
customer contact, address, unrestricted metadata or provider payload.

### Layer B - Guarded Review And Atomic Settlement

Layer B is one atomic migration containing:

1. dedicated review idempotency helpers;
2. one internal approval settlement helper;
3. explicit verify and reject functions;
4. the narrow post-commit rejection event recorder;
5. direct table-grant revocation and exact legacy write-policy removal; and
6. exact function revocations and grants.

The guarded action functions and direct-write hardening must not be split.
Applying one without the other could preserve an unintended mutation path or
remove the only authorized path before its replacement exists.

## 4. Required Preflight

Future SQL must stop without changing data when any of these checks fail:

- required organization, profile, membership, role, permission and entitlement
  objects or `has_org_permission` behavior are absent;
- canonical order, payment, transaction, proof, reservation, allocation,
  balance, movement, coupon, idempotency, audit, history or attribution objects
  differ from the frozen contracts;
- target function signatures already exist unexpectedly;
- payment due exceeds the reservation hold or a review candidate lacks exact
  pending proof/attempt, unpaid order/payment or active hold coverage;
- an unpaid order already has a successful transaction, allocation lineage is
  duplicated or cross-tenant, or coupon cardinality is inconsistent; or
- the five expected legacy write policies and authenticated table privileges do
  not match the hardening plan.

Only counts and catalog facts may be emitted. References, reasons, customer
data, proof payloads and provider data must not appear in diagnostics.

## 5. Security And Grant Matrix

| Boundary | `PUBLIC` | `anon` | `authenticated` | `service_role` |
|---|---|---|---|---|
| Queue/detail RPC | revoke | revoke | exact execute | revoke |
| Verify/reject RPC | revoke | revoke | exact execute | revoke |
| Internal helpers | revoke | revoke | revoke | revoke |
| `payment_failed` recorder | revoke | revoke | revoke | exact execute |
| Direct Payment table mutation | none | none | revoke | existing trusted server posture only |

Permission-aware table reads remain unchanged. Browser code must never receive
`service_role` credentials or invoke Payment table mutations directly.

## 6. Validation Contract

Before local activation, implementation must prove:

- fresh migration replay from `001` through the new layers;
- exact function owner, volatility, security-definer, fixed search path and
  execution grants;
- queue/detail permission separation, tenant isolation and non-enumeration;
- direct authenticated insert/update/delete denial on all three Payment tables;
- owner/manager/custom-role allow and warehouse/support/inactive denial;
- self-review, stale status, deadline, hold, amount, allocation and coupon denial;
- same-request replay, changed-intent conflict and in-progress conflict;
- competing approve/reject and review/expiry first-committer behavior;
- rollback after injected failures at every settlement mutation group using
  transaction-scoped test fixtures only;
- exact audit, order history, inventory movement/allocation and coupon evidence;
- reference and reason absence from queue, response, URL, logs and events; and
- database lint, Supabase security/workflow and Commerce regression suites.

## 7. Rollout And Non-Scope

These decisions do not authorize SQL generation or apply. When implementation
is later approved, logical migration names are passed to the Supabase CLI and
the CLI-generated timestamps become authoritative. No migration is edited in
place and no Production database is queried or changed.

Admin service/actions/UI, feature activation, bank instruction configuration,
binary proof Storage, provider integration, notifications, refund/reversal and
Production rollout remain outside Part 4C.

## 8. Owner Approval Gate

The Project Owner approved RM01-RM30 in full on 2026-08-01. Any change requires
a new explicit Owner decision and must not silently alter this frozen baseline.
The next allowed step is separate Owner approval for Part 4D Layer A private
review-read migration generation and local validation. This freeze does not
authorize SQL generation, local or Production apply, Layer B guarded actions,
runtime, UI or feature activation.
