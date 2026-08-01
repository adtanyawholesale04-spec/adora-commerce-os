# Phase 1D Manual Payment Part 4G-B Admin Review Queue UI

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART4G-B`

**Implementation Date:** 2026-08-01

**Status:** IMPLEMENTED LOCALLY / VALIDATED

**Depends On:** Owner-frozen UI01-UI30; locally validated Parts 4D-4F

**Private Detail / Actions / Feature Activation / Migration / Production:** NOT AUTHORIZED

## Objective

Implement the dedicated Admin manual-payment review queue without exposing a
payment reference, widening database access or enabling a financial action.

## Implemented Boundary

`/admin/payments/review` is a force-dynamic Server Component that calls only
the Part 4F `listReviews` service with a bounded limit of 25. It renders the
oldest-first response exactly as supplied by the guarded database boundary.
The page does not call Supabase directly, derive eligibility in the browser or
request a total count.

The queue displays only:

```text
opaque payment transaction identity
amount and currency
submitted time
payment deadline
review eligibility
```

Payment reference, reason, proof/payment/order IDs, customer data, bank data,
metadata and provider payload are not rendered. Detail controls remain visibly
disabled until the separately approved Part 4G-C private-detail route exists.

## Permission And Feature Posture

- `listReviews` remains the authority for active tenant, membership and
  `payment.view` authorization.
- The Payments entry command appears only when the active context contains
  `payment.view` and the server feature/kill-switch gate is open.
- The repository feature defaults remain closed. This task does not activate
  local or Production access.
- `payment.verify` does not create queue-row action controls. Verify and reject
  remain absent.

## Pagination And URL Contract

The queue uses only the guarded `nextCursor` fields:

```text
cursorSubmittedAt
cursorTransactionId
```

Both values are passed back to the strict service parser. No offset, total
count, reference, amount, proof ID, customer field or action result enters the
URL. Invalid or partial cursors collapse to the controlled unavailable state.

## UX And Accessibility

- compact operational table on desktop and un-nested list items on mobile;
- Thai/English copy, light/dark design tokens and Noto Sans Thai inherited from
  the Admin visual system;
- semantic table/heading structure, visible focus and minimum 44 px commands;
- loading, empty, disabled, anonymous, membership, permission, unavailable and
  controlled error states;
- payment status is communicated by text as well as color; and
- reduced-motion behavior is inherited from the global design tokens.

## Validation

Validation covers route/source isolation, feature and permission-aware entry,
reference/private-field absence, exact keyset URL fields, bounded page size,
disabled detail posture, bilingual copy, responsive layouts and authoritative
status reconciliation.

## Non-Scope

- private detail read or `/admin/payments/review/[paymentTransactionId]` route;
- verify/reject confirmation, reason form or action invocation;
- local feature activation and real Auth/RLS browser workflow QA;
- SQL, database repair, Storage, bank configuration or Production apply.

