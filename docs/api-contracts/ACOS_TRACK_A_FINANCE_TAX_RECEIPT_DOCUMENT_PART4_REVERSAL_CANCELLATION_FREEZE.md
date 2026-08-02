# ACOS Track A Finance & Tax Receipt Document Part 4 Reversal/Cancellation Freeze

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART4`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-03
**Depends on:** Parts 0-3 Receipt scope, eligibility, numbering, and snapshot

## Owner decision

An issued Receipt is never edited or deleted. Corrections and financial
reversals are represented by guarded lifecycle events and, when needed, a new
linked document with a new number.

## Lifecycle meanings

### `VOID`

Use `VOID` when the document itself is invalid or created from a clerical or
document-construction error. Void requires a bounded reason, authorized actor,
tenant scope, and audit evidence. Void does not claim that money was refunded
or reverse a payment.

### `REVERSED`

Use `REVERSED` only when an approved payment/refund/reversal boundary provides
matching financial evidence. Reversal is not a substitute for processing a
refund, and the Receipt boundary must not initiate a refund itself.

### Replacement document

A replacement or correcting document receives the next available document
number and links to the original through the future approved document relation.
The original Receipt remains unchanged and visible in its historical state.

## Allowed transition rules

```text
ISSUED   -> VOID       with document-error reason and audit
ISSUED   -> REVERSED   with approved refund/reversal evidence and audit
VOID     -> terminal
REVERSED -> terminal
```

The same terminal transition is idempotent for the same request identity. A
different request cannot overwrite a terminal result or create a second
replacement for the same correction without an explicit guarded decision.

## Automatic behavior that is forbidden

- Order cancellation does not automatically void a Receipt.
- Refund creation does not silently edit or delete a Receipt.
- Payment reversal does not directly mutate the document snapshot.
- A failed or pending payment cannot create a reversal or Receipt status.
- Browser status edits, generic update RPCs, and direct table writes are
  forbidden.

## Evidence and audit requirements

Every future void/reversal action must verify:

1. the Receipt, order, payment, and organization are consistent;
2. the actor has the separately frozen finance/document permission;
3. `VOID` has a bounded document-error reason;
4. `REVERSED` has a matching approved refund/reversal identifier and amount;
5. a stable idempotency/request identity is present; and
6. the lifecycle event, actor, reason, source reference, and before/after state
   are recorded in sanitized append-only audit evidence.

The reversal action records document evidence only. Money movement remains in
the canonical payment/refund/ledger boundary and is never duplicated here.

## Privacy and tenant rules

- Every action is scoped to `organization_id`.
- Customer Portal may read the resulting document state only through a future
  ownership-scoped projection.
- Bank details, proof payloads, provider secrets, raw provider responses, and
  unrelated finance records are excluded from customer-facing responses.

## Explicitly deferred

- Credit Note and Debit Note document types.
- Tax/VAT correction rules.
- Supplier Bill and expense reversal.
- PDF/e-Tax regeneration and external provider delivery.
- Automatic refund orchestration and accounting export.

## Gates that remain closed

This freeze does **not** authorize a migration, status column, reversal RPC,
refund write, ledger mutation, document relation, UI action, PDF generation,
provider call, or Production activation.

## Next required decision

Proceed to **Part 5 Security, Audit and Portal Read Contract** to freeze finance
permissions, RLS/tenant scope, audit payload, and customer-facing document
visibility before ER/schema design.
