# Track B Identity Merge Policy

**Task:** `C2C-P0-IDENTITY-MERGE-001`  
**Phase:** Phase 0 — Foundation Alignment  
**Status:** OWNER APPROVED / RUNTIME NOT ENABLED  
**Approved:** 2026-07-29

## Policy Decision

ACOS will not merge customer identities automatically. Matching email, phone, provider identity, display name, or device signal may create a review candidate only; it is never sufficient to perform a merge.

Cross-organization customer-row merges are forbidden. A central authenticated profile may have memberships in multiple organizations, but each organization keeps its own tenant-scoped `customers` row until a separately approved cross-store identity-link contract exists.

## Allowed Merge Boundary

A merge may be considered only when all conditions are true:

1. Source and target customers belong to the same `organization_id`.
2. Source and target are different, existing, non-merged customers.
3. The actor is authenticated, has the approved `customer.merge` permission, and has an active membership in that organization.
4. The actor supplies an explicit reason and a request idempotency key.
5. The merge is an explicit guarded server action or RPC; browser table writes are forbidden.
6. Every child-record category affected by the merge has a reviewed mapping rule. If any category is unsupported or ambiguous, the merge is rejected.
7. Every successful operation writes append-only `customer_merge_history` and an audit event with source, target, actor, organization, reason, and request identity.

## Candidate vs Execution

| Operation | Allowed now | Behavior |
|---|---:|---|
| Normalize email/phone for candidate search | Contract only | Candidate generation; no merge side effect |
| Show possible duplicate to authorized staff | Contract only | Tenant-scoped, permission-gated, audit/observability required |
| Automatic merge by matching fields | No | Permanently forbidden by this policy |
| Cross-organization merge | No | Reject; do not move private data across tenants |
| Manual same-organization merge | Future guarded action | Requires all allowed-boundary checks and a separate implementation/validation gate |
| Undo/reversal | Not defined | Requires a separate Owner-approved contract before any merge runtime |

## Data Safety Rules

- The canonical customer master remains `public.customers`.
- The source row is not deleted. A successful merge may mark it `MERGED` and set `merged_into_customer_id` only through the future guarded boundary.
- Existing orders, payments, refunds, loyalty transactions, audit logs, and other financial history remain immutable and retain their original organization and historical references.
- No balance, points, commission, wallet, payment, or order amount may be recomputed or moved by a merge without a separate ledger/reversal contract.
- Customer addresses, tags, channel identities, consents, suppressions, notifications, content authorship, and attribution records require explicit category rules. Until those rules are approved, a merge containing an affected category must be rejected rather than guessed.
- Public profile data is never populated from private account fields as a side effect of a merge.

## Required Future Guarded Contract

The implementation contract must define exact actor/source/target guards, supported child-record categories, deterministic conflicts, same-tenant RLS, permission behavior, idempotency, append-only audit evidence, failure atomicity, controlled errors, and cross-tenant/financial-history fixtures.

## Migration Position

This policy requires no migration and does not enable a merge RPC. Existing frozen customer schema and `customer_merge_history` remain the source boundary. Any runtime implementation requires a forward-only migration or guarded function review only if the existing schema cannot enforce the approved contract.

## Gate Result

Identity Merge Policy is approved as a conservative, manual, same-organization policy. Customer Portal implementation may continue with identity verification and read-only ownership checks, but must not enable automatic merge or infer cross-store customer-row equivalence.
