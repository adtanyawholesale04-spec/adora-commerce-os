# Phase 1D Manual Payment Part 4B Staff Review Service Contract Review

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART4B`

**Prepared Date:** 2026-08-01

**Status:** CONTRACT REVIEW COMPLETE / OWNER DECISION REQUIRED

**Depends On:** Part 4A audit; Owner-frozen SR01-SR24 and SC01-SC30

**Migration / Runtime / UI / Production:** NOT AUTHORIZED

## 1. Objective

Define an implementation-ready service contract for a staff member to discover,
inspect, approve or reject a pending reference-only manual bank-transfer claim.
The contract preserves canonical Commerce Core sources, tenant isolation,
maker-checker separation, all-or-nothing settlement and private reference
handling. It creates no SQL, Server Action, Admin route, feature flag or
Production change.

## 2. Recommended Owner Decisions

The following values are recommendations only. They become frozen only after
an explicit Owner approval of RV01-RV24.

| ID | Decision | Recommended safe value |
|---|---|---|
| RV01 | Admin surface | Add a dedicated `/admin/payments/review` queue and opaque transaction-ID detail route; keep `/admin/payments` a general read-only dashboard |
| RV02 | Queue authorization | Require active same-tenant profile/membership plus `payment.view`; do not expose action affordances without `payment.verify` |
| RV03 | Queue database boundary | Use one authenticated `SECURITY DEFINER` read RPC, not browser table joins or `service_role`, so candidate shape and tenant checks remain exact |
| RV04 | Queue signature | Reserve `api_list_storefront_payment_reviews(p_organization_id uuid, p_cursor_submitted_at timestamptz, p_cursor_transaction_id uuid, p_limit integer)` returning bounded `jsonb` |
| RV05 | Candidate filter | Return only same-tenant `PAYMENT` / `BANK_TRANSFER` transaction `PENDING` with exactly one reference-only `PENDING` proof and canonical unpaid pending Storefront order/payment links |
| RV06 | Queue ordering | Use stable oldest-first `(submitted_at, payment_transaction_id)` keyset ordering; default 25, minimum 1, maximum 50, no offset pagination or total count |
| RV07 | Queue result | Return candidate IDs, amount, currency, submitted time, payment deadline and action eligibility; omit reference, metadata, storage path, contacts, address, provider payload and free text |
| RV08 | Detail signature | Reserve `api_get_storefront_payment_review(p_organization_id uuid, p_payment_transaction_id uuid)` returning one bounded non-enumerating `jsonb` result |
| RV09 | Detail authorization | Require both `payment.view` and `payment.verify` before returning the normalized reference; unauthorized, cross-tenant, missing and ineligible candidates collapse to `available=false` |
| RV10 | Detail result | Return exact order/payment/transaction/proof IDs and statuses, immutable THB amount, submitted/deadline times, normalized reference, self-review boolean and review eligibility; no customer contact, address, storage path or unrestricted metadata |
| RV11 | Server read service | Add `src/lib/admin/manual-payment-review.ts` using only the authenticated cookie-session client, strict parsers and canonical active organization from Admin context |
| RV12 | Explicit actions | Use separate `admin.manual-payment.verify.request` and `admin.manual-payment.reject.request` Server Actions; no generic status action |
| RV13 | Browser action input | Accept only opaque transaction ID, exact expected status `PENDING`, trimmed reason and request UUID; never accept organization, amount, currency, terminal status or reviewer identity from the browser |
| RV14 | Request identity | Keep one request UUID stable across network retry for the same action/reason; a changed action or reason requires a new UUID and conflicting reuse fails closed |
| RV15 | RPC signatures | Use the Owner-frozen `api_verify_storefront_payment(uuid,uuid,text,text,uuid)` and matching `api_reject_storefront_payment` signatures with canonical organization supplied by the server service |
| RV16 | Reason handling | Normalize once with trim, require 8-500 characters, reject line/control abuse and forbidden private/payment content, and never log or echo the reason outside bounded staff result/audit evidence |
| RV17 | Action response | Strictly allowlist operation, order/payment/transaction/proof IDs, terminal transaction/proof/order/payment statuses, reviewed time, allocation count, coupon-consumed and idempotency-reused; never return the reference |
| RV18 | Error mapping | Map only the frozen controlled vocabulary to stable UI codes; collapse raw database, tenant, membership and existence details, and return `unexpected_error` for everything else |
| RV19 | Database authorization | Each action independently resolves `auth.uid()`, active profile/membership, `payment.verify`, active `storefront.checkout`, tenant, maker-checker, expected state and deadline after locking canonical rows |
| RV20 | Grant hardening | In the same future migration, revoke direct authenticated insert/update/delete on `payments`, `payment_transactions` and `payment_proofs`; preserve permission-aware reads and grant only exact read/action RPC execution |
| RV21 | Review idempotency | Add dedicated non-executable review idempotency helpers for `PAYMENT_VERIFY`/`PAYMENT_REJECT`; do not broaden checkout-only helpers and keep all helper execution revoked from every runtime role |
| RV22 | Settlement boundary | Approval calls one non-executable SC01-SC30 internal settlement helper in the same transaction; rejection uses one atomic terminal attempt transition and never releases holds early |
| RV23 | Post-commit handoff | After committed approval retry existing `ORDER_PAID` attribution with a deterministic derived UUID; after rejection call a narrow service-role `payment_failed` recorder that proves the matching rejection audit; neither failure compensates financial truth |
| RV24 | Delivery gate | Keep `ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_ENABLED` false by default with an independent kill switch; require contract tests, forward-only migration approval, fresh replay, permission/privacy/race/rollback validation and browser QA before local activation; Production remains separately blocked by P16 |

## 3. Read Contracts

### 3.1 Queue

The queue response is intentionally reference-free:

```json
{
  "items": [
    {
      "payment_transaction_id": "uuid",
      "payment_proof_id": "uuid",
      "payment_id": "uuid",
      "order_id": "uuid",
      "amount": "1250.00",
      "currency_code": "THB",
      "submitted_at": "timestamptz",
      "payment_due_at": "timestamptz",
      "can_review": true
    }
  ],
  "next_cursor": {
    "submitted_at": "timestamptz",
    "payment_transaction_id": "uuid"
  }
}
```

No count query is required. An empty or stale cursor returns an empty bounded
page, not database detail.

### 3.2 Detail

The detail read is the only review boundary allowed to return the normalized
reference. It returns `available=false` without IDs or reason when the caller
lacks either required permission or the candidate cannot be safely reviewed.
The server response must use `Cache-Control: no-store`, and the reference must
not enter URL parameters, page metadata, analytics, browser storage or logs.

## 4. Action Contract

```text
Server Action
  -> require configured authenticated Admin context
  -> resolve canonical active organization
  -> perform early payment.verify affordance check
  -> parse exact action input and stable request UUID
  -> call one authenticated approve OR reject RPC
  -> strictly parse bounded terminal response
  -> refresh queue/detail without carrying reference in redirect URL
  -> retry the corresponding post-commit handoff independently
