# ACOS Track A Finance & Tax Receipt Document Part 6 ER/Schema and Guarded Database Boundary Contract

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART6`
**Status:** OWNER APPROVED / FROZEN
**Date:** 2026-08-03
**Owner Approval Date:** 2026-08-03
**Depends on:** Owner-approved Parts 0-5
**Migration:** Not authorized
**Runtime:** Not authorized
**Production:** Not authorized

## Objective

Map the frozen Receipt scope, eligibility, numbering, immutable snapshot,
reversal, security, audit, and Portal-read decisions into one additive database
contract before SQL is written. This contract freezes exact entities,
constraints, grants, RPC signatures, idempotency behavior, and replay gates for
the later migration contract review.

This document does not create a table, column, permission, function, event,
role, entitlement, route, or migration. The frozen names below authorize Part 7
migration contract design only. Migration generation still requires a separate
explicit instruction.

## Canonical reuse map

```text
organizations
  -> customers <- customer_profile_links <- profiles/auth.users
  -> orders -> order_items
            -> order_addresses
            -> payments -> payment_transactions
                        -> refunds -> refund_transactions

Receipt document boundary (proposed)
  -> finance_documents
       -> finance_document_lines
  -> document_sequences
  -> commerce_idempotency_keys
  -> audit_logs
