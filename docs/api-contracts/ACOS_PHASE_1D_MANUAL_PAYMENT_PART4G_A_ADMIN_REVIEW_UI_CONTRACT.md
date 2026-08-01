# Phase 1D Manual Payment Part 4G-A Admin Review UI Contract

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART4G-A`

**Prepared Date:** 2026-08-01

**Status:** CONTRACT PREPARED / UI01-UI30 RECOMMENDED / OWNER FREEZE REQUIRED

**Depends On:** Owner-frozen RV01-RV24 and RM01-RM30; locally validated Parts 4D-4F

**Runtime UI / Feature Activation / Migration / Production:** NOT AUTHORIZED

## 1. Objective

Define the routes, information hierarchy, responsive behavior, permission-aware
affordances and privacy states for the Admin manual-payment review workflow.
This design reuses the guarded Part 4F service and creates no route, component,
Server Action, SQL, feature activation or Production change.

The work surface follows the Brand Guide direction of Commerce Trust plus
Operational Clarity: compact operational layout, Noto Sans Thai, bilingual
copy, light/dark design tokens, consistent payment status colors and no
marketing-style hero or decorative card composition.

## 2. Recommended Owner Decisions

| ID | Decision | Recommended safe value |
|---|---|---|
| UI01 | Workflow entry | Add one permission-aware `Manual payment review` command to `/admin/payments`; keep the existing page a general read-only dashboard |
| UI02 | Queue route | Use `/admin/payments/review` as the dedicated review queue |
| UI03 | Detail route | Use `/admin/payments/review/[paymentTransactionId]`; the path accepts one opaque UUID only |
| UI04 | URL privacy | Never place payment reference, reason, amount, bank data, proof ID, customer data or terminal result in path/query/hash |
| UI05 | Queue permission | Render queue content with `payment.view`; hide verify/reject affordances without `payment.verify` |
| UI06 | Detail permission | Require `payment.view` and `payment.verify`; unauthorized, cross-tenant, stale and missing records share one non-enumerating unavailable state |
| UI07 | Queue source | Call only `listReviews`; do not query Supabase from a Client Component or join canonical tables in the page |
| UI08 | Detail source | Call only `getReview`; do not derive review eligibility or financial truth in the browser |
| UI09 | Queue content | Show submitted time, deadline, amount/currency and opaque transaction identity; omit normalized reference and all customer/private fields |
| UI10 | Queue ordering | Preserve oldest-first server ordering; do not add client sort, total count or bulk selection |
| UI11 | Pagination | Use bounded keyset continuation from `nextCursor`; validate cursor fields server-side and never use offset pagination |
| UI12 | Queue interaction | Row command opens the private detail page; no approve/reject action appears directly in a queue row |
| UI13 | Desktop queue layout | Use a compact full-width operational table with stable identity, amount, submitted, deadline, eligibility and detail-command columns |
| UI14 | Mobile queue layout | Replace the table with un-nested list rows/cards that retain identity, status, amount, deadline and the detail command |
| UI15 | Detail cache | Force dynamic rendering and `no-store`; never prefetch, cache or persist the normalized reference |
| UI16 | Detail hierarchy | Show status and amount first, then submitted/deadline times, opaque canonical IDs and one clearly labelled private reference region |
| UI17 | Private reference controls | Render reference as text only; do not add copy, export, print, analytics, telemetry or browser-storage behavior in this phase |
| UI18 | Action placement | Put verify and reject in one stable detail action bar; verify is the single primary command and reject uses the danger treatment |
| UI19 | Action confirmation | Each action opens its own accessible confirmation modal; no one-click financial mutation |
| UI20 | Reason input | Require 8-500 trimmed characters, show remaining/validation feedback and forbid private/payment secret examples in helper copy |
| UI21 | Request identity | Generate one UUID when a valid action intent is confirmed; retain it for exact network retry and replace it when action or reason changes |
| UI22 | Pending behavior | Disable both actions, route navigation and duplicate submit while the selected action is pending; announce progress without optimistic settlement |
| UI23 | Success behavior | Trust only the bounded action result, show the terminal state without the reference/reason, then refresh or return to the reference-free queue |
| UI24 | Failure behavior | Map only controlled application codes to bilingual messages; never render raw database, tenant, proof, bank or membership detail |
| UI25 | Retry behavior | Retry only codes marked retryable and preserve the exact action/reason/request UUID; conflicts require a fresh server read |
| UI26 | State coverage | Design loading, empty, filtered-empty, unavailable, permission-denied, feature-disabled, expired, self-review, pending, success, failed and offline states |
| UI27 | Language and theme | Provide complete Thai/English copy and light/dark token pairs; user-entered reference and reason are never translated |
| UI28 | Accessibility | Preserve semantic headings/table labels, visible focus, keyboard modal flow, focus return, `aria-live`, reduced motion and 44 px touch targets |
| UI29 | Responsive QA | Validate 320, 390, 768, 1024 and 1440 px with no overlap, clipped actions, layout shift or unreadable private data |
| UI30 | Delivery sequence | Owner-freeze this table, then implement queue, private detail, guarded actions and finally local feature activation/browser QA as separate approvals |

## 3. Route And Component Map

```text
/admin/payments
  -> permission-aware link to review queue

