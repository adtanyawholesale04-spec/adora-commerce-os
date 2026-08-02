# ACOS Track A Finance & Tax Receipt Document Part 0 Scope Freeze

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART0`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-02

## Owner decision

The first Finance & Tax document scope is frozen to a **Receipt** capability
only. The scope is intentionally narrow so the system can establish a
canonical, auditable document boundary without prematurely introducing tax,
accounting, provider, or customer communication behavior.

## Included in this scope

- Internal receipt document record linked to the canonical order and confirmed
  payment evidence.
- Organization-scoped document ownership through `organization_id`.
- Immutable financial snapshot direction for the receipt.
- Auditable document lifecycle and non-reusable document number direction.
- Separate ownership-scoped read-only Customer Portal projection after a
  receipt exists.
- Finance/document permission boundary for staff access.

## Explicitly deferred

- Tax Invoice and e-Tax Invoice.
- Credit Note and Debit Note.
- Supplier Bill, Expense, VAT report, and accountant export.
- PDF generation, file attachments, Storage, email, SMS, LINE, and external
  document providers.
- Automatic receipt creation from any payment state that is not explicitly
  confirmed/settled by the approved payment boundary.
- Customer Portal receipt UI before the document read contract exists.

## Preserved source-of-truth rules

- `orders` and `order_items` remain the commercial source of truth.
- `payments` and `payment_transactions` remain the payment source of truth.
- `refunds` and `refund_transactions` remain the refund source of truth.
- A receipt references these sources and never rewrites their history.
- `document_sequences` remains only a numbering helper until the document
  schema and allocation contract are separately approved.

## Gates that remain closed

This freeze does **not** authorize:

- a new migration or table;
- document number allocation;
- receipt creation or mutation RPC;
- payment/order/refund updates;
- tax calculation or ledger movement;
- new permission seed or RLS policy;
- PDF/Storage/provider delivery;
- Customer Portal UI or Production activation.

## Next required decision

Proceed to **Part 1: Payment Eligibility** to freeze exactly which payment
states and guarded evidence permit receipt creation. Part 1 must be approved
before any ER/schema or migration design begins.