```

`orders`, `customers`, `payments`, `payment_transactions`, `refunds`, and
`refund_transactions` remain the canonical commercial and money sources. The
proposed Receipt entities store an immutable document snapshot only; they do
not become another order, payment, refund, ledger, customer, or tax engine.

## Proposed decision table

| ID | Recommended contract | State |
|---|---|---|
| FS01 | MVP persists only `document_type = RECEIPT` | Owner approved / frozen |
| FS02 | Reuse every canonical source listed above; no duplicate master | Owner approved / frozen |
| FS03 | Add one header entity named `finance_documents` | Owner approved / frozen |
| FS04 | Add one line entity named `finance_document_lines` | Owner approved / frozen |
| FS05 | Every row carries `organization_id` and same-tenant keys | Owner approved / frozen |
| FS06 | Header lifecycle is exactly `ISSUED`, `VOID`, or `REVERSED` | Owner approved / frozen |
| FS07 | Allocate `RC-{YYYY}-{NNNNNN}` through the existing protected sequence helper | Owner approved / frozen |
| FS08 | Enforce unique number and unique year/sequence within tenant/type | Owner approved / frozen |
| FS09 | Allow one root Receipt per canonical payment | Owner approved / frozen |
| FS10 | A replacement is a new Receipt linked through `replaces_document_id` | Owner approved / frozen |
| FS11 | Require same-tenant order, payment, successful transaction, and customer references | Owner approved / frozen |
| FS12 | Store only the Part 3 approved header and settlement snapshot | Owner approved / frozen |
| FS13 | Address source is order `BILLING`, otherwise order `SHIPPING`; phone is excluded | Owner approved / frozen |
| FS14 | Copy approved order-item values into immutable document lines | Owner approved / frozen |
| FS15 | Exclude tax/VAT calculation, cost, proof, bank, provider, secret, and raw payload data | Owner approved / frozen |
| FS16 | Protect header identity/snapshot and all lines from update/delete | Owner approved / frozen |
| FS17 | Permit only guarded `ISSUED -> VOID` or `ISSUED -> REVERSED` lifecycle changes | Owner approved / frozen |
| FS18 | Reversal requires exactly one matching completed refund or reversed payment-transaction reference | Owner approved / frozen |
| FS19 | Reuse `commerce_idempotency_keys` with Receipt operation/result codes | Owner approved / frozen |
| FS20 | Create through `api_create_receipt_document` only | Owner approved / frozen |
| FS21 | Void through `api_void_receipt_document` only | Owner approved / frozen |
| FS22 | Reverse through `api_reverse_receipt_document` only | Owner approved / frozen |
| FS23 | Staff list/detail reads require `finance.document.view` | Owner approved / frozen |
| FS24 | Portal list/detail reads resolve an active `customer_profile_links` owner | Owner approved / frozen |
| FS25 | Enable RLS and revoke direct table access from browser roles | Owner approved / frozen |
| FS26 | All exposed RPCs use exact grants, `security definer`, empty search path, and schema-qualified objects | Owner approved / frozen |
| FS27 | Seed only the four Part 5 frozen permission codes in the later migration | Owner approved / frozen |
| FS28 | Reuse append-only `audit_logs`; do not add a Receipt audit/event master | Owner approved / frozen |
| FS29 | Add only tenant, source, queue, lifecycle, and replacement indexes justified below | Owner approved / frozen |
| FS30 | Require fresh replay, concurrency, RLS, privacy, idempotency, audit, and regression gates before runtime | Owner approved / frozen |

## Proposed entity: `finance_documents`

One row is the immutable header and lifecycle evidence for one numbered
Receipt. It is not a mutable projection of the current order.

| Column | Contract |
|---|---|
| `id` | UUID primary key |
| `organization_id` | Required tenant FK; also `unique (organization_id, id)` |
| `document_type` | Required; exactly `RECEIPT` in MVP |
| `document_number` | Required immutable `RC-{YYYY}-{NNNNNN}` |
| `document_year` | Required four-digit issue year |
| `sequence_value` | Required integer `1..999999` |
| `status` | Required; `ISSUED`, `VOID`, or `REVERSED` |
| `order_id` | Required same-tenant canonical order FK |
| `payment_id` | Required same-tenant canonical payment FK |
| `payment_transaction_id` | Required same-tenant successful payment transaction FK |
| `customer_id` | Required same-tenant canonical customer FK |
| `replaces_document_id` | Nullable same-tenant self FK; one replacement per predecessor |
| `order_number_snapshot` | Required order number at issue time |
| `currency_code` | Required canonical three-letter payment/order currency |
| `issued_at` | Required server timestamp used for document year |
| `settled_at` | Required canonical successful payment time |
| `payment_method_snapshot` | Required allowlisted canonical payment method |
| `customer_display_name_snapshot` | Required bounded display name; no email or phone |
| `bill_to_recipient_name_snapshot` | Required bounded order-address recipient |
| `bill_to_address_line1_snapshot` | Required bounded order address |
| `bill_to_address_line2_snapshot` | Nullable bounded order address |
| `bill_to_subdistrict_snapshot` | Nullable bounded order address |
| `bill_to_district_snapshot` | Nullable bounded order address |
| `bill_to_province_snapshot` | Nullable bounded order address |
| `bill_to_postal_code_snapshot` | Nullable bounded order address |
| `bill_to_country_code_snapshot` | Required two-letter order country code |
| `subtotal_snapshot` | Required non-negative canonical order amount |
| `item_discount_total_snapshot` | Required non-negative canonical order amount |
| `order_discount_total_snapshot` | Required non-negative canonical order amount |
| `shipping_charge_snapshot` | Required non-negative canonical order amount |
| `shipping_discount_total_snapshot` | Required non-negative canonical order amount |
| `grand_total_snapshot` | Required non-negative canonical order total |
| `amount_settled_snapshot` | Required amount equal to eligible settled payment evidence |
| `issued_by` | Required profile that passed `finance.document.create` |
| `voided_at`, `voided_by`, `void_reason` | Present together only when status is `VOID` |
| `reversed_at`, `reversed_by`, `reversal_reason` | Present together only when status is `REVERSED` |
| `reversal_refund_id` | Nullable same-tenant completed refund evidence |
| `reversal_payment_transaction_id` | Nullable same-tenant reversed transaction evidence |
| `created_at` | Required server timestamp; equal to initial persistence time |

There is no general `updated_at`: a Receipt is not an editable record. Guarded
lifecycle columns are the only fields that may change after issue.

### Header constraints

```text
unique (organization_id, document_type, document_number)
unique (organization_id, document_type, document_year, sequence_value)
unique root (organization_id, document_type, payment_id)
  where replaces_document_id is null
unique (organization_id, replaces_document_id)
  where replaces_document_id is not null
