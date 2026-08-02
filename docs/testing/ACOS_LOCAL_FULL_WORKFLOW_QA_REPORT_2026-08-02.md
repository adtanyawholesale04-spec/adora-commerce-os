# ACOS Local Full Workflow QA Report 2026-08-02

**Task:** Local Full Workflow QA
**Scope:** Storefront -> Checkout -> Manual Payment Submission -> Admin Review
**Environment:** Local Supabase Docker stack and `http://127.0.0.1:3000`
**Status:** VALIDATED LOCALLY / FOLLOW-UP FIX VALIDATED / LOCAL RC UI-UX PASS VALIDATED / PRODUCTION NOT APPLIED

## Clean Replay Re-run 2026-08-02

The local Supabase stack was reset and replayed from the repository migration
set before the workflow suites. All 99 local migrations applied successfully,
and the checkout foundation preflight passed before the browser-only QA
fixture was seeded. The fixture intentionally grants `storefront.checkout`
only to the local QA organization so the browser workflow can be exercised;
it is not part of the migration or Production state.

```text
Static regression: 397/397 PASS
Storefront boundary: PASS
Checkout foundation + lint: PASS
Promotion evaluator + lint: PASS
Guarded cart + concurrency: PASS
Atomic checkout + coupon race: PASS
Manual payment schema + concurrency: PASS
Customer submission + retry/expiry races: PASS
Guarded payment snapshot + concurrency: PASS
Staff review reads + lint: PASS
Staff review actions + race + lint: PASS
Integrated security/workflows/Commerce suites: PASS
Production changes: NONE
```

## Boundary

This run covered the local-only customer and staff workflow using the existing
canonical Product, Cart, Order, Payment, Inventory, Customer and Audit sources.
No new customer, product, order or payment source was created. No Production
database, provider, Vercel project or public activation was changed.

## Validation Results

```text
Storefront boundary: PASS
Checkout foundation and database lint: PASS
Promotion evaluator and database lint: PASS
Guarded cart and concurrency/idempotency: PASS
Atomic checkout and coupon race: PASS
Manual-payment additive schema and concurrency: PASS
Customer submission, retry race and expiry race: PASS
Guarded payment snapshot and concurrency: PASS
Staff review reads, permission and private-field scope: PASS
Staff review approve/reject, settlement, audit, idempotency and race: PASS
Staff review detail null-maker regression (`self_review: false`): PASS
Supabase security suite: PASS
Supabase workflow suite: PASS
Carrier webhook E2E and duplicate handling: PASS
Commerce integration suite: PASS
HTTP route smoke (`/`, `/signup`, `/admin`, `/admin/payments`,
  `/admin/payments/review`, `/store/acos-local-qa`): PASS / HTTP 200
```

## Local Release Candidate UI/UX Pass

```text
Permission-aware navigation: PASS
Thai/English navigation and guardrail copy: PASS
Light/dark preference persistence: PASS after reload
Sticky Admin header and bounded sidebar scroll: PASS
Payments empty states: PASS / semantic status presentation
```

The Admin shell now renders unauthorized modules as non-interactive boundary
items, while authorized modules remain real links. Navigation labels, action
boundaries and guardrails use the selected locale. Payments list, transaction
and refund sections use a consistent empty-state treatment without changing
their read model or action boundary.

The local QA identity was recreated after the approved local reset:

```text
email: ceoacos@example.com
organization: ACOS Local QA
membership: ACTIVE
role: LOCAL_QA_ADMIN
permission count: 14
payment permissions: payment.view, payment.verify
```

## Security And Integrity Checks

- Customer actions remained authenticated, customer-owned and tenant-scoped.
- Staff review reads required the approved permission boundaries and kept
  private payment evidence out of the queue and URL.
- Approve/reject actions preserved atomic settlement or rejection truth,
  append-only audit evidence and dedicated idempotency behavior.
- Direct browser table writes, anonymous access and cross-tenant access stayed
  denied in the focused and combined suites.
- The Fulfillment assignment forward-fix remained clean under local database
  lint; historical migrations were unchanged.

## Browser Note

The final authenticated browser replay passed after the forward-only fix. The
reproducible local fixture is restored with `npm run seed:local-admin-qa`,
which creates the Auth user through the local Auth Admin API before applying
the tenant-scoped SQL fixture.

The browser replay itself:
`/admin` -> `Payments` -> `Review` -> `Details` opened the seeded pending
transaction and rendered the private reference, amount, statuses and guarded
controls without the unavailable-queue state. The connected browser could not
complete the Turnstile-backed UI Magic Link form, so the local Auth callback
was completed with a one-time local QA token generated in memory; no token or
cookie was printed. Approve/reject was intentionally not clicked so the
pending fixture remains reusable for the next QA pass.

The UI pass additionally verified the authenticated Admin shell, Payments and
Review/Details route in the local browser. The in-app browser can show a
transient error page during a Server Action preference redirect; reloading the
same route confirmed the persisted theme state and the server returned HTTP
200. This is recorded as a browser-tool limitation, not a product data or
authorization failure.

The clean replay browser pass confirmed the same route sequence after fixture
recreation: `/admin` -> `Payments` -> `Review` -> `Details`. The private
reference `LOCAL-QA-REFERENCE-001`, amount, payment/order statuses and guarded
controls rendered correctly. The rejection dialog opened with focus in the
bounded reason field and was cancelled without mutating the pending fixture;
browser console errors were empty for the final authenticated pass.

## Production Disposition

```text
Production migration: NOT APPLIED
Production data: NOT CHANGED
Production provider settings: NOT CHANGED
Vercel/public activation: NOT CHANGED
P16 recovery gate: BLOCKED / DEFERRED
```

## Next Local Gate

Local Full Workflow QA and the Local Release Candidate UI/UX pass are
validated. The next roadmap gate is P16 recovery and Production change-window
preparation, which remains separately blocked and requires paid-provider
approval. No Production migration, provider activation or public traffic is
authorized by this report.
