# Phase 1D Manual Payment Part 4A Staff Review Repository And Dependency Audit

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART4A`

**Audit Date:** 2026-08-01

**Status:** COMPLETE / CONTRACT REVIEW READY / IMPLEMENTATION BLOCKED

**Authority:** Current `ACOS_IMPLEMENTATION_STATUS.md`, frozen Phase 1D Business
Rules and ER, Owner-frozen SR01-SR24 and SC01-SC30

**Migration / Runtime / Production:** NOT AUTHORIZED

## 1. Objective

Reconcile the repository after completion of the customer manual-payment flow
and determine exactly what the staff review implementation can reuse. This
audit creates no payment, order, customer, inventory or permission source and
makes no schema, grant, RLS, runtime, feature-flag or Production change.

## 2. Audit Envelope

Allowed evidence:

- frozen Phase 1D rules, ER and Manual Payment contracts;
- forward-only migrations through the guarded customer payment snapshot;
- current Admin payment read model and guarded-action context;
- existing validation suites and local Supabase service status.

Forbidden by this part:

- editing a frozen migration;
- creating approve/reject or settlement SQL;
- widening grants, RLS or `service_role` use;
- implementing Staff Review UI or exposing payment references;
- applying or querying Production data.

## 3. Canonical Source Reconciliation

| Concern | Canonical source | Result |
|---|---|---|
| Tenant and reviewer | `organizations`, `profiles`, `organization_memberships`, RBAC tables | REUSE; database action must resolve active actor from `auth.uid()` |
| Permission | `permissions.code = payment.verify`, `has_org_permission` | REUSE; role name, UI state and `service_role` are not substitutes |
| Entitlement | `features.code = storefront.checkout`, `organization_entitlements` | REUSE; must be rechecked inside each action |
| Order and history | `orders`, `order_items`, `order_status_history` | REUSE; no review-order source is permitted |
| Payment aggregate | `payments` | REUSE; `unique (order_id)` already enforces one aggregate per order |
| Review candidate | `payment_transactions`, `payment_proofs` | REUSE; reference-only evidence and one-pending constraints are present |
| Inventory settlement | `inventory_reservations`, `inventory_balances`, `inventory_allocations.source_reservation_id` | REUSE; exact-once source lineage is present |
| Coupon settlement | `coupon_redemptions` | REUSE; approval consumes the existing `RESERVED` evidence |
| Idempotency | `commerce_idempotency_keys` | REUSE catalog; `PAYMENT_VERIFY` and `PAYMENT_REJECT` already exist |
| Audit | `audit_logs` | REUSE; append only `PAYMENT_VERIFIED` or `PAYMENT_REJECTED` |
| Paid attribution | `api_record_attribution_event`, `attribution_events` | REUSE after commit for independently retryable `ORDER_PAID` |
| Review UI read | `getPaymentsReadModel`, server Supabase client | PARTIAL REUSE; current read-only screen is not a review queue |

No duplicate Commerce Core master is required or authorized.

This current-state reconciliation supersedes the historical Part 0 statement
that order-level payment uniqueness was absent: `020_payments.sql` already
defines `unique (order_id)`, and no duplicate constraint is needed.

This current-state reconciliation supersedes the historical Part 0 statement
that order-level payment uniqueness was absent: `020_payments.sql` already
defines `unique (order_id)`, and no duplicate constraint is needed.

## 4. Ready Dependencies

1. SR01-SR24 freeze explicit approve/reject, `payment.verify`, maker-checker,
   bounded reason, optimistic state, privacy and action idempotency.
2. SC01-SC30 freeze the deterministic lock order, all-or-nothing approval,
   rejection non-effects, audit, histories, allocation, coupon and post-commit
   behavior.
3. The 15-minute payment deadline is constrained to remain inside the inventory
   hold.
4. Reference-only proof shape, one pending proof, one pending bank-transfer
   attempt and normalized active reference uniqueness are enforced.
5. `source_reservation_id` can prevent duplicate reservation conversion.
6. The active-profile `has_org_permission` helper and role-matrix validations
   provide the canonical permission primitive.
7. The service-role checkout expiry boundary already locks the order first,
   providing the competing expiry owner required by the frozen contract.
8. The local Supabase core stack is available on CLI `2.109.1`; stopped image
   proxy/pooler services and the unset CAPTCHA secret do not block this static
   staff-review audit.

## 5. Implementation Blockers And Required Treatment

| ID | Finding | Classification | Required treatment |
|---|---|---|---|
| B01 | No `api_verify_storefront_payment` or `api_reject_storefront_payment` exists | Protected financial write | Part 4B must freeze exact service signatures; a later explicitly approved forward-only migration must implement them |
| B02 | No internal atomic settlement helper implements SC01-SC30 | Transaction-critical core | Keep approval blocked until one non-executable helper and failure-injection validation are reviewed |
| B03 | Existing grants and permission RLS still allow direct authenticated insert/update on payment transaction/proof rows and update on payments | Security hardening | The future database migration must revoke direct writes while preserving `payment.view` reads and exact guarded function execution |
| B04 | Checkout idempotency helpers accept only checkout operations/results even though the ledger catalog contains payment review operations | Idempotency contract | Design dedicated review helpers or a narrowly reviewed extension; do not silently broaden the existing helper |
| B05 | `getPaymentsReadModel` omits `payment_proofs` and external references and independently limits aggregates/transactions | Private review read | Design one bounded pending-review queue/detail service; do not overload the general payment dashboard |
| B06 | Generic `requireGuardedAdminAction` reports `not_plan_gated` and cannot prove `storefront.checkout` inside the database transaction | Authorization/entitlement | A review action may use it only for early UI affordance; database authorization remains mandatory |
| B07 | No guarded `payment_failed` post-commit recorder is implemented | Event boundary | Keep rejection event handoff blocked until its narrow service contract and retry identity are frozen |

All seven findings are expected implementation gaps. They do not require data
repair in Part 4A, but they block Staff Review runtime activation.

## 6. Read And Action Boundary Direction

The current `/admin/payments` screen remains read-only. Part 4B should define:

```text
payment.view server queue/detail read
  -> exact same-tenant PENDING BANK_TRANSFER candidate
  -> bounded order/payment/proof fields
  -> reference visible only in the authorized review detail

