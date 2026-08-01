import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART1B_STAFF_REVIEW_DECISION_TABLE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 1B freezes all Owner-approved staff review decisions", () => {
  assert.match(contract, /OWNER APPROVED \/ SR01-SR24 FROZEN/);
  assert.match(contract, /Owner Approval Date:\*\* 2026-08-01/);
  assert.match(contract, /approved all recommended values SR01-SR24 on 2026-08-01/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| SR${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /Runtime:\*\* NOT AUTHORIZED/);
  assert.match(contract, /Migration:\*\* NOT AUTHORIZED/);
});

test("review requires exact permission, reason and optimistic state", () => {
  assert.match(contract, /Require `payment\.verify` for both approve and reject/);
  assert.match(contract, /reason of 8-500 characters/);
  assert.match(contract, /Reviewer profile must differ from `payment_transactions\.created_by`/);
  assert.match(contract, /expected status exactly `PENDING`/);
  assert.match(contract, /First committed terminal decision wins/);
});

test("review preserves financial truth, privacy and settlement isolation", () => {
  assert.match(contract, /Reviewer cannot enter or edit amount\/currency/);
  assert.match(contract, /set the pending transaction to `FAILED`, proof to `REJECTED`/);
  assert.match(contract, /Approval has no intermediate editable verified state/);
  assert.match(contract, /exclude payment reference and proof payload/);
  assert.match(contract, /Part 1C must align every order reservation hold through `payment_due_at`/);
});

test("status records the freeze and advances to Part 1C design", () => {
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 1B STAFF REVIEW DECISION TABLE PREPARED/);
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 1B OWNER DECISION FREEZE COMPLETE/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4C OWNER DECISION FREEZE COMPLETE FOR RM01-RM30/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4D LAYER A PRIVATE REVIEW READ MIGRATION GENERATION AND LOCAL VALIDATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4D Layer A SQL generation and apply, Layer B guarded action SQL,[\s\S]*P16 remains mandatory for Production/,
  );
});
