# ACOS Track A Finance & Tax Receipt Document Part 3 Immutable Snapshot Freeze

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART3`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-03
**Depends on:** Part 0 Scope; Part 1 Payment Eligibility; Part 2 Numbering

## Owner decision

An eligible Receipt is an immutable financial snapshot of the approved
commercial and payment facts at issuance time. The snapshot references
canonical sources but never replaces or rewrites them.

## Receipt snapshot fields

The future document record may contain the following immutable groups:

### Document identity and lifecycle

- `organization_id`
- `document_type = RECEIPT`
- `document_number`
- `issued_at`
- `status` and guarded lifecycle timestamps/reasons only
- source order/payment identifiers for reconciliation

The document number and issued timestamp are assigned once. Lifecycle status
changes such as `VOID` are guarded events and do not alter the snapshot.

### Order and customer reference

- canonical `order_id` and `order_number`
- canonical `customer_id`
- customer display name captured at issuance
- billing address snapshot from the canonical order address when present
- no authentication secret, proof payload, bank details, or unnecessary contact
  data in the receipt snapshot

### Line and total snapshot

- `currency_code`
- order item product and variant name snapshots
- SKU/sale-code snapshot where present
- quantity, applied unit price, line discount, and line total
- subtotal, item/order discount totals, shipping charge/discount, and grand
  total

The receipt total must equal the eligible paid amount under the Part 1
eligibility contract. Tax/VAT fields are intentionally excluded until the
separate tax policy and ER contract are frozen.

### Payment evidence reference

- canonical `payment_id`
- eligible successful transaction identity/identities
- payment method and settled amount/currency
- settled/paid timestamp

External provider references, proof storage paths, bank data, and raw provider
payloads are not copied into the customer-facing document snapshot. They stay
behind their existing private payment boundaries.

## Immutability rules

- Snapshot fields are write-once inside the guarded receipt-creation
  transaction.
- Browser clients, authenticated direct table roles, and generic update RPCs
  cannot edit or delete an issued snapshot.
- Corrections use a separately approved void/reversal/replacement document
  relation; the original snapshot remains unchanged.
- Re-running the same idempotent creation request returns the original receipt
  identity and number without copying a second snapshot.
- Canonical order, payment, refund, and customer records remain independently
  auditable source records.

## Consistency and privacy gates

The future creation boundary must fail closed unless:

1. the order/payment/customer all share the same `organization_id`;
2. the order is eligible under Part 1 and the payment totals/currency match;
3. every copied item and total is read from the locked canonical order;
4. the billing address belongs to the same order and tenant;
5. no tax, provider, secret, bank, proof, or private accounting payload leaks to
   the Customer Portal projection; and
6. the snapshot and lifecycle audit evidence commit atomically.

## Explicitly deferred

- tax/VAT fields and tax calculation;
- credit/debit note and reversal schema;
- supplier bill and expense fields;
- PDF/e-Tax rendering, Storage, email, SMS, LINE, and provider delivery;
- accounting export and branch-specific legal address policy.

## Gates that remain closed

This freeze does **not** authorize a migration, receipt table, creation RPC,
document number allocation, financial write, ledger mutation, Portal UI, PDF
generation, provider call, or Production activation.

## Next required decision

Proceed to **Part 4 Reversal/Cancellation** to freeze void, reversal,
replacement, and history-preservation behavior before the ER/schema contract.
