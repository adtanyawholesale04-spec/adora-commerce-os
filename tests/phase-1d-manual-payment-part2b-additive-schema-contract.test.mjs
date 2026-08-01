import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART2B_ADDITIVE_SCHEMA_CONTRACT.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 2B freezes every Owner-approved additive schema decision", () => {
  assert.match(contract, /OWNER APPROVED \/ AS01-AS24 FROZEN/);
  assert.match(contract, /Owner Approval Date:\*\* 2026-08-01/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| AS${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /Migration \/ DDL:\*\* NOT AUTHORIZED/);
  assert.match(contract, /Production:\*\* NOT AUTHORIZED \/ BLOCKED BY P16/);
});

test("Part 2B preserves payment and proof invariants", () => {
  assert.match(contract, /payment_due_minutes` default from 60 to 15/);
  assert.match(contract, /organization_checkout_settings_payment_within_hold_check/);
  assert.match(contract, /payment_proofs_evidence_shape_check/);
  assert.match(contract, /evidence_type\\\":\\\"REFERENCE_ONLY/);
  assert.match(contract, /payment_proofs_one_pending_per_transaction_uidx/);
  assert.match(contract, /payment_transactions_one_pending_bank_transfer_uidx/);
  assert.match(contract, /payment_transactions_normalized_active_bank_reference_uidx/);
  assert.match(contract, /Keep `payment_transactions_active_manual_reference_uidx`/);
});

test("Part 2B preserves same-tenant allocation lineage", () => {
  assert.match(contract, /inventory_reservations_organization_id_id_key/);
  assert.match(contract, /inventory_allocations\.source_reservation_id uuid/);
  assert.match(contract, /inventory_allocations_source_reservation_tenant_fk/);
  assert.match(contract, /inventory_allocations_source_reservation_uidx/);
  assert.match(contract, /existing allocations remain null and are not guessed or backfilled/);
});

test("Part 2B preserves preflight, security and execution gates after Owner freeze", () => {
  assert.match(contract, /Production must be checked independently/);
  assert.match(contract, /Add no browser grant, RLS bypass, public function or Storage policy/);
  assert.match(contract, /Project Owner explicitly approved AS01-AS24 in full/);
  assert.match(contract, /does not itself authorize migration generation\/application/);
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 2B ADDITIVE SCHEMA CONTRACT PREPARED: AS01-AS24/,
  );
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 2B OWNER DECISION FREEZE COMPLETE: Owner approved AS01-AS24 in full/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D-A1 CONTRACT REVIEW COMPLETE \/ OWNER DECISION FREEZE REQUIRED \/ NO SNAPSHOT MIGRATION IMPLEMENTED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: OWNER DECISION FREEZE FOR PHASE 1D MANUAL PAYMENT PART 3D-A1 MR01-MR24/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3D-A2 Owner freeze, Part 3D-A3 snapshot migration and Part 3D-B\/3D-C UI delivery[\s\S]*P16 remains mandatory for Production/,
  );
});
