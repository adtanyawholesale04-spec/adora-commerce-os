# ACOS Track A Finance & Tax Receipt Document Part 7 Forward-only Migration Contract Review

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-PART7`
**Status:** OWNER APPROVED / FM01-FM30 FROZEN / SQL NOT AUTHORIZED
**Date:** 2026-08-03
**Owner Approval Date:** 2026-08-03
**Depends on:** Owner-frozen FS01-FS30
**Migration files:** Not created
**Local apply:** Not authorized
**Production apply:** Not authorized / blocked by P16

## Objective

Translate the Owner-frozen Receipt ER/schema and guarded-boundary decisions
into an exact forward-only migration plan before any SQL is generated. This
review defines migration layers, object names, preflight checks, constraints,
indexes, trigger posture, RLS/grants, lock order, rollback, and validation
gates.

Part 7 changes no schema, row, permission, role, function, policy, grant,
runtime, UI, environment, Storage object, provider, or Production system.

## Task envelope

```text
PROJECT: ADORA Commerce OS
TRACK: A - Commerce Core
MODULE: Finance & Tax / Receipt
PHASE: 1E Part 7

ALLOWED:
  current migration/dependency audit
  forward-only migration contract documentation
  implementation status reconciliation
  static contract validation

FORBIDDEN:
  create or edit a migration
  execute DDL/DML against local or Production database
  seed permissions or role mappings
  expose a Receipt RPC or table
  create Receipt rows or document numbers
  enable runtime, UI, PDF, provider delivery or public activation
