# CORE-UI-006 Payments Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Provide a read-only Admin Payments screen at `/admin/payments` for inspecting payment records, recent payment transactions, and refund history without enabling financial mutation workflows.

This task does not implement payment verification, payment settlement, refund processing, provider reconciliation, or payment proof review.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`
- `supabase/migrations/020_payments.sql`
- `supabase/migrations/20260726200055_operations_permission_rls.sql`
- `supabase/migrations/20260726201809_guarded_operations_wrappers.sql`

---

## 3. Read Contract

Primary reads:

```text
payments
payment_transactions
refunds
```

Selected payment fields:

```text
id
order_id
status
amount_expected
amount_received
currency_code
created_at
updated_at
```

Selected payment transaction fields:

```text
id
payment_id
transaction_type
payment_method
amount
currency_code
provider
status
paid_at
created_at
```

Selected refund fields:

```text
id
order_id
refund_number
amount
refund_method
status
reason
created_at
updated_at
```

Optional read, only when the active membership also has `order.view`:

```text
orders.id
orders.order_number
```

---

## 4. Authorization Boundary

The read model runs server-side through `getPaymentsReadModel()`.

Required checks:

1. Supabase public environment is configured.
2. User is authenticated.
3. User has active organization membership.
4. Active membership includes `payment.view`.
5. Database RLS restricts rows to the active organization and `payment.view`.

No client-provided `organization_id` is trusted.

Supabase Data API exposure is treated as grants plus RLS. Both must allow access before rows are visible.

---

## 5. Explicitly Forbidden In This Screen

The UI does not provide buttons or server actions for:

```text
payment verification
payment settlement
payment transaction creation
payment proof verification
refund processing
refund transaction creation
provider reconciliation
payment/refund status mutation
```

Refund processing remains available only through the guarded `api_process_refund` RPC from an approved server/API workflow with `payment.refund`.

Payment verification and settlement remain blocked until an approved provider/manual settlement service contract exists.

---

## 6. Related Reads Deferred

The first read model does not select these related surfaces:

```text
payment_proofs
refund_transactions
customer_credit_transactions
credit_lot_allocations
provider payloads / external references
```

Reason:

- Payment proofs include storage paths and verification workflow data.
- Refund transaction/provider details should be added with a dedicated financial operations contract.
- Credit ledger reads need a separate credit-safe read contract.

---

## 7. UI Scope

Implemented:

- `/admin/payments` route
- payment metric cards
- payment list table
- recent payment transactions table
- refund history table
- payment/order label visibility boundary
- financial mutation lockout panel
- snapshot scope panel
- Thai and English copy
- light and dark visual system compatibility

Snapshot limits:

```text
payments: 75 latest by updated_at
payment_transactions: 100 latest by created_at
refunds: 50 latest by created_at
orders: 125 matching labels when order.view is granted
```

---

## 8. Validation

Expected validation gates:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/payments returns 200 when the local dev server is running
```

---

## 9. Next Recommended Task

Proceed with:

```text
CORE-UI-007 Fulfillment read-only screen
```
