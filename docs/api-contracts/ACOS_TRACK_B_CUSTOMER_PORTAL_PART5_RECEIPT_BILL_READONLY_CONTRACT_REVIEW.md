# ACOS Track B Customer Portal Part 5 Receipt/Bill Read-only Contract Review

**Part:** `PORTAL-P1-PART5-RECEIPT`
**Status:** BLOCKED / DEPENDENCY REQUIRED
**Date:** 2026-08-02

## Objective

Review whether the Customer Portal can expose a read-only receipt or bill view
without creating a duplicate financial source or presenting payment data as a
document that does not yet exist.

## Evidence

The current canonical Commerce Core sources are:

- `orders` and `order_items` for the commercial order;
- `payments` and `payment_transactions` for payment state and money movement;
- `refunds` and `refund_transactions` for refund state;
- `document_sequences` and `next_document_number` as a reusable numbering helper.

The repository does not currently contain a canonical `receipts`, `bills`,
`tax_invoices`, or equivalent financial document record, nor a validated
Customer Portal receipt/bill read RPC.

## Safe decision

Part 5 cannot add a Portal receipt/bill screen yet. The existing Portal order
detail may continue to show order and payment status, but it must not label a
payment or payment proof as a receipt/bill.

## Required dependency before implementation

1. Freeze Finance & Tax MVP business rules for receipt/bill scope.
2. Freeze the ER/schema addendum for the canonical document record, document
   number lifecycle, immutable financial snapshot, reversal/cancellation
   behavior, and organization/branch scope.
3. Define the ownership-scoped read contract and RPC allowlist for Portal.
4. Define document privacy, audit evidence, and whether a confirmed payment is
   sufficient to create the document or requires a separate guarded service.

## Explicit non-scope

- No new receipt, bill, invoice, or document table.
- No migration, RPC, view, grant, RLS policy, or permission change.
- No document number allocation or financial event/ledger mutation.
- No payment, refund, tax, Storage, provider, or Production change.
- No duplicate customer, order, payment, or financial source.

## Validation required after the dependency is approved

- tenant and active customer-link isolation;
- authenticated-only access and anonymous denial;
- document-to-order/payment consistency;
- immutable document snapshot and non-reusable document number rules;
- reversal/cancellation visibility without rewriting payment history;
- audit/event evidence for document creation and access;
- direct-table denial and no browser write path;
- responsive Thai/English and light/dark UI QA.

## Next safe step

Proceed with Finance & Tax receipt/document contract review and Owner decision
freeze. Do not implement the Customer Portal receipt/bill UI until that gate
is complete.