```

## Repository evidence

At review time the repository contains 100 files under `supabase/migrations`.
The observed migration tail ends with:

```text
20260802041541_phase_1d_manual_payment_staff_review_detail_null_maker_fix.sql
```

This is evidence only, not a reserved predecessor or filename. At each later
implementation gate the agent must re-read the migration directory, run the
installed Supabase CLI help, and create the file with `supabase migration new`.
The CLI-generated timestamp is authoritative.

Existing dependencies that remain canonical:

```text
organizations, profiles, organization_memberships
roles, membership_roles, permissions, role_permissions
customers, customer_profile_links
orders, order_items, order_addresses
payments, payment_transactions, refunds, refund_transactions
document_sequences, next_document_number
commerce_idempotency_keys
audit_logs
has_org_permission, current_profile_id
```

No receipt, tax-invoice, bill, ledger, customer, order, payment, refund,
idempotency, ownership, or audit master is duplicated.

## Frozen migration decisions

| ID | Recommended contract | State |
|---|---|---|
| FM01 | Use three separately generated forward-only migration layers | Owner approved / frozen |
| FM02 | Generate every filename with Supabase CLI after rechecking the migration tail | Owner approved / frozen |
| FM03 | Layer A owns schema foundation, protections, RLS/grants, permission seeds, idempotency allowlists, and sequence-helper hardening | Owner approved / frozen |
| FM04 | Layer B owns only create/void/reverse guarded actions | Owner approved / frozen |
| FM05 | Layer C owns only staff and Customer Portal list/detail reads | Owner approved / frozen |
| FM06 | Each layer has a separate explicit generation/local-apply instruction | Owner approved / frozen |
| FM07 | Create only `finance_documents` and `finance_document_lines` | Owner approved / frozen |
| FM08 | Use the exact Part 6 columns, types, same-tenant FKs, and no-cascade history posture | Owner approved / frozen |
| FM09 | Name every constraint, index, trigger, and function explicitly | Owner approved / frozen |
| FM10 | Enforce one root Receipt per payment and one replacement per predecessor with partial unique indexes | Owner approved / frozen |
| FM11 | Enforce exact number/year/sequence/lifecycle consistency with database checks | Owner approved / frozen |
| FM12 | Protect header snapshot identity and reject every line update/delete with dedicated triggers | Owner approved / frozen |
| FM13 | Extend existing idempotency allowlists; do not create a new request-key table | Owner approved / frozen |
| FM14 | Seed four finance permission metadata rows but no role permission or entitlement | Owner approved / frozen |
| FM15 | Harden `next_document_number` to an empty search path without changing output behavior | Owner approved / frozen |
| FM16 | Keep the numbering helper non-executable by browser and service roles | Owner approved / frozen |
| FM17 | Enable RLS and revoke all direct table access from `PUBLIC`, `anon`, `authenticated`, and `service_role` | Owner approved / frozen |
| FM18 | Expose exact authenticated RPC execution only; no broad default execute | Owner approved / frozen |
| FM19 | Every privileged function authenticates and authorizes internally with `search_path = ''` | Owner approved / frozen |
| FM20 | Use deterministic lock order and one transaction per mutation | Owner approved / frozen |
| FM21 | Create derives every snapshot field server-side and allocates the number last after eligibility locks | Owner approved / frozen |
| FM22 | Void and reverse change lifecycle fields only; money sources remain read-only | Owner approved / frozen |
| FM23 | Staff reads require exact finance permission and remain tenant-scoped/non-enumerating | Owner approved / frozen |
| FM24 | Portal reads derive active customer ownership and never accept `customer_id` authority | Owner approved / frozen |
| FM25 | Detail reads write one sanitized view audit; list reads do not audit each returned row | Owner approved / frozen |
| FM26 | Preflight is privacy-bounded, count-only, fail-fast, and never repairs data | Owner approved / frozen |
| FM27 | No backfill or automatic Receipt issuance occurs in any layer | Owner approved / frozen |
| FM28 | Operational rollback is forward-only disable/revoke while retaining financial history | Owner approved / frozen |
| FM29 | Each layer requires fresh replay, lint/advisors, focused suites, and full regressions | Owner approved / frozen |
| FM30 | Production remains separately blocked by recovery/change-window approval and explicit Owner apply approval | Owner approved / frozen |

## Planned migration layers

### Layer A - Receipt foundation

Logical CLI name:

```text
phase_1e_receipt_foundation
```

Layer A may contain only:

1. dependency and incompatible-state preflight;
2. `finance_documents` and `finance_document_lines`;
3. named checks, same-tenant foreign keys, uniqueness, and indexes;
4. dedicated header lifecycle and line immutability trigger functions/triggers;
5. RLS enablement and direct-access revocation;
6. four `finance.document.*` permission metadata rows with no role mapping;
7. additive Receipt operation/result values in `commerce_idempotency_keys`;
8. behavior-preserving hardening of `next_document_number`; and
9. comments identifying protected financial history and deferred runtime.

Layer A creates no Receipt API function, row, sequence row, role grant,
entitlement, sample data, Portal route, or automatic document job.

### Layer B - Guarded Receipt actions

Logical CLI name:

```text
phase_1e_receipt_guarded_actions
```

Layer B may create only the exact mutation signatures frozen in Part 6:

```text
api_create_receipt_document(uuid,uuid,uuid,uuid) returns jsonb
api_void_receipt_document(uuid,uuid,text,uuid) returns jsonb
api_reverse_receipt_document(uuid,uuid,text,uuid,uuid,uuid) returns jsonb
```

Defaulted arguments and full SQL signatures must preserve the Part 6 call
order. Internal helper functions are permitted only when they are
`security invoker`, non-executable by API roles, schema-qualified, and reduce
duplicated transaction logic. Layer B does not create read RPCs or UI routes.

### Layer C - Staff and Portal read boundaries

Logical CLI name:

```text
phase_1e_receipt_read_boundaries
```

Layer C may create only:

```text
api_list_receipt_documents(uuid,text,timestamptz,uuid,integer) returns jsonb
api_get_receipt_document(uuid,uuid) returns jsonb
api_list_customer_portal_receipts(uuid,timestamptz,uuid,integer) returns jsonb
api_get_customer_portal_receipt(uuid,uuid) returns jsonb
```

Layer C adds no table, column, permission, role mapping, mutation, PDF,
download, provider, notification, or public anonymous function.

## Exact Layer A schema contract

### `finance_documents`

Types and bounds are frozen for the later SQL proposal as follows:

```text
id                                      uuid
organization_id                         uuid
document_type                           varchar(30)
document_number                         varchar(14)
document_year                           integer
sequence_value                          integer
status                                  varchar(20)
order_id                                uuid
payment_id                              uuid
payment_transaction_id                  uuid
customer_id                             uuid
replaces_document_id                    uuid null
order_number_snapshot                   varchar(100)
currency_code                           varchar(3)
issued_at                               timestamptz
settled_at                              timestamptz
payment_method_snapshot                 varchar(40)
customer_display_name_snapshot          varchar(200)
bill_to_recipient_name_snapshot         varchar(200)
bill_to_address_line1_snapshot          text
bill_to_address_line2_snapshot          text null
bill_to_subdistrict_snapshot             varchar(150) null
bill_to_district_snapshot                varchar(150) null
bill_to_province_snapshot                varchar(150) null
bill_to_postal_code_snapshot             varchar(20) null
bill_to_country_code_snapshot            varchar(2)
subtotal_snapshot                        numeric(14,2)
item_discount_total_snapshot             numeric(14,2)
order_discount_total_snapshot            numeric(14,2)
shipping_charge_snapshot                 numeric(14,2)
shipping_discount_total_snapshot         numeric(14,2)
grand_total_snapshot                     numeric(14,2)
amount_settled_snapshot                  numeric(14,2)
issued_by                                uuid
voided_at                                timestamptz null
voided_by                                uuid null
void_reason                              text null
reversed_at                              timestamptz null
reversed_by                              uuid null
reversal_reason                          text null
reversal_refund_id                       uuid null
reversal_payment_transaction_id          uuid null
created_at                               timestamptz
```

All non-null and default rules follow Part 6. Server timestamps use
`statement_timestamp()` inside the guarded transaction. Snapshot address and
reason text must have named length checks: address lines `1..1000` when
required/present and lifecycle reasons `1..500` after trimming. Money amounts
are non-negative and quantity-independent; no tax or cost column is added.

### `finance_document_lines`

```text
id                                  uuid
organization_id                     uuid
document_id                         uuid
line_number                         integer
source_order_item_id                uuid
sku_snapshot                        varchar(120) null
sale_code_snapshot                  varchar(80) null
product_name_snapshot               varchar(255)
variant_name_snapshot               varchar(255) null
quantity_snapshot                   numeric(14,3)
original_unit_price_snapshot        numeric(14,2)
applied_unit_price_snapshot         numeric(14,2)
line_discount_total_snapshot        numeric(14,2)
line_total_snapshot                 numeric(14,2)
is_reward_item_snapshot             boolean
created_at                          timestamptz
```

Every line field is copied from the locked canonical order item. Price and
total values are non-negative, quantity is positive, and cost is absent.

## Exact constraint and index catalog

The later Layer A SQL must reserve descriptive names for:

```text
finance_documents_tenant_id_key
finance_documents_number_key
finance_documents_sequence_key
finance_documents_root_payment_uidx
finance_documents_replacement_uidx
finance_documents_type_check
finance_documents_number_format_check
finance_documents_number_parts_check
finance_documents_status_check
finance_documents_amounts_check
finance_documents_lifecycle_check
finance_documents_not_self_replacement_check
finance_documents_order_tenant_fk
finance_documents_payment_tenant_fk
finance_documents_transaction_tenant_fk
finance_documents_customer_tenant_fk
finance_documents_replacement_tenant_fk
finance_documents_issued_by_fk
finance_documents_voided_by_fk
finance_documents_reversed_by_fk
finance_documents_reversal_refund_tenant_fk
finance_documents_reversal_transaction_tenant_fk

