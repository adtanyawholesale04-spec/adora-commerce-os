# Phase 1D Manual Payment Part 3D Storefront Submission UI Contract Review

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART3D-UI-CONTRACT`
**Status:** OWNER APPROVED / MU01-MU24 FROZEN / PART 3D-B IMPLEMENTED / LOCAL VALIDATED
**Prepared:** 2026-08-01
**Depends On:** Owner-frozen MS01-MS24 and locally validated Part 3C submission service
**Migration:** Guarded read migration `20260801054812_phase_1d_manual_payment_guarded_payment_snapshot.sql` is locally validated and not applied to Production
**Runtime / UI Implementation:** Part 3D-B server read model and guarded route/form implemented locally
**Storage / Bank Configuration / Staff Review / Production:** Not authorized

## Objective

Define the customer-facing Storefront contract for submitting a reference-only
manual bank-transfer claim. The experience must show canonical owned-order
truth, preserve the existing bilingual light/dark Storefront shell, communicate
that a submission is awaiting staff review and keep bank references out of
URLs, logs, browser persistence and read models.

The review stage itself created no route, component, read RPC, migration,
translation key, feature activation, Storage object or Production change.
The later Owner-authorized Part 3D-A3 and Part 3D-B outcomes are recorded below.

## Repository And Dependency Reconciliation

At review time:

1. `src/lib/storefront/manual-payment.ts` and
   `submitStorefrontPaymentProofAction` implement the disabled-by-default
   submission path from MS01-MS24. No current UI imports the action.
2. The current Storefront has list and product-detail routes only. It has no
   authenticated customer order or payment route.
3. No existing guarded customer-owned read function returns the exact order,
   payment deadline and pending-proof snapshot required by this form.
4. Admin order reads require staff permissions and must not be reused as a
   customer boundary. Direct browser reads from `orders`, `payments`,
   `payment_transactions` or `payment_proofs` remain forbidden.
5. The current Phase 1C visual baseline uses the existing blue Storefront tokens,
   Noto Sans Thai, Thai/English copy and light/dark preferences. The
   untracked Brand Design System guide remains proposed direction, not authority
   to replace the frozen palette in this task.
6. No approved canonical bank-account instruction source exists. Part 3D must
   not invent account numbers, QR images, recipient names or transfer fees.

## Recommended Owner Decision Table

| ID | Topic | Recommended decision |
|---|---|---|
| MU01 | UI scope | Limit Part 3D to an authenticated customer-owned order payment page and reference-only claim form; exclude cart/checkout activation, file upload, bank configuration, staff review, settlement, provider and Production |
| MU02 | Route | Use `/store/[organizationSlug]/orders/[orderId]/payment`; treat the opaque order UUID only as a navigation key and never as authorization, and put no order number, amount, reference or payment identifier in query parameters |
| MU03 | Read boundary prerequisite | Before rendering the form, add one separately authorized forward-only authenticated guarded RPC and server-only read service that resolve active profile, same-tenant membership, customer link, entitlement and owned Storefront order |
| MU04 | Exact read snapshot | Return only order ID/number, order/payment/fulfillment status, currency, grand total, amount due, payment deadline, whether a pending reference-only attempt exists and its proof status; exclude customer contact, address, bank reference, cost, audit and internal metadata |
| MU05 | Eligibility | Enable the form only for an owned `STOREFRONT` order in `PENDING_CONFIRMATION` + `UNPAID` + `UNFULFILLED`, with positive full amount due and a future `payment_due_at`; every submit still rechecks Part 3A authority |
| MU06 | Bank instruction posture | Display no bank account, QR, recipient or fee until a separate canonical bank-instruction contract is approved; explain that this screen records a transfer reference already obtained through the store's approved payment instructions |
| MU07 | Form fields | Render one visible payment-reference text input and hidden order/request fields only; never render editable amount, currency, payment method, customer, status, proof metadata or organization UUID |
| MU08 | Reference UX | Label the reference as a bank transaction/reference code, show the 6-100 character `[A-Z0-9._/-]` rule, trim and uppercase for preview, preserve the customer's text while correcting and never translate it |
| MU09 | Request ID lifecycle | Generate one UUID when the customer starts an explicit submit intent, retain it through double click, network loss and retry, and generate a new UUID only after a terminal resolved intent or deliberate form reset |
| MU10 | Submit behavior | Use the existing Server Action through POST, disable the control while pending, set `aria-busy`, preserve the request ID and never call Supabase directly from a client component |
| MU11 | Success meaning | Present success only as “submitted for review” / “ส่งหลักฐานแล้ว รอตรวจสอบ”; never label it paid, confirmed, completed or settled and never change order/payment status optimistically |
| MU12 | Pending attempt | If a pending attempt already exists, replace the form with a non-destructive pending-review state and do not expose or re-display the stored bank reference |
| MU13 | Error mapping | Map only the MS14 codes to complete Thai/English copy; collapse `order_not_payable` into a non-enumerating unavailable state and never show raw database/provider text |
| MU14 | Retry affordance | Offer same-request retry only for `persistence_error`; reference invalid returns focus to the input, while expiry, conflict, pending attempt and request conflict require explicit non-automatic resolution |
| MU15 | Deadline display | Render the canonical server deadline in the selected locale and organization timezone; a client countdown is informational only and expiry authority remains the server/database clock |
| MU16 | Status semantics | Use the existing Amber pending/waiting token for unpaid and under-review states, Green only for canonically paid/confirmed truth, and danger only for expired/conflict/error; color never carries meaning alone |
| MU17 | Accessibility | Require persistent label/help/error associations, keyboard operation, visible focus, status live region, focus movement to the error summary, 44px mobile controls and reduced-motion compatibility |
| MU18 | Responsive layout | Use a mobile-first single-column order summary followed by one unframed form section; avoid nested cards, horizontal scrolling, oversized headings and layout shifts from errors/loading |
| MU19 | Visual authority | Reuse current Storefront tokens, typography, shell, spacing, icons and 8px-or-less radius; do not adopt the proposed purple palette or create page-local colors without a later visual-system freeze |
| MU20 | Language and theme | Add complete Thai and English translation keys for labels, help, states, errors and actions, and verify both light/dark themes; default remains the existing preference behavior |
| MU21 | Privacy | Set appropriate autocomplete off for the reference, keep it out of URL/cookie/localStorage/sessionStorage/analytics/logs, clear it after success and never render it from the read snapshot |
| MU22 | Offline and stale data | Disable submission while offline, announce the state, refresh canonical eligibility before/after action and never infer success from a lost response; retry uses the same request ID |
| MU23 | Rollout gate | Show the route/form only when authenticated, eligible and both checkout/manual-payment server flags permit it; server and database checks remain mandatory even if the UI is hidden |
| MU24 | Delivery sequence | After Owner freeze, deliver 3D-A guarded read contract/migration, 3D-B server read model and route/form, then 3D-C responsive/accessibility/E2E QA; each step requires focused tests and Production remains separately gated |

## Owner Decision Freeze

On 2026-08-01, the Project Owner approved the recommended values for
MU01-MU24 in full. This freezes the route, guarded-read prerequisite, exact
snapshot, eligibility, reference-only form, payment-truth, privacy, retry,
accessibility, responsive, bilingual, theme and delivery-sequence contracts.

This approval freezes decisions only. It does not authorize a read RPC,
forward-only migration, route, component, translation, feature activation,
bank configuration, Storage, staff review, Production apply or public rollout.

## Proposed Screen Structure

```text
Storefront shell
  -> private order breadcrumb and heading
  -> canonical order summary
     order number, amount due, payment deadline, pending status
  -> reference-only submission section
     persistent label + rule/help text
     payment reference input
     submit button
  -> controlled status/live region
  -> private support-safe next step