explicit approve or reject Server Action
  -> early session and payment.verify affordance
  -> guarded database function independently rechecks actor, tenant,
     entitlement, permission, maker-checker, state, deadline and idempotency
```

The reference must never enter a URL, application log, audit payload, event,
browser storage or generic dashboard response.

## 7. Required Part 4B Contract Decisions

Part 4B may design, but not implement:

1. exact queue and detail read shapes, ordering, pagination and empty/error
   behavior;
2. exact approve/reject Server Action and RPC request/response schemas;
3. how review-specific idempotency is claimed and replayed;
4. the forward-only direct-write revocation and exact grants;
5. safe reason handling and reference redaction at every boundary;
6. post-commit `ORDER_PAID` and `payment_failed` retry ownership; and
7. local feature flag, Admin affordance and validation gates.

Any new decision outside SR01-SR24 or SC01-SC30 requires a separate Owner
freeze before migration or runtime work.

## 8. Validation Required Before Runtime

- exact role/permission matrix and active-profile denial;
- cross-tenant, nonexistent and self-review denial;
- direct table-write denial after the future migration;
- reason validation and privacy scans;
- same-request replay and conflicting-request rejection;
- competing approve/reject and review-versus-expiry transactions;
- rollback injection after each settlement mutation group;
- exact payment, order, history, inventory, coupon and audit assertions;
- post-commit event retry without financial compensation; and
- responsive, bilingual, light/dark, keyboard and pending-state browser QA.

## 9. Outcome

Repository and dependency reconciliation is complete with no document conflict
and no duplicate source requirement. **Part 4B Staff Review Service Contract is
ready for Owner authorization.** Staff Review SQL, runtime, UI, Storage and
Production remain blocked. P16 remains mandatory before Production activation.
