# Migration 071 Phase 1E Receipt Read Boundaries Validation

**Date:** 2026-08-03

**Status:** LOCAL VALIDATED / PRODUCTION NOT APPLIED

**Migration:** `20260802200637_phase_1e_receipt_read_boundaries.sql`

## Scope

Implements only the Owner-approved Part 7 Layer C Receipt read boundaries:

- `api_list_receipt_documents(uuid,text,timestamptz,uuid,integer)`
- `api_get_receipt_document(uuid,uuid)`
- `api_list_customer_portal_receipts(uuid,timestamptz,uuid,integer)`
- `api_get_customer_portal_receipt(uuid,uuid)`

Staff reads require an authenticated active profile, active same-tenant
organization membership, and `finance.document.view`. Customer Portal reads
derive the active customer identity from `auth.uid()` and the existing active
profile, membership, and `customer_profile_links` sources. No customer ID is
accepted from the browser.

Layer C creates no table, column, permission, role mapping, Receipt mutation,
customer/order/payment source, UI, PDF, provider delivery, Production row, or
public activation.

## Security And Privacy Contract

- All four functions are `SECURITY DEFINER` with an empty search path, owned
  by `postgres`, and executable only by `authenticated`.
- Staff functions enforce active tenant membership and
  `finance.document.view` inside the boundary.
- Portal functions derive an active customer link and scope every document to
  that customer and organization.
- Lists use bounded keyset pagination with limits from 1 through 100.
- Unauthorized, cross-tenant, unlinked, or missing detail requests return one
  non-enumerating unavailable shape.
- Responses expose only frozen customer-safe Receipt, order, item, total,
  currency, lifecycle, and safe payment-state fields.
- Reviewer identities, payment transaction IDs, proof paths, provider/bank
  references, raw audit payloads, and tenant-wide data are excluded.
- Successful detail reads append exactly one sanitized `RECEIPT_VIEWED` audit
  record; list reads do not create one audit row per returned document.
- Receipt and canonical Commerce tables remain closed to direct API access.

## Local Evidence

| Gate | Result |
|---|---|
| CLI-generated forward migration and fail-fast preflight | PASS |
| Fresh replay from migration 001 through Layer C | PASS |
| Exact function signatures, owner, grants, and empty search path | PASS |
| Staff active-profile, membership, permission, and tenant isolation | PASS |
| Portal active-link ownership, unlinked, inactive, and cross-tenant isolation | PASS |
| Bounded keyset pagination, filters, limits, and ordering | PASS |
| Non-enumerating detail unavailable shape | PASS |
| Response allowlist and private-field absence | PASS |
| One sanitized detail audit and no list audit amplification | PASS |
| Direct-table denial and no read-side business mutation | PASS |
| Supabase database lint | PASS |
| Receipt Layers A and B, including action races | PASS |
| Customer Portal snapshot, Supabase security/workflow, and Commerce integration | PASS |
| Atomic Checkout and coupon concurrency regression | PASS |
| Manual Payment schema, submission, snapshot, staff reads/actions, and races | PASS |
| Linked migration list: zero remote-only drift; Layer C remains local-only | PASS |

The linked project has 103 local migrations. Seventeen are local-only, ending
with Receipt Layers A, B, and C, and there is zero remote-only drift. No
migration push or Production SQL was executed.

## Deferred Gates

- Explicit Owner approval of the prepared permission-to-role mapping decisions
  RM01-RM24, followed by a separately approved mapping migration contract.
- Server read-service integration and permission-aware Admin/Portal UI.
- PDF/download, provider delivery, notification, and public activation.
- Production migration apply; P16 recovery execution, Vercel Production
  environment inventory, migration change window, and explicit Owner apply
  approval remain mandatory.

Local Layer C success is not Production authorization.
