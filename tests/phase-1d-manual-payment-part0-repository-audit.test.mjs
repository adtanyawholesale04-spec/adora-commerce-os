import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART0_REPOSITORY_AUDIT.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const foundation = readFileSync(
  "supabase/migrations/20260731172908_phase_1d_checkout_foundation.sql",
  "utf8",
);
const paymentSchema = readFileSync(
  "supabase/migrations/020_payments.sql",
  "utf8",
);

test("manual payment Part 0 audit reuses canonical Commerce Core sources", () => {
  assert.match(audit, /AUDIT COMPLETE \/ CONTRACT DECISIONS REQUIRED \/ NO SQL AUTHORIZED/);
  for (const source of [
    "`orders`",
    "`payments`",
    "`payment_transactions`",
    "`payment_proofs`",
    "`inventory_reservations`",
    "`coupon_redemptions`",
    "`commerce_idempotency_keys`",
    "`audit_logs`",
    "`attribution_events`",
  ]) {
    assert.match(audit, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(audit, /No duplicate commerce master is required or permitted/);
});

test("audit identifies current reference, proof and idempotency posture", () => {
  assert.match(foundation, /payment_transactions_active_manual_reference_uidx/);
  assert.match(foundation, /'PAYMENT_PROOF_SUBMIT'/);
  assert.match(foundation, /'PAYMENT_VERIFY'/);
  assert.match(foundation, /'PAYMENT_REJECT'/);
  assert.match(paymentSchema, /external_reference varchar\(255\)/);
  assert.match(paymentSchema, /storage_path text not null/);
  assert.match(audit, /reference-only submission[\s\S]*mandatory `payment_proofs\.storage_path`/);
});

test("audit keeps protected payment, private proof and Production work blocked", () => {
  assert.match(audit, /No guarded customer payment submission RPC exists/);
  assert.match(audit, /No private payment-proof Storage bucket/);
  assert.match(audit, /generic inventory wrappers are insufficient/);
  assert.match(audit, /Production apply remains separately gated/);
  assert.match(audit, /No migration, runtime, provider,[\s\S]*UI activation or Production change/);
});

test("status advances to the manual payment contract decision gate", () => {
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 0 REPOSITORY AUDIT COMPLETE/);
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