```

The summary and form are full-width content bands within the Storefront
container. They are not nested cards and do not display a bank destination
until a separate approved source exists.

## Proposed Controlled UI States

| State | UI posture | Action |
|---|---|---|
| Loading | Stable summary/form skeleton without sensitive placeholders | None |
| Eligible | Canonical summary plus empty reference field | Submit enabled when locally valid and online |
| Invalid reference | Inline error and focused field | Correct input; preserve request ID |
| Submitting | Button disabled, spinner/icon, `aria-busy=true` | No duplicate intent |
| Submitted | Amber pending-review confirmation; reference cleared | No optimistic paid state |
| Pending attempt | Read-only pending-review state | No second submission |
| Expired | Danger deadline state | No submit |
| Reference conflict | Privacy-safe correction/support state | No automatic retry |
| Request conflict | Explicit new-intent guidance | New request ID only after customer action |
| Persistence error | Error summary and retry control | Retry same request ID |
| Offline | Existing Storefront offline banner plus disabled submit | Resume when online; no inferred result |
| Unavailable/not owned | Non-enumerating not-found/unavailable state | No resource detail |

## Required Guarded Read Contract Before UI (Satisfied By Part 3D-A3)

The review required an Owner-approved guarded read design before Part 3D could
render. The approved boundary had to:

1. accept organization ID and order ID only;
2. execute for `authenticated` only with explicit revoke/grant posture;
3. resolve `auth.uid()`, active profile, membership and customer link;
4. require the same active Storefront/checkout entitlement posture as submit;
5. prove exact same-tenant customer ownership and lifecycle eligibility;
6. return the MU04 field allowlist and no bank reference; and
7. expose no direct table select or service-role authorization bypass.

The review did not create or authorize the expected forward-only migration.
Part 3D-A3 was later authorized and implemented that migration locally; it has
not been applied to Production.

## Validation Matrix

1. MU01-MU24 completeness and Owner freeze evidence;
2. guarded customer read denies anonymous, other customer and other tenant;
3. exact read snapshot contains no reference/contact/address/internal fields;
4. route treats order ID as navigation only and fails closed on ownership;
5. action receives exactly the MS07 fields and browser performs no RPC/table write;
6. stable request ID survives double click, offline and lost-response retry;
7. all MS14 results have complete Thai/English copy;
8. success/pending never renders paid or confirmed language;
9. reference never enters URL, storage, telemetry, logs or subsequent HTML;
10. deadline/status are canonical and no optimistic financial mutation occurs;
11. 320px through wide desktop, light/dark and Thai/English visual QA;
12. keyboard, focus, live region, contrast and reduced-motion QA;
13. feature disabled, kill switch, anonymous and ineligible states fail closed;
14. existing Storefront and Manual Payment regressions pass; and
15. lint, typecheck, static tests and build pass.

## Remaining Blocked Gates

- Part 3D-C responsive, accessibility and workflow QA;
- canonical bank instruction configuration;
- private binary proof Storage and retention;
- staff verification, settlement and failure workflows;
- Production preflight/apply and public activation; and
- P16 full recovery closure.

## Review Outcome

At review completion, the submission action was locally ready but a safe
customer UI still required a customer-owned read boundary. MU01-MU24 preserve
the existing Storefront visual baseline, prevent financial-status
misrepresentation, keep the bank reference private and sequence the remaining
work without inventing bank data or exposing Commerce Core tables. The later
Part 3D-A3 and Part 3D-B outcomes satisfy the guarded-read and route/form stages.

## Part 3D-B Implementation Outcome

On 2026-08-01, the Owner separately authorized Part 3D-B. The implementation
adds an authenticated cookie-session snapshot service, the approved private
payment route, an exact reference-only Server Action form, bilingual copy and
feature-gated pending/expired/closed states. The request UUID remains stable
through same-intent retries, the bank reference is absent from URLs, cookies,
browser storage and read responses, and no direct browser Supabase access was
added. Checkout and Manual Payment flags remain disabled by default. No schema,
bank configuration, binary Storage, staff review, settlement or Production
change was made.