```

Early application checks improve UX only. The database function remains the
sole financial authorization and mutation boundary.

## 5. Database And Lock Contract

The future action migration must:

1. revoke direct Payment table mutations before granting action functions;
2. use fixed safe search paths and schema-qualified objects;
3. lock order, payment, selected transaction and proof first;
4. for approval, continue with coupon, ordered reservations, ordered balances
   and allocation lineage in SC07 order;
5. let the first committed review or expiry transition win;
6. append exactly one privacy-bounded audit and complete idempotency only after
   every business write succeeds; and
7. roll back every approval mutation on authorization, amount, hold,
   allocation, coupon, history or audit failure.

Internal helpers are not runtime APIs. Revoke execution from `PUBLIC`, `anon`,
`authenticated` and `service_role`; only the owning definer action may invoke
them internally.

## 6. Controlled Application Codes

```text
feature_disabled
anonymous
missing_membership
permission_denied
review_not_found
self_review_denied
reason_invalid
state_conflict
already_reviewed
payment_expired
hold_inconsistent
amount_inconsistent
allocation_inconsistent
coupon_inconsistent
idempotency_conflict
review_failed
unexpected_error
```

Codes contain no raw SQL, reference, proof, bank, customer or tenant detail.

## 7. Validation Matrix

- `payment.view` queue access and `payment.verify` detail/action separation;
- owner/manager/custom-role allow and warehouse/support denial;
- inactive profile/membership/organization/role/entitlement denial;
- cross-tenant, nonexistent and self-review non-enumeration;
- queue keyset stability and strict 1-50 limit;
- reference absence from queue, action result, URL, logs, audit and events;
- reason boundary, control characters and forbidden-content rejection;
- direct Payment table write denial after migration;
- same-request replay, changed-intent conflict and in-progress conflict;
- competing approve/reject and review/expiry transactions;
- failure injection after every settlement mutation group;
- exact aggregate, history, allocation, coupon and audit evidence;
- post-commit handoff retry without financial compensation; and
- Thai/English, light/dark, 320-1440 px, keyboard, focus, pending and offline QA.

## 8. Non-Scope

- binary proof upload, signed URLs, Storage bucket or retention;
- bank account instruction configuration;
- partial/over/under payment, correction, reversal, refund or provider flow;
- customer contact/address display, notification delivery or fulfillment;
- Production migration, secrets, rollout or activation.

## 9. Decision Gate

Part 4B design is complete, but RV01-RV24 are not frozen. The next permitted
step is an explicit **Owner Decision Freeze for RV01-RV24**. Approval of those
values would authorize migration contract design only; it would not authorize
SQL generation, local apply, runtime, UI or Production.