finance_document_lines_tenant_id_key
finance_document_lines_number_key
finance_document_lines_source_item_key
finance_document_lines_values_check
finance_document_lines_document_tenant_fk
finance_document_lines_order_item_tenant_fk

finance_documents_staff_queue_idx
finance_documents_customer_portal_idx
finance_documents_order_idx
finance_documents_payment_idx
finance_documents_payment_transaction_idx
finance_documents_reversal_refund_idx
finance_documents_reversal_transaction_idx
```

Every source/self FK includes `organization_id` where the canonical unique key
supports it and uses `on delete restrict`. Partial unique indexes implement the
root-payment and one-replacement rules. The migration must preflight every
reserved name and semantic definition before DDL.

## Immutability trigger catalog

Layer A reserves:

```text
protect_finance_document_header() returns trigger
protect_finance_document_line() returns trigger
finance_documents_protect
finance_document_lines_protect
```

Both trigger functions are `security invoker`, use `search_path = ''`, and are
revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`.

Header protection rejects DELETE and changes to identity/source/snapshot/
created fields. It allows exactly one `ISSUED -> VOID` or
`ISSUED -> REVERSED` transition whose lifecycle fields satisfy the named check.
It rejects same-state edits and terminal-state updates. Line protection rejects
every UPDATE and DELETE.

