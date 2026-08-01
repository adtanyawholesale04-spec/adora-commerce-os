# Phase 1D Manual Payment Part 2B Additive Schema Contract

**Task ID:** `PHASE-1D-MANUAL-PAYMENT-PART2B`

**Prepared Date:** 2026-08-01

**Owner Approval Date:** 2026-08-01

**Status:** OWNER APPROVED / AS01-AS24 FROZEN

**Depends On:** Owner-frozen PS01-PS24, SR01-SR24 and SC01-SC30; Part 2A local preflight with zero blockers

**Migration / DDL:** NOT AUTHORIZED

**Runtime / Storage / UI:** NOT AUTHORIZED

**Production:** NOT AUTHORIZED / BLOCKED BY P16

## 1. Objective

Define the exact forward-only, additive schema shape required by the frozen
manual bank-transfer contract. This document proposes names, predicates,
dependency order and rollback posture. Approval freezes the design only; it
does not create a migration, apply DDL, repair data, expose private evidence or
activate a runtime.

## 2. Frozen Decisions

The Project Owner approved all recommended values AS01-AS24 on 2026-08-01.
These values are frozen for the additive manual-payment schema contract.

| ID | Decision | Recommended safe value |
|---|---|---|
| AS01 | Change boundary | Use one new forward-only migration; never edit, replace or reorder a frozen migration |
| AS02 | Mandatory preflight | Re-run Part 2A plus the Part 2B compatibility checks immediately before migration generation and again before each environment apply; any blocker stops work |
| AS03 | Checkout deadline default | Change `organization_checkout_settings.payment_due_minutes` default from 60 to 15; do not rewrite existing organization settings automatically |
| AS04 | Hold/deadline invariant | Add `organization_checkout_settings_payment_within_hold_check` requiring `payment_due_minutes <= reservation_minutes` |
| AS05 | Constraint rollout | Add the hold/deadline check as `NOT VALID`, validate it only after the environment preflight returns zero blockers, and leave it enforced for all new writes throughout rollout |
| AS06 | Proof path nullability | Drop only the `NOT NULL` property from `payment_proofs.storage_path`; do not drop or replace the column |
| AS07 | Binary proof branch | Preserve existing binary proof rows only when `storage_path` is non-null, trimmed non-empty and at most 1024 characters |
| AS08 | Reference-only proof branch | Permit `storage_path IS NULL` only when `mime_type IS NULL`, `submitted_by_type = 'CUSTOMER'` and `metadata_json` exactly equals `{\"schema_version\":1,\"evidence_type\":\"REFERENCE_ONLY\"}` |
| AS09 | Proof shape constraint | Add `payment_proofs_evidence_shape_check` as the exclusive binary-or-reference-only check; validate only after compatibility preflight |
| AS10 | Pending proof cardinality | Add partial unique index `payment_proofs_one_pending_per_transaction_uidx` on `(organization_id, payment_transaction_id)` where `verification_status = 'PENDING'` |
| AS11 | Pending attempt cardinality | Add partial unique index `payment_transactions_one_pending_bank_transfer_uidx` on `(organization_id, payment_id)` for `transaction_type = 'PAYMENT'`, `payment_method = 'BANK_TRANSFER'` and `status = 'PENDING'` |
| AS12 | Reference normalization invariant | Add expression unique index `payment_transactions_normalized_active_bank_reference_uidx` on `(organization_id, upper(btrim(external_reference)))` for non-null `BANK_TRANSFER` references in `PENDING` or `SUCCEEDED` |
| AS13 | Existing reference index | Keep `payment_transactions_active_manual_reference_uidx`; do not drop or weaken the frozen exact-value `BANK_TRANSFER`/`QR` protection in this change |
| AS14 | Reservation tenant key | Add unique constraint `inventory_reservations_organization_id_id_key` on `(organization_id, id)` because the base table currently has only a global primary key for this identity |
| AS15 | Allocation lineage column | Add nullable `inventory_allocations.source_reservation_id uuid`; existing allocations remain null and are not guessed or backfilled |
| AS16 | Same-tenant lineage | Add `inventory_allocations_source_reservation_tenant_fk` from `(organization_id, source_reservation_id)` to `inventory_reservations(organization_id, id)` with `ON DELETE RESTRICT` |
| AS17 | Reservation conversion cardinality | Add partial unique index `inventory_allocations_source_reservation_uidx` on `(organization_id, source_reservation_id)` where the source is non-null |
| AS18 | Runtime ownership | Future guarded settlement must populate `source_reservation_id`; direct table writes remain denied and legacy null lineage does not authorize settlement |
| AS19 | Canonical sources | Reuse `payments`, `payment_transactions`, `payment_proofs`, `inventory_reservations`, `inventory_allocations` and `organization_checkout_settings`; create no parallel payment, proof or stock master |
| AS20 | Security posture | Add no browser grant, RLS bypass, public function or Storage policy in Part 2B; existing tenant RLS and service boundaries remain authoritative |
| AS21 | Privacy posture | Add no raw reference, proof, bank, contact or customer value to indexes beyond the normalized uniqueness key; validation output remains count-only |
| AS22 | Migration lock posture | Set bounded `lock_timeout` and `statement_timeout`; create constraints and indexes in dependency order and fail the whole migration on any unexpected conflict |
| AS23 | Rollback posture | Before Production, correct failures with a new forward migration; after data depends on the contract, do not silently reintroduce nullable ambiguity, duplicate active attempts or cross-tenant lineage |
| AS24 | Delivery gate | Require fresh replay, expanded zero-blocker preflight, constraint/index catalog checks, tenant/direct-write denial, duplicate races and full Commerce regressions before any Production authorization |