document_number matches ^RC-[0-9]{4}-[0-9]{6}$
document_year equals the year encoded in document_number and issued_at
sequence_value equals the six-digit suffix
replaces_document_id cannot equal id
ISSUED has no void/reversal fields
VOID has complete void fields and no reversal evidence
REVERSED has complete reversal fields and exactly one reversal evidence FK
```

The guarded creation function must also reject a replacement cycle and prove
that predecessor, replacement, order, payment, customer, currency, and tenant
all match. No cascade may delete financial document history.

## Proposed entity: `finance_document_lines`

| Column | Contract |
|---|---|
| `id` | UUID primary key |
| `organization_id` | Required tenant FK; also `unique (organization_id, id)` |
| `document_id` | Required same-tenant `finance_documents` FK |
| `line_number` | Required positive integer, stable inside document |
| `source_order_item_id` | Required same-tenant canonical order-item FK |
| `sku_snapshot` | Nullable bounded order-item SKU |
| `sale_code_snapshot` | Nullable bounded order-item sale code |
| `product_name_snapshot` | Required bounded order-item product name |
| `variant_name_snapshot` | Nullable bounded order-item variant name |
| `quantity_snapshot` | Required positive quantity |
| `original_unit_price_snapshot` | Required non-negative amount |
| `applied_unit_price_snapshot` | Required non-negative amount |
| `line_discount_total_snapshot` | Required non-negative amount |
| `line_total_snapshot` | Required non-negative amount |
| `is_reward_item_snapshot` | Required boolean copied from the order line |
| `created_at` | Required server timestamp |

Required uniqueness is `(organization_id, document_id, line_number)` and
`(organization_id, document_id, source_order_item_id)`. Unit cost and any
product field not already frozen in `order_items` are excluded. Every line is
append-only after the parent transaction commits.

## Number allocation boundary

The future create function may call the existing protected
`next_document_number` helper with:

```text
organization_id = validated active tenant
document_type   = RECEIPT
prefix          = RC-
reset_policy    = YEARLY
```

The helper remains unavailable to `PUBLIC`, `anon`, and `authenticated`.
Allocation and header/line/audit/idempotency success must commit in one
transaction. A rolled-back attempt may consume no durable document row; an
allocated number that becomes durable is never reused. Sequence overflow fails
closed and does not change the number shape.

Before migration, preflight must prove the existing sequence row can support
the frozen organization/type/year scope and that no conflicting `RECEIPT`
sequence or number exists. The migration contract must also decide whether to
harden the historical helper to `search_path = ''`; it must never expose the
helper directly to a browser role.

## Idempotency contract

Reuse `commerce_idempotency_keys`; do not add another request-key table. A
later forward-only migration may extend its allowlists with:

```text
operation:
  RECEIPT_CREATE
  RECEIPT_VOID
  RECEIPT_REVERSE

result_entity_type:
  finance_document
```

Every mutation requires a caller-supplied UUID `request_id` and a server-built
SHA-256 hash of the allowlisted intent. Same request and same hash return the
original bounded result. Same request with different intent returns
`IDEMPOTENCY_CONFLICT`. A terminal success or failure is immutable and cannot
be deleted by ordinary cleanup.

## Proposed RPC surface

### Mutations

```text
api_create_receipt_document(
  p_organization_id uuid,
  p_payment_id uuid,
  p_request_id uuid,
  p_replaces_document_id uuid default null
) -> jsonb

api_void_receipt_document(
  p_organization_id uuid,
  p_document_id uuid,
  p_reason text,
  p_request_id uuid
) -> jsonb

api_reverse_receipt_document(
  p_organization_id uuid,
  p_document_id uuid,
  p_reason text,
  p_request_id uuid,
  p_refund_id uuid default null,
  p_reversal_payment_transaction_id uuid default null
) -> jsonb
```

The create function derives order, customer, transaction, amounts, payment
method, issue time, address, and lines on the server. It accepts no client
snapshot, number, status, amount, currency, actor, customer, or audit payload.
Void and reverse accept no arbitrary status or financial amount.

### Staff reads

```text
api_list_receipt_documents(
  p_organization_id uuid,
  p_status text default null,
  p_before_issued_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 25
) -> jsonb

api_get_receipt_document(
  p_organization_id uuid,
  p_document_id uuid
) -> jsonb
```

Both require active profile, active same-tenant membership, active
organization, and `finance.document.view`. Pagination is keyset-based and
bounded to `1..100`. Cross-tenant or unauthorized detail reads return one
non-enumerating unavailable shape.

### Customer Portal reads

```text
api_list_customer_portal_receipts(
  p_organization_id uuid,
  p_before_issued_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
) -> jsonb