## Idempotency allowlist change

Layer A may replace only the two existing named check constraints on
`commerce_idempotency_keys` after preflight confirms their current definitions:

```text
operation adds:
  RECEIPT_CREATE
  RECEIPT_VOID
  RECEIPT_REVERSE

result_entity_type adds:
  finance_document
```

All existing values remain unchanged. Identity, hash, state, terminal
transition, uniqueness, retention, and trigger behavior remain intact. The
migration neither rewrites nor backfills idempotency rows.

## Permission seed contract

Layer A inserts metadata only:

```text
finance.document.view
finance.document.create
finance.document.void
finance.document.reverse
```

An existing code with different name/description is a preflight blocker. The
insert is conflict-safe only after semantic equality is proved. No
`role_permissions`, membership, role, entitlement, plan, feature, or
organization row is created or changed.

## Sequence helper hardening

Layer A may replace the body of the existing signature only:

```text
next_document_number(uuid,varchar,varchar,varchar) returns varchar
```

The replacement preserves reset logic and output exactly, changes the function
to `security definer set search_path = ''`, and schema-qualifies every object.
Execution is revoked from `PUBLIC`, `anon`, `authenticated`, and
`service_role`. Only the later guarded create function invokes it under its
owner privileges. No `RECEIPT` sequence row is seeded.

## RLS and grant contract

Layer A must:

1. enable RLS on both tables immediately after creation;
2. create no direct table policy for browser roles;
3. revoke all table privileges from `PUBLIC`, `anon`, `authenticated`, and
   `service_role`;
4. grant DELETE to no runtime role;
5. revoke every new function from `PUBLIC`, `anon`, `authenticated`, and
   `service_role` before exact grants; and
6. keep trigger/internal/helper functions unavailable to API roles.

Layers B and C grant only the exact public API signatures to `authenticated`.
Every API function is `security definer set search_path = ''`, uses fully
qualified relations, checks `auth.uid()`, resolves an active profile and
membership, and performs its exact permission or active customer ownership
check internally. `service_role` is not application authorization.

## Preflight contract

Each layer begins with one fail-fast transaction block. It reports aggregate
counts and object names only; it does not print contact, address, document,
bank, proof, provider, or payment-reference values.

Layer A stops before DDL when any condition is true:

1. a canonical dependency table/function/extension is missing;
2. either target table, reserved function, trigger, constraint, or index name
   already exists unexpectedly;
3. the current `commerce_idempotency_keys` checks differ from the expected
   Phase 1D definitions;
4. a finance permission code exists with incompatible metadata;
5. a `document_sequences` row for `RECEIPT` already exists;
6. `next_document_number` signature, owner, grants, return type, or reset
   behavior differs from the expected protected baseline;
7. required same-tenant unique keys are absent on canonical sources; or
8. a dependency migration is missing or repository history has remote-only
   drift.

Layer B stops when Layer A objects/constraints/grants differ, any target action
function already exists, or direct table privileges are wider than the frozen
posture.

Layer C stops when Layers A/B differ, any target read function already exists,
or customer ownership/permission helpers are missing or wider than expected.

No layer scans all eligible payments for backfill because no backfill or
automatic issuance is approved. Eligibility is checked transactionally when a
future authorized create call occurs.

## Transaction and lock order

### Create or replacement

```text
commerce idempotency key
payment
order
successful payment transaction
predecessor finance document when replacement
document sequence row through protected allocator
new header and lines
audit row
idempotency terminal result
```

The function rechecks active tenant/profile/membership, exact create
permission, Part 1 eligibility, amount/currency consistency, address source,
line source, and replacement consistency after locks. Number allocation,
header, lines, audit, and idempotency completion commit together.

### Void or reverse

```text
commerce idempotency key
finance document
canonical payment/order consistency rows
completed refund or reversed payment transaction when reversing
document lifecycle update
audit row
idempotency terminal result
```