/admin/payments/review
  -> server-rendered queue shell
  -> reference-free review table or mobile list
  -> bounded keyset continuation

/admin/payments/review/[paymentTransactionId]
  -> server-rendered private detail with no-store
  -> payment review summary
  -> private reference region
  -> permission-aware action bar
  -> verify confirmation modal OR reject confirmation modal
```

Expected implementation modules after Owner freeze:

```text
src/app/admin/payments/review/page.tsx
src/app/admin/payments/review/[paymentTransactionId]/page.tsx
src/app/admin/payments/review/_components/review-queue.tsx
src/app/admin/payments/review/_components/review-action-dialog.tsx
src/lib/admin/i18n.ts
src/app/globals.css only when existing tokens/components cannot express the design
```

The Part 4F service and existing explicit Server Actions remain authoritative.
No duplicate payment, order, customer, permission or audit source is allowed.

## 4. State And Error Presentation

| Service state/code | UI posture |
|---|---|
| `feature_disabled` | Closed feature panel; no private detail or action controls |
| `anonymous` | Generic sign-in-required state without candidate detail |
| `missing_membership` | Generic organization-access state |
| `permission_denied` | Queue may remain readable only where `payment.view` allows; private detail/actions remain absent |
| `review_not_found` | Non-enumerating unavailable page; no existence hint |
| `self_review_denied` | Blocked review message with no maker identity disclosure |
| `reason_invalid` | Inline reason validation; retain no submitted private text in URL/storage |
| `state_conflict`, `already_reviewed`, `payment_expired` | Require fresh server read before another action |
| consistency failures | Generic protected-consistency message; no internal values |
| `idempotency_conflict` | Stop automatic retry and require a fresh intent |
| `review_failed`, `unexpected_error` | Generic failure and controlled retry only when service marks retryable |

The UI must never infer success from navigation, timeout or optimistic state.
Committed database output remains the only financial truth.

## 5. Privacy And Security Invariants

- The queue, URL, metadata, logs, analytics and browser storage remain
  reference-free.
- The private detail is server-fetched, no-store and not prefetched.
- Browser input remains exactly transaction UUID, `PENDING`, reason and request
  UUID. Organization, reviewer, amount, currency and terminal states are never
  browser authority.
- Permission-aware affordances improve usability only. Database functions
  remain the final authorization, tenant, state and settlement boundary.
- No bulk review, inline mutation, direct table write, browser Supabase RPC,
  service-role credential or unrestricted metadata is introduced.

## 6. Validation Gates For Later Parts

### Part 4G-B Queue

- queue route and entry affordance tests;
- `payment.view` allow/deny and feature/kill-switch closure;
- reference absence from HTML, URL, metadata, logs and browser storage;
- oldest-first keyset paging at allowed limits; and
- Thai/English, light/dark, empty/error and 320-1440 px checks.

### Part 4G-C Private Detail

- both-permission gate and cross-tenant/missing non-enumeration;
- dynamic/no-store/no-prefetch assertions;
- private reference absence outside the bounded detail region; and
- expired, self-review and stale-candidate states.

### Part 4G-D Actions

- semantic confirmation, reason boundary and stable retry UUID;
- no duplicate submit or optimistic financial truth;
- controlled result/error mapping and focus restoration;
- real Auth/RLS approve/reject/idempotency/race workflows; and
- proof that reference/reason never reaches URL, logs, analytics or storage.

## 7. Non-Scope

- route/component/action-dialog implementation;
- local feature activation or browser workflow execution;
- migration, database repair or Production apply;
- bank instruction configuration or binary proof Storage;
- partial/over/under payment, reversal, refund, provider or notification flow;
- customer contact/address display, export, print, copy-reference or bulk review.

## 8. Approval Gate

UI01-UI30 are recommendations prepared for Owner review. They are not frozen by
the authorization to prepare Part 4G-A. Implementation must remain stopped
until the Project Owner explicitly approves the recommended decision table.

