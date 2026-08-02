# Migration 069 Phase 1E Receipt Foundation Validation

**Date:** 2026-08-03

**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

**Migration:** `20260802182034_phase_1e_receipt_foundation.sql`

## Scope

Implements only the Owner-approved Part 7 Layer A Receipt foundation. The
migration adds the immutable `finance_documents` and
`finance_document_lines` schema, exact tenant/source constraints and indexes,
lifecycle protection, permission metadata, Receipt idempotency allowlists,
RLS/direct-access closure, and behavior-preserving hardening of the existing
document-number helper.

It creates no Receipt row, `RECEIPT` sequence row, role mapping, action/read
RPC, audit event, runtime service, UI, PDF, provider job, or Production change.

## Security Contract

- Both Receipt tables have RLS enabled and no direct browser policies.
- `PUBLIC`, `anon`, `authenticated`, and `service_role` have no direct table
  privileges.
- Trigger and sequence helper execution is unavailable to API roles.
- Header identity/source/snapshot fields and every line are immutable.
- Header lifecycle permits exactly one valid `ISSUED -> VOID` or
  `ISSUED -> REVERSED` transition and rejects terminal edits/deletes.
- Same-tenant source FKs, document number parts, organization-timezone issue
  year, lifecycle evidence, value bounds, and replacement uniqueness fail
  closed.
- Four `finance.document.*` permission rows are metadata only and have zero
  automatic role mappings.

## Local Evidence

| Gate | Result |
|---|---|
| CLI-generated forward migration name and ordered tail | PASS |
| Fresh replay from migration 001 through Layer A | PASS |
| Linked migration list: zero remote-only drift; Layer A remains local-only | PASS |
| Count-only incompatible-state preflight | PASS |
| Exact table column/type/nullability catalog | PASS |
| Exact named constraint/index/trigger catalog | PASS |
| Same-tenant source and cross-tenant denial | PASS |
| Number format/parts and organization-timezone issue year | PASS |
| Valid lifecycle transition and immutable terminal history | PASS |
| Direct insert/update/delete denial | PASS |
| Four permission rows and zero role mappings | PASS |
| Old/new idempotency allowlists | PASS |
| Sequence-helper output compatibility and execute revocation | PASS |
| No Receipt row or sequence seed | PASS |
| Supabase database lint | PASS |
| Supabase security/workflow and Commerce integration regressions | PASS |
| Atomic Checkout and coupon concurrency regression | PASS |
| Manual Payment additive schema/concurrency regression | PASS |
| Manual Payment Staff Review action/race regression | PASS |
| Repository tests (430/430), ESLint and TypeScript | PASS |
| Next.js production build | PASS |

The first full workflow run encountered a transient Edge Runtime startup race
while loading the carrier webhook E2E test secret. The isolated rerun passed,
and the complete Supabase regression chain then passed on rerun.

## Deferred Gates

- Layer B guarded Receipt create/void/reverse actions and append-only audit.
- Layer C permission-scoped staff reads and customer-owned Portal reads.
- Permission-to-role assignment and organization entitlement rollout.
- Receipt UI, PDF/download, provider delivery, notification, and public
  activation.
- Production migration apply; P16 recovery execution and explicit Owner
  change-window approval remain mandatory.
