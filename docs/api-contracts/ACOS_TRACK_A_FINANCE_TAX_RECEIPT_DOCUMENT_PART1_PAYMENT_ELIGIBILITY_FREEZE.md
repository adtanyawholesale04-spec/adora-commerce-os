# ACOS Track A Finance & Tax Receipt Document Part 1 Payment Eligibility Freeze

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART1`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-02
**Depends on:** Part 0 Receipt-only Scope Freeze

## Owner decision

Receipt creation eligibility is frozen to a fully successful, reconciled
payment. A payment claim, proof upload, pending transaction, or partial amount
is not a receipt-creation event.

## Eligibility predicate

All conditions below must be true in the same authoritative transaction/read
boundary:

1. The order is same-tenant, canonical, not cancelled, not expired, and has
   reached the approved paid lifecycle.
2. `orders.payment_status = PAID` and `orders.order_status = CONFIRMED`.
3. The linked `payments` row is `PAID` and its received amount equals the
   expected amount exactly.
4. At least one linked `payment_transactions` row is `SUCCEEDED`, and the
   aggregate of successful non-reversed transactions equals the expected
   amount.
5. The payment, order and transaction currencies match and the amount is
   positive with the approved precision.
6. Any manual-payment path has completed the existing guarded
   `payment.verify` settlement boundary, including approved evidence and audit.
7. The eligible payment/order identity resolves through the canonical
   organization and customer ownership boundary; a browser-supplied customer
   identifier is never authority.

## Explicitly ineligible

Receipt creation is forbidden for:

- `PENDING`, `FAILED`, `CANCELLED`, or `REVERSED` payment transactions;
- `UNPAID`, `PARTIALLY_PAID`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, or
  `COD_PENDING` order payment states;
- partial, excess, mismatched, negative, or currency-mismatched amounts;
- payment proof submitted but not approved;
- expired, cancelled, or unconfirmed orders;
- a direct table update, client-side status claim, or unguarded RPC call.

## Reversal and refund posture

This freeze does not delete or rewrite a receipt after later refund/reversal
activity. The future document contract must define linked reversal/credit-note
behavior separately. A payment becoming refunded is not permission to mutate
the original order or payment history.

## Security and evidence requirements

- Eligibility must be evaluated server-side against canonical sources.
- Tenant boundary is `organization_id`; staff access requires a frozen finance
  permission and customer Portal access requires an active ownership link.
- Receipt creation, voiding, reversal and access require sanitized audit/event
  evidence when the document runtime is later approved.
- No browser service-role key, direct financial table write, or provider secret
  is permitted.

## Gates that remain closed

This freeze does **not** authorize a receipt table, migration, document number
allocation, creation RPC, ledger mutation, Portal UI, PDF generation, tax
calculation, provider delivery, or Production activation.

## Next required decision

Proceed to **Part 2: Document Number** to freeze number scope, allocation
atomicity, cancellation/reversal non-reuse, and document sequence ownership
before the ER/schema contract is designed.