The Receipt boundary never creates or changes payment, refund, order,
inventory, coupon, ledger, consent, or entitlement state.

## Audit and read behavior

Layer B writes the frozen create/void/reverse/replacement actions to existing
append-only `audit_logs`. Layer C detail functions write one sanitized
`RECEIPT_VIEWED` row after authorization and successful resolution. List
functions are bounded read-only indexes and do not emit one audit row per
returned document.

Audit payloads contain only actor, tenant, Receipt entity, request ID where
applicable, bounded reason, and lifecycle state. Snapshot/address/contact,
bank/proof/provider, secret, and raw payment-reference data are forbidden.

## Rollback and recovery contract

ACOS remains forward-only:

- a failing migration transaction rolls back automatically;
- no frozen migration is edited, renamed, reordered, or deleted;
- before any Receipt row or runtime enablement, operational rollback is a new
  forward migration that revokes API execution and leaves tables disabled;
- after any Receipt row exists, tables, numbers, snapshots, lines, lifecycle,
  audit, and idempotency evidence are retained;
- rollback never reuses a number or rewrites order/payment/refund history;
- Production requires verified backup/recovery, migration parity, advisor
  review, change-window approval, explicit Owner apply approval, and P16
  closure; and
- Layer A/B/C local success is not Production authorization.

## Validation matrix

### Layer A foundation suite

1. fresh replay from migration 001 through the CLI-generated Layer A;
2. exact table/column/type/default/nullability catalog;
3. exact constraint/index/trigger catalog;
4. RLS enabled and no browser/service-role table privileges;
5. four permission rows and zero automatic role mappings;
6. idempotency old/new allowlists and unchanged transition protection;
7. sequence-helper output compatibility and exact execute revocation;
8. direct insert/update/delete denial and immutable trigger behavior;
9. same-tenant FK and lifecycle/number format negative tests; and
10. database lint and security advisors.

### Layer B action suite

1. exact function signatures, owner, volatility, search path, and grants;
2. auth/profile/membership/permission and cross-tenant denial;
3. every Part 1 eligibility and amount/currency failure;
4. billing-then-shipping address derivation and private-field absence;
5. atomic number/header/line/audit/idempotency success;
6. same-request replay and different-hash conflict;
7. competing create, replacement, void/reverse, and sequence-boundary races;
8. number non-reuse after durable success and rollback behavior before commit;
9. exact lifecycle/evidence validation and terminal-state denial; and
10. no order/payment/refund/ledger mutation.

### Layer C read suite

1. exact function signatures, grants, bounds, and keyset ordering;
2. staff `finance.document.view` and same-tenant denial matrix;
3. active Portal profile/membership/customer-link ownership matrix;
4. anonymous, inactive, unlinked, cross-tenant, and direct-table denial;
5. non-enumerating unavailable shape;
6. list/detail allowlists and private-field absence;
7. one sanitized detail-view audit and no per-row list audit;
8. Thai/English and light/dark runtime work remains separately gated; and
9. no read-side business mutation.

Every implemented layer also requires Commerce, Checkout, Manual Payment,
Customer Portal, Supabase security/workflow, full tests, lint, typecheck, build,
fresh replay, and migration-list parity gates.

## Stop conditions

Implementation must stop and report `BLOCKED` when:

- current migration tail or remote history is inconsistent;
- a preflight count is non-zero;
- a reserved object exists with different semantics;
- a canonical source or same-tenant key is missing;
- a function/grant cannot be made exact without widening access;
- financial eligibility requires a rule not frozen in Parts 0-6;
- local replay, advisors, concurrency, privacy, or regression validation fails;
  or
- Production is requested without P16 and change-window approval.

No automatic repair, guessed constraint, permissive policy, service-role
bypass, migration edit, data rewrite, or security reduction is allowed.

## Part 7 disposition

The Project Owner approved FM01-FM30 in full on 2026-08-03. These decisions are
frozen for the Receipt MVP. Any change requires a new explicit Owner decision
record.

Part 7 decision freeze is complete. The next permitted step is **Layer A
Receipt foundation migration generation** under a separate explicit approval.
This freeze does not itself create or apply SQL, seed role mappings, enable
runtime/UI, change Production, or authorize public activation.
