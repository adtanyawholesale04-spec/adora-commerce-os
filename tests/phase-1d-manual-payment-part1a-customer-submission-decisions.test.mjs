import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART1A_CUSTOMER_SUBMISSION_DECISION_TABLE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 1A freezes every Owner-approved customer submission decision", () => {
  assert.match(contract, /OWNER APPROVED \/ PS01-PS24 FROZEN/);
  assert.match(contract, /Owner Approval Date:\*\* 2026-08-01/);
  assert.match(contract, /approved all recommended values PS01-PS24 on 2026-08-01/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| PS${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /Migration:\*\* NOT AUTHORIZED/);
  assert.match(contract, /Storage:\*\* PRIVATE PROOF UPLOAD DEFERRED \/ NOT AUTHORIZED/);
});

test("customer submission is owned, canonical and reference-only", () => {
  assert.match(contract, /Accept local `BANK_TRANSFER` reference submission only/);
  assert.match(contract, /active same-tenant organization membership/);
  assert.match(contract, /never accept `customer_id`/);
  assert.match(contract, /browser cannot submit or override amount/);
  assert.match(contract, /`storage_path = null`/);
  assert.match(contract, /evidence_type: REFERENCE_ONLY/);
});

test("customer submission remains idempotent, private and non-settling", () => {
  assert.match(contract, /operation `PAYMENT_PROOF_SUBMIT`/);
  assert.match(contract, /PAYMENT_REFERENCE_CONFLICT/);
  assert.match(contract, /at most one active `PENDING` transaction per payment aggregate/);
  assert.match(contract, /exclude reference, proof, contact, address and bank data/);
  assert.match(contract, /does not mark money received, change an[\s\S]*emit `ORDER_PAID`/);
});

test("implementation status records the freeze and advances to Part 1B design", () => {
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 1A CUSTOMER SUBMISSION DECISION TABLE PREPARED/);
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 1A OWNER DECISION FREEZE COMPLETE/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3C LOCAL VALIDATED \/ FLAGS DISABLED \/ UI AND PRODUCTION NOT ACTIVATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D STOREFRONT SUBMISSION UI CONTRACT REVIEW/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3D Storefront submission UI, staff verification, private proof Storage[\s\S]*P16 remains mandatory for Production/,
  );
});
