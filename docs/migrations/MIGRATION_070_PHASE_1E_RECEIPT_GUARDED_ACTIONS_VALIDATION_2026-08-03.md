# Migration 070 Phase 1E Receipt Guarded Actions Validation

**Date:** 2026-08-03

**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

**Migration:** `20260802191541_phase_1e_receipt_guarded_actions.sql`

## Scope

Implements only the Owner-approved Part 7 Layer B Receipt mutations:

- `api_create_receipt_document(uuid,uuid,uuid,uuid)`
- `api_void_receipt_document(uuid,uuid,text,uuid)`
- `api_reverse_receipt_document(uuid,uuid,text,uuid,uuid,uuid)`

The authenticated guarded boundaries derive immutable Receipt snapshots from
locked canonical order, payment, transaction, refund, customer and address
sources. They reuse the existing idempotency and audit masters, allocate
document numbers through the protected helper, and preserve the frozen
ISSUED, VOID and REVERSED lifecycle.

Layer B creates no read RPC, role mapping, UI, PDF, delivery job, payment,
refund, order, ledger, entitlement, Production row or public activation.

## Security Contract

- Every exposed mutation is `SECURITY DEFINER` with an empty search path,
  owned by `postgres`, and executable only by `authenticated`.
- Every internal helper is `SECURITY INVOKER` and non-executable by API roles.
- Each mutation validates Auth, active profile, active organization
  membership and its exact `finance.document.*` permission internally.
- Receipt tables remain unavailable for direct API-role access.
- Create, replacement, void and reverse use canonical tenant-scoped locks,
  sanitized audit payloads and terminal idempotency evidence.
- Reversal requires exactly one completed full-refund or matching reversed
  payment-transaction source.
- No guarded action changes canonical order, payment, transaction, refund,
  inventory, coupon, ledger, consent or entitlement state.

## Local Evidence

| Gate | Result |
|---|---|
| CLI-generated forward migration and count-only preflight | PASS |
| Fresh replay from migration 001 through Layer B | PASS |
| Exact function signatures, ownership, volatility and search path | PASS |
| Exact authenticated grants and internal-helper closure | PASS |
| Anonymous, inactive-profile, permission and cross-tenant denial | PASS |
| Eligible create, billing/shipping fallback and immutable line snapshot | PASS |
| Ineligible amount, state, transaction, currency and address denial | PASS |
| Same-request replay and changed-intent conflict | PASS |
| Void, refund reversal, transaction reversal and replacement lifecycle | PASS |
| Concurrent same-request create | PASS |
| Concurrent different-request create on one payment | PASS |
| Concurrent void/reverse on one document | PASS |
| Terminal idempotency, sequence, audit and source-immutability evidence | PASS |
| Supabase database lint | PASS |
| Receipt Layer A regression | PASS |
| Atomic Checkout and coupon concurrency regression | PASS |
| Manual Payment schema/concurrency and Staff Review action/race regressions | PASS |
| Supabase security/workflow and Commerce integration regressions | PASS |
| Repository tests (433/433), ESLint and TypeScript | PASS |
| Next.js production build | PASS |
| Linked migration list: zero remote-only drift; Layer B remains local-only | PASS |

The linked project has 102 local migrations. Sixteen are local-only, ending
with the Layer A and Layer B Receipt migrations, and there is zero remote-only
drift. No migration push or Production SQL was executed.

## Deferred Gates

- Layer C permission-scoped staff reads and active-customer-owned Portal reads.
- Permission-to-role assignment and organization entitlement rollout.
- Receipt runtime service, Admin/Portal UI, PDF/download, provider delivery,
  notification and public activation.
- Production migration apply; P16 recovery execution, Vercel Production
  environment inventory, migration change window and explicit Owner apply
  approval remain mandatory.