api_get_customer_portal_receipt(
  p_organization_id uuid,
  p_document_id uuid
) -> jsonb
```

Portal functions derive `auth.uid()`, active profile, active membership, and
the active customer link. They do not accept `customer_id`. List output is a
bounded index projection. Detail output contains only Part 5 approved fields.
Only a successful detail view writes one sanitized `RECEIPT_VIEWED` audit row;
list pagination does not write one row per returned document.

## Permission, RLS, grant, and function security

The later migration may seed exactly:

```text
finance.document.view
finance.document.create
finance.document.void
finance.document.reverse
```

No role receives these permissions automatically in Part 6. Role mapping is a
separate Owner-controlled seed decision.

Required database posture:

1. enable RLS on both proposed tables;
2. revoke all table privileges from `PUBLIC`, `anon`, and `authenticated`;
3. create no broad authenticated table policy and no browser write policy;
4. expose only the exact RPC signatures approved above;
5. revoke function execution from `PUBLIC` and `anon` before exact grants;
6. grant customer/staff RPC execution only to `authenticated`;
7. use `security definer set search_path = ''` with schema-qualified objects;
8. validate `auth.uid()`, active profile, membership, organization, exact
   permission or active customer ownership inside each privileged function;
9. never use user-editable metadata, browser tenant/customer claims, role
   names, or `service_role` as application authorization; and
10. keep direct production maintenance outside normal runtime and audited.

This follows current Supabase guidance that grants define object reachability,
RLS defines row visibility, functions are executable by default unless
revoked, and privileged functions require a fixed search path. Relevant
references: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security),
and [Database Functions](https://supabase.com/docs/guides/database/functions).

## Immutability and lifecycle protection

The migration contract must define two protections:

- lines: reject every update and delete;
- header: reject delete and reject every update except one guarded terminal
  lifecycle transition with the exact required actor, reason, timestamp, and
  evidence fields.

The mutation functions must lock document, payment/refund evidence, and
idempotency rows in deterministic order. A concurrent duplicate either returns
the same result or fails with a stable conflict; it cannot allocate a second
root Receipt, second terminal transition, or second replacement.

## Audit and event evidence

Reuse append-only `audit_logs` with the frozen actions:

```text
RECEIPT_CREATED
RECEIPT_VIEWED
RECEIPT_VOIDED
RECEIPT_REVERSED
RECEIPT_REPLACED
```

The audit row stores tenant, actor, Receipt entity, request ID where relevant,
bounded reason, and before/after lifecycle state. It excludes document body,
customer contact/address, bank/proof/provider data, secrets, and raw financial
references. Part 6 adds no event/outbox table; downstream delivery or
integration events require a later contract.

## Required indexes

Only the following index purposes are approved for later exact DDL design:

- staff queue: `(organization_id, status, issued_at desc, id desc)`;
- customer Portal: `(organization_id, customer_id, issued_at desc, id desc)`;
- source lookup: tenant/order, tenant/payment, and tenant/payment-transaction;
- replacement lookup: tenant/`replaces_document_id`;
- line read: tenant/document/line number;
- reversal evidence: tenant/refund and tenant/reversal transaction; and
- the unique number, sequence, root-payment, and replacement constraints above.

No text search, tax report, provider, PDF, attachment, or analytics index is in
scope.

## Controlled error contract

External results use stable bounded codes and never reveal another tenant's
document existence:

```text
AUTH_REQUIRED
PROFILE_REQUIRED
MEMBERSHIP_REQUIRED
PERMISSION_DENIED
DOCUMENT_UNAVAILABLE
PAYMENT_NOT_ELIGIBLE
ADDRESS_NOT_AVAILABLE
INVALID_LIFECYCLE
REVERSAL_EVIDENCE_REQUIRED
IDEMPOTENCY_CONFLICT
SEQUENCE_UNAVAILABLE
```

Database exception text, constraint names, customer contact data, provider
references, proof paths, and internal IDs outside the approved response shape
must not reach the browser.

## Migration and validation gates

The next migration contract must include:

1. privacy-bounded count-only preflight for sequence and source conflicts;
2. forward-only additive DDL; no edit to a frozen migration;
3. exact constraint, index, trigger, RLS, grant, and function catalogs;
4. permission and idempotency allowlist changes with no implicit role grants;
5. fresh local replay and `supabase db lint`/advisor reconciliation;
6. eligibility, amount/currency, number format, overflow, and non-reuse tests;
7. retry, hash conflict, competing create, void/reverse race, and replacement
   concurrency tests;
8. anonymous, inactive, missing-permission, direct-write, and cross-tenant
   denial tests;
9. Portal active-link ownership and private-field absence tests;
10. immutable header/line and append-only audit tests;
11. no order/payment/refund/ledger mutation except approved document evidence;
12. full Commerce, Checkout, Manual Payment, Portal, security, lint, typecheck,
    test, and build regressions; and
13. separate explicit approval before local apply, Production apply, runtime,
    UI, PDF, provider delivery, or public activation.

## Explicitly deferred

```text
tax invoice and VAT
credit note and debit note
supplier bill and expense document
branch numbering
partial-payment receipt
split-payment/multi-transaction receipt
PDF and object storage
e-Tax/provider submission
email, SMS, LINE, and download delivery
accounting export and ledger movement
automatic issue, void, reverse, or replacement
Production migration and public activation
```

## Part 6 disposition

The Project Owner approved FS01-FS30 in full on 2026-08-03. These decisions are
frozen for the Receipt MVP. Any change requires a new explicit Owner decision
record.

Part 6 is complete. The next permitted step is **Part 7 Migration Contract
Review**. This freeze does not authorize migration generation, SQL execution,
local or Production apply, permission seeding, runtime, UI, PDF/provider work,
or public activation.
