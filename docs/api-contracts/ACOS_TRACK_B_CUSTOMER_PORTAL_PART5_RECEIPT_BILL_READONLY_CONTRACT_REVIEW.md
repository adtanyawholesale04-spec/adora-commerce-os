# ACOS Track B Customer Portal Part 5 Receipt/Bill Read-only Contract Review

**Part:** `PORTAL-P1-PART5-RECEIPT`
**Status:** READ BOUNDARY LOCAL VALIDATED / PORTAL UI GATED
**Date:** 2026-08-03

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

The repository now contains the canonical immutable Receipt sources
`finance_documents` and `finance_document_lines`, the guarded Layer B Receipt
actions, and the Layer C active-customer-owned read RPCs. These migrations are
locally validated and have not been applied to Production.

## Safe decision

The data and security dependency for a Receipt-only Portal view is satisfied
locally. Part 5 still cannot add runtime UI until the server read-service and
permission-aware Portal integration are separately approved and validated.
The existing Portal order detail may continue to show order and payment status
but must not label a payment or payment proof as a Receipt.

## Required dependency before implementation

1. Owner decision for Receipt permission-to-role mapping.
2. Separately approved server-only read-service integration that calls only
   the validated Layer C RPCs.
3. Portal UI implementation using the frozen response allowlist, unavailable
   shape, bilingual themes, responsive behavior, and no browser table access.
4. Local Auth/RLS/browser QA before any Production or public activation.

## Explicit non-scope

- No new receipt, bill, invoice, or duplicate financial source.
- No new migration, RPC, view, grant, RLS policy, or permission change beyond
  the already validated Layers A-C.
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

Request the Owner decision for Receipt permission-to-role mapping, then review
the server read-service and Admin/Portal UI integration as separately gated
work. Do not apply Layers A-C to Production or activate the Portal Receipt UI
without the remaining Production approvals.