## 3. Required Compatibility Checks

The future migration preflight must extend Part 2A without returning private
values. At minimum it must prove zero findings for:

1. settings where `payment_due_minutes > reservation_minutes`;
2. null, blank or over-1024-character binary proof paths that do not satisfy
   the exact reference-only branch;
3. more than one pending proof per transaction;
4. more than one pending `PAYMENT` / `BANK_TRANSFER` attempt per payment;
5. duplicate `upper(btrim(external_reference))` values among active bank
   transfers;
6. duplicate reservation identities inside one organization; and
7. any pre-existing allocation lineage column, constraint or index whose shape
   conflicts with this contract.

Production must be checked independently. Local zero findings are not evidence
about Production.

## 4. Dependency Order

```text
count-only compatibility preflight
  -> payment deadline default and NOT VALID relational check
  -> proof path nullability, NOT VALID evidence check and pending-proof index
  -> pending-attempt and normalized-reference indexes
  -> reservation same-tenant unique key
  -> nullable allocation lineage column
  -> same-tenant lineage foreign key and non-null uniqueness index
  -> validate deferred checks
  -> catalog, security, concurrency and full regression gates
```

The reservation tenant key must exist before the composite allocation foreign
key. No function is introduced in this dependency chain.

## 5. Explicit Non-Scope

- Migration SQL generation or application.
- Customer submission, staff approve/reject or atomic settlement functions.
- Binary proof bucket, upload, signed URL, malware scan, retention or deletion.
- Provider payment, webhook, refund, payout, partial payment or multi-currency.
- Storefront checkout UI activation, Vercel rollout or Production access.
- Repairing or fabricating lineage for existing rows.

## 6. Owner Approval

The Project Owner explicitly approved AS01-AS24 in full on 2026-08-01. Any
change requires a new explicit Owner decision record and must not silently alter
this frozen baseline. This approval makes Part 2C forward-only migration
generation and local validation ready for a separate execution instruction. It
does not itself authorize migration generation/application, runtime, Storage,
UI, provider work, Production apply or public activation. Production remains
blocked by P16 and its separate rollout gate.
