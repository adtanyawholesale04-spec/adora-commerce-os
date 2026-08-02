# ACOS Track A Finance & Tax Receipt Document Contract Review

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001`
**Status:** BLOCKED / OWNER DECISIONS REQUIRED
**Date:** 2026-08-02

## Objective

Define the decisions and dependencies required before ACOS creates or exposes a
receipt, bill, tax invoice, credit note, or debit note. This is a contract
review only. It does not authorize a migration, document numbering, financial
write, tax calculation, export, provider integration, or Portal UI.

## Current canonical sources

- `orders` and `order_items` remain the commercial source of truth.
- `payments` and `payment_transactions` remain the payment source of truth.
- `refunds` and `refund_transactions` remain the refund source of truth.
- `document_sequences` is only a generic numbering helper; it is not a receipt
  or tax-document record.

The repository currently has no frozen Finance & Tax Phase 1E Business Rules,
no frozen Finance & Tax ER addendum, no canonical receipt/bill/tax-invoice
record, and no validated Finance & Tax read RPC.

## Recommended safe contract

1. Financial documents are immutable snapshots that reference, but never
   rewrite, the canonical order/payment/refund sources.
2. Every tenant-owned document carries `organization_id`; branch scope is an
   explicit decision and must not be inferred from an address or order.
3. Document numbers are allocated once, are auditable, and are never reused
   after cancellation, reversal, or voiding.
4. A confirmed payment is an eligibility input, not by itself permission to
   invent a receipt record. Document creation must be a separate guarded
   service decision.
5. Credit/debit notes and reversals link to the original document and preserve
   history; they do not mutate the original financial snapshot.
6. Customer Portal reads are a separate ownership-scoped projection and must
   not expose tenant-wide finance tables or private accounting metadata.

## Owner decisions required

| Decision | Recommended safe value | Status |
|---|---|---|
| MVP document scope | Receipt first; tax invoice, credit note, debit note and supplier bill deferred | Decision required |
| Receipt creation trigger | Explicit guarded service after confirmed/settled payment | Decision required |
| Payment eligibility | Only `SUCCEEDED`/approved payment evidence; never `PENDING` | Decision required |
| Document numbering scope | Per organization and document type; branch numbering only after branch rules are frozen | Decision required |
| Cancellation/reversal | Void or reverse with append-only reason and linked replacement document; never reuse a number | Decision required |
| Tax/VAT | No tax calculation until tax configuration and legal policy are frozen | Decision required |
| Customer visibility | Ownership-scoped read-only document projection after document exists | Decision required |
| Accounting visibility | Separate finance permission and tenant/branch scope; customer view never inherits it | Decision required |
| Storage/export | Defer PDF/e-Receipt provider and attachment generation; begin with internal document record if approved | Decision required |
| Audit/event | Append document-created, voided, reversed, and accessed evidence with sanitized payloads | Decision required |

## Dependency and impact matrix

| Area | Required? | Current state |
|---|---:|---|
| New migration | Yes, later | Not authorized; no schema is frozen |
| New read RPC | Yes, later | Not authorized; Portal read contract is missing |
| RLS/tenant boundary | Yes | Must include `organization_id`, ownership scope, and finance permission |
| Permission | Yes | New finance/document read/create permissions require Owner freeze |
| Event/audit | Yes | Required for document lifecycle and access evidence |
| Ledger | Required for value movements only | Receipt itself is a document; tax/refund movements must link to existing ledger/payment evidence |
| Consent | Conditional | Required before any email/SMS/LINE delivery, not for an internal read-only view |
| Entitlement | Conditional | Required if Finance & Tax is plan-gated per organization |
| Provider/Storage | Deferred | No e-Tax, PDF provider, or Storage upload in this review |

## Explicit non-scope

- No modification of migrations `001-034` or any frozen migration.
- No new `receipts`, `bills`, `tax_invoices`, `credit_notes`, or duplicate
  financial source.
- No direct writes to `orders`, `payments`, `payment_transactions`, `refunds`,
  or their historical records.
- No tax calculation, VAT report, accounting export, PDF generation, provider
  call, email, SMS, LINE message, or Production change.

## Validation required after Owner freeze

- fresh migration replay and schema/RLS lint;
- document-number concurrency and non-reuse checks;
- order/payment/refund consistency checks;
- tenant, branch, finance-permission, and customer-ownership isolation;
- anonymous and direct-table denial;
- append-only audit/event evidence and sanitized payload checks;
- idempotent document creation and retry behavior;
- Portal read-only rendering in Thai/English and light/dark modes;
- no rewrite of commercial or payment source-of-truth rows.

## Current disposition

`FIN-TAX-001` is **BLOCKED** until the Owner freezes the Finance & Tax MVP
Business Rules and ER/schema addendum. The next permitted step is an Owner
decision table; implementation must not begin from this review alone.
