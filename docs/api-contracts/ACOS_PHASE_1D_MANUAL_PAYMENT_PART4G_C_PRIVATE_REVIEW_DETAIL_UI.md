# ACOS Phase 1D Manual Payment Part 4G-C: Private Review Detail UI

**Status:** IMPLEMENTED LOCALLY / VALIDATED

## Scope

Part 4G-C adds the private, read-only review detail route:

`/admin/payments/review/[paymentTransactionId]`

The page is a server-rendered detail view for an opaque canonical transaction ID. It uses the existing `createManualPaymentReviewService().getReview()` boundary and requires the service's existing `payment.view` and `payment.verify` checks.

## Privacy and cache boundary

- The route is `force-dynamic`, `revalidate = 0`, `force-no-store`, and calls `noStore()`.
- Metadata is static and `noindex,nofollow`; it does not contain route parameters or private fields.
- The URL contains only the canonical opaque `paymentTransactionId`.
- Payment reference is rendered only in the protected detail body. It is not emitted to metadata, analytics, browser storage, or client-side action state.
- The page does not display customer contact data, addresses, bank data, provider data, or unrelated order detail.

## Display allowlist

The detail view may display the immutable amount/currency, submitted and due timestamps, normalized payment reference, canonical transaction/payment/proof/order IDs, and transaction/proof/order/payment statuses returned by the guarded read service.

## Action boundary

Approval, rejection, confirmation dialogs, feature activation, and any write path remain outside this part. The page only explains that guarded actions arrive in Part 4G-D; it contains no submit controls and does not call `verifyReview` or `rejectReview`.

## Validation and delivery

Static tests cover the route boundary, no-store settings, service-only read path, metadata privacy, display allowlist, absent action controls, bilingual copy, and the queue-to-detail opaque link. Local lint, typecheck, build, and controlled HTTP states are required before commit. No migration or Production change is authorized by this part.
