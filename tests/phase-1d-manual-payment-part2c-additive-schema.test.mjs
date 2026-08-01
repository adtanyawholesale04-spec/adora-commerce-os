import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260731220202_phase_1d_manual_payment_additive_schema.sql",
  "utf8",
);
const preflight = readFileSync(
  "supabase/validation/sql/phase-1d-manual-payment-part2c-compatibility-preflight.sql",
  "utf8",
);
const suite = readFileSync(
  "supabase/validation/phase-1d-manual-payment-additive-schema-suite.mjs",
  "utf8",
);
const report = readFileSync(
  "docs/migrations/MIGRATION_066_PHASE_1D_MANUAL_PAYMENT_ADDITIVE_SCHEMA_VALIDATION_2026-08-01.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 2C migration implements only the Owner-frozen additive schema", () => {
  assert.match(migration, /organization_checkout_settings_payment_within_hold_check/);
  assert.match(migration, /payment_proofs_evidence_shape_check/);
  assert.match(migration, /payment_proofs_one_pending_per_transaction_uidx/);
  assert.match(migration, /payment_transactions_one_pending_bank_transfer_uidx/);
  assert.match(migration, /payment_transactions_normalized_active_bank_reference_uidx/);
  assert.match(migration, /inventory_reservations_organization_id_id_key/);
  assert.match(migration, /inventory_allocations_source_reservation_tenant_fk/);
  assert.match(migration, /inventory_allocations_source_reservation_uidx/);
  assert.match(migration, /alter column storage_path drop not null/);
  assert.match(migration, /add column source_reservation_id uuid/);
});

test("Part 2C does not widen runtime, grants, RLS or canonical sources", () => {
  assert.doesNotMatch(migration, /\b(create table|create function|create policy|grant|revoke)\b/i);
  assert.doesNotMatch(migration, /\b(insert|update|delete)\s+(into|public\.|from)/i);
  assert.doesNotMatch(migration, /drop\s+index/i);
  assert.match(migration, /set lock_timeout = '5s'/);
  assert.match(migration, /set statement_timeout = '30s'/);
  assert.match(report, /preserving the older exact[\s\S]*manual-reference index/);
});

test("Part 2C preflight and concurrency gates cover every additive invariant", () => {
  for (let id = 1; id <= 7; id += 1) {
    assert.match(preflight, new RegExp(`CF${String(id).padStart(2, "0")}_`));
  }
  assert.match(suite, /expectOneWinner\("pending attempt"/);
  assert.match(suite, /expectOneWinner\("pending proof"/);
  assert.match(suite, /expectOneWinner\("normalized active reference"/);
  assert.match(suite, /expectOneWinner\("reservation allocation"/);
  assert.match(report, /LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/);
  assert.match(report, /\| Part 2C compatibility preflight \| 7 blockers \| 0 \|/);
});

test("Part 2C status advances only to customer submission authorization", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 2C ADDITIVE SCHEMA IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D CONTRACT REVIEW COMPLETE \/ OWNER DECISION FREEZE REQUIRED \/ NO READ MIGRATION OR UI IMPLEMENTED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: OWNER DECISION FREEZE FOR PHASE 1D MANUAL PAYMENT PART 3D MU01-MU24/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3D-A guarded customer order payment snapshot and Part 3D-B\/3D-C UI delivery[\s\S]*P16 remains mandatory for Production/,
  );
});
