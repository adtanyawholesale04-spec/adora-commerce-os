# ACOS Track A Finance & Tax Receipt Document Part 2 Document Number Freeze

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART2`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-03
**Depends on:** Part 0 Receipt-only Scope Freeze; Part 1 Payment Eligibility Freeze

## Owner decision

The first Receipt document number format is frozen as:

```text
RC-{YYYY}-{NNNNNN}
```

Examples:

```text
RC-2026-000001
RC-2026-000002
RC-2026-000003
```

## Numbering rules

- `RC` is the fixed Receipt document-type prefix.
- `YYYY` is the calendar year in the approved document timezone.
- `NNNNNN` is a six-digit, zero-padded sequence from `000001` through
  `999999`.
- The sequence scope is `(organization_id, document_type, year)`.
- The initial rollout does not include branch in the number because branch
  numbering rules are not frozen.
- The full rendered number is unique within the organization and document
  type; the year component makes annual reset auditable and non-colliding.
- A number is reserved only inside the future guarded document-creation
  transaction and is never allocated by the browser.

## Atomic allocation and concurrency

The future implementation must allocate the next number atomically for the
organization, document type, and year. Concurrent requests must receive
distinct numbers or fail closed. A retry of the same idempotent document
creation request must return the original document number rather than consume
another number.

The existing `document_sequences` helper is only a reusable primitive at this
stage. This freeze does not authorize calling it, changing its grants, or
creating a receipt record.

## Cancellation, reversal, and non-reuse

Numbers are never reused after a document is created, voided, cancelled,
reversed, or superseded. A replacement document receives the next number and
links to the original document through the future approved document contract.

Example:

```text
RC-2026-000021 = VOID
RC-2026-000022 = replacement document
```

The original number remains part of the audit history and is not edited into a
different document.

## Explicitly deferred

- Branch-specific or branch-local numbering.
- Separate prefixes for Tax Invoice, Credit Note, Debit Note, or Supplier Bill.
- Prefixes containing an organization code or customer data.
- Manual number editing, gaps repair, or number reuse.
- Number allocation before the future receipt schema and guarded creation
  contract are approved.

## Gates that remain closed

This freeze does **not** authorize a migration, schema, sequence allocation,
receipt creation RPC, document write, payment/order/refund mutation, tax
calculation, PDF/e-Tax delivery, Portal UI, or Production activation.

## Next required decision

Proceed to **Part 3 Immutable Document Snapshot** to freeze the fields copied
from order/payment/customer sources, historical immutability, and the
document-to-source consistency rules before ER/schema design.
