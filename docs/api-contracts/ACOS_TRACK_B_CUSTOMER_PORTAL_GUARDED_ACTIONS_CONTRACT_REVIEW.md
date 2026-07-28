# Track B Customer Portal Guarded Actions Contract Review

**Task:** `PORTAL-P1-GUARDED-ACTIONS-001`  
**Status:** CONTRACT REVIEW COMPLETE / IMPLEMENTATION GATED  
**Depends on:** Customer Portal read boundary, identity merge policy, consent and commerce source contracts

## Purpose

Define the next Customer Portal mutations without opening write paths prematurely. The existing `/portal` route remains read-only and continues to use `api_get_customer_portal_snapshot`.

## Action Matrix

| Action | Priority | Current decision | Main dependency | Migration | Event/audit/ledger/consent/entitlement | Validation |
|---|---:|---|---|---|---|---|
| Notification mark-read | P1 | Blocked for source mapping | Customer notification recipient relation; current notifications target profiles | No, if existing recipient relation is reused | Audit optional; no ledger; no consent | recipient isolation, idempotency, cross-tenant denial |
| Profile contact edit | P1 | Owner approval required | PII field policy, verification/re-authentication, customer master ownership | Prefer no; guarded RPC only | audit required; consent impact review | field allowlist, verified contact, history, tenant isolation |
| Address add/update/archive | P1 | Owner approval required | Customer address ownership and fulfillment snapshot policy | Prefer no; guarded RPC only | audit required; no ledger; order snapshot immutability | ownership, default-address uniqueness, order isolation |
| Consent update | P1 | Owner approval required | Consent/suppression policy and provider dispatch boundary | Prefer no; guarded RPC only | append-only consent event, suppression, messaging entitlement/cost checks | status timestamps, purpose/channel scope, idempotency, dispatch recheck |
| Coupon claim/redeem | P2 | Blocked | Coupon reservation/redemption semantics and order/cart lifecycle | Likely no if existing tables suffice | audit plus coupon redemption ledger; entitlement if commercial policy applies | race safety, duplicate redemption, expiry, customer scope |
| Loyalty redemption | P2 | Blocked | Loyalty ledger and order/payment settlement contract | Likely no if existing ledger suffices | append-only ledger and audit; entitlement check | balance race, reversal, expiry, order linkage |

## Guardrails

- Every mutation must resolve `auth.uid()` to the active profile and active customer link server-side.
- A browser-supplied `customer_id` cannot establish authority.
- Every tenant predicate must include `organization_id` and every mutation must be idempotent.
- Browser clients receive only an authenticated server action or RPC; source-table writes remain revoked.
- Customer edits must not rewrite historical order snapshots, payment records, fulfillment records, or loyalty transactions.
- Consent writes must not send messages directly; provider dispatch must recheck consent and suppression.
- Coupon and loyalty actions must not be implemented before their ledger/race semantics are approved.

## Implementation Order

1. Resolve the notification recipient mapping gap or explicitly defer notification actions.
2. Obtain Owner decisions for profile contact, address, and consent mutation policies.
3. Implement the lowest-risk approved action as a guarded RPC with audit and focused validation.
4. Review coupon and loyalty mutations separately because they affect commercial and financial correctness.

No migration or production write code is created by this review.
