# ACOS Track A Finance & Tax Receipt Document Part 5 Security, Audit and Portal Read Freeze

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART5`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-03
**Depends on:** Parts 0-4 Receipt scope, eligibility, numbering, snapshot, and reversal

## Owner decision

Receipt security must use least privilege and the existing ACOS tenant,
membership, ownership, RLS, permission, and append-only audit patterns. The
future Receipt document boundary is server/guarded only; the browser never
gets direct financial table access.

## Permission contract

The following permission direction is frozen for later implementation. The
permission rows and role grants are **not** created by this freeze:

| Permission | Purpose | Future use |
|---|---|---|
| `finance.document.view` | Read tenant finance documents | Finance staff read boundary |
| `finance.document.create` | Create an eligible Receipt | Guarded document creation only |
| `finance.document.void` | Void a document for a document error | Guarded lifecycle action |
| `finance.document.reverse` | Reverse a document with approved evidence | Guarded lifecycle action |

`payment.view` and `payment.verify` remain payment permissions and do not
automatically grant Receipt creation, void, or reversal. A role name or
`service_role` identity is not a substitute for an exact permission check.

## Staff read and action boundary

- Staff reads require active Auth profile, active same-tenant membership,
  active organization context, and `finance.document.view`.
- Create requires `finance.document.create` plus Part 1 eligibility and the
  guarded payment/document transaction.
- Void requires `finance.document.void` plus a bounded document-error reason.
- Reverse requires `finance.document.reverse` plus matching approved
  refund/payment-reversal evidence.
- All actions use stable request identity, fail closed, and return controlled
  non-enumerating errors.
- Browser clients never call a service-role function or write a finance table.

## Customer Portal read boundary

Customer visibility reuses the existing authenticated Portal pattern:

1. derive `auth.uid()` from the server session;
2. require active same-tenant organization membership;
3. resolve the customer only through an `ACTIVE customer_profile_links` row;
4. return only receipts linked to that canonical customer and organization;
5. never accept a browser-supplied `customer_id` as authority; and
6. deny anonymous, unlinked, cross-tenant, and direct-table access without
   revealing whether another tenant's receipt exists.

Customer-facing fields are limited to receipt number, issued date, lifecycle
status, order number, item/total snapshot, currency, and safe payment state.
The Portal must not expose reviewer identity, internal payment transaction IDs,
proof paths, bank details, provider references, private audit payloads, or
tenant-wide finance data.

## RLS and direct access

- A future receipt table is tenant-owned with `organization_id` and RLS.
- Direct `anon` and `authenticated` table writes are denied.
- Staff and Portal reads use approved server/RPC boundaries with exact grants.
- Cross-tenant access, inactive membership, inactive customer link, and
  unlinked profile access fail closed.
- Existing `customer_profile_links`, `api_get_customer_portal_snapshot`, and
  append-only `audit_logs` remain the canonical patterns; no duplicate
  ownership or audit source is created.

## Audit and event contract

Reuse append-only `audit_logs`; do not create a second audit table. Future
sanitized actions are:

```text
RECEIPT_CREATED
RECEIPT_VIEWED
RECEIPT_VOIDED
RECEIPT_REVERSED
RECEIPT_REPLACED
```

Audit payloads may include organization, actor, document entity, request ID,
bounded reason, and before/after lifecycle state. They must exclude customer
contact data, bank/proof payloads, provider secrets, raw payment references,
and the full document snapshot. Read auditing must not make the Portal leak
document existence across tenants.

## Event, ledger, consent, and entitlement posture

| Concern | Frozen rule |
|---|---|
| Event | Emit lifecycle events only from the future guarded document boundary; no browser event is authoritative |
| Audit | Required for create, view, void, reverse, and replacement; append-only existing source |
| Ledger | Receipt is a document and creates no new money movement; payment/refund/ledger sources remain canonical |
| Consent | Not required for an in-app read; required before email/SMS/LINE delivery is added |
| Entitlement | Use existing organization entitlement only if Finance & Tax is later plan-gated; no bespoke flag now |

## Gates that remain closed

This freeze does **not** authorize permission seeding, role changes, migration,
receipt table/RLS, RPC, audit writes, Portal UI, email/provider delivery, or
Production activation.

## Next required decision

Proceed to **Part 6 ER/Schema and Guarded Database Boundary Contract** to map
the frozen decisions into additive schema, grants, RLS, RPC signatures,
idempotency, and replay gates before any migration is written.
