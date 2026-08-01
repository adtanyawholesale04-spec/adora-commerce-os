# ACOS Phase 1D Manual Payment Part 4G-D: Guarded Review Action UI

**Status:** IMPLEMENTED LOCALLY / VALIDATED

## Scope

Part 4G-D adds the permission-aware review action bar to the private detail route. It provides separate Approve and Reject commands, each with an accessible confirmation dialog and a required trimmed reason of 8-500 characters.

The UI calls only the existing server actions in `src/app/admin/payments/actions.ts`, which delegate to the existing `createManualPaymentReviewService().verifyReview()` and `.rejectReview()` boundaries. No duplicate payment, order, audit, permission, or RPC source is introduced.

## Frozen safety behavior

- The detail page remains server-rendered and no-store; the Client Component receives only the opaque transaction ID, `canReview`, and copy.
- Browser authority is limited to transaction UUID, expected `PENDING`, reason, and request UUID. Organization, actor, amount, payment reference, and terminal status remain server-owned.
- A new request UUID is generated when the selected action or reason changes and is retained for exact retry of the same intent.
- Both action buttons and navigation are disabled while a submission is pending. No optimistic payment, order, allocation, coupon, or inventory state is rendered.
- Success is shown only from the bounded server action result and the page is refreshed. Controlled conflicts and non-retryable failures do not auto-retry; retryable failures preserve the same intent.
- Reference, reason, terminal result, and internal error detail are excluded from URL, metadata, analytics, browser storage, and client logs.

## Non-scope and gates

This part does not activate the feature flag, execute a real Auth/RLS workflow, apply migration, alter Production, configure bank instructions, or add proof Storage. Local feature activation and real browser workflow QA require the next explicit approval.

## Validation

Static tests cover action-boundary imports, modal semantics, reason/request identity behavior, duplicate-submit prevention, controlled error mapping, privacy exclusions, bilingual copy, and status reconciliation. Local lint, typecheck, build, and controlled HTTP states are required before delivery.
