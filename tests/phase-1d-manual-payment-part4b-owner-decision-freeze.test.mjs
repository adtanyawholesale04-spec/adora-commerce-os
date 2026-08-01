import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4B_STAFF_REVIEW_SERVICE_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Owner freeze records RV01-RV24 as one complete baseline", () => {
  assert.match(contract, /Owner Approval Date:\*\* 2026-08-01/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| RV${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /Any change requires[\s\S]*new explicit Owner decision/);
});

test("Owner freeze keeps every implementation surface closed", () => {
  assert.match(contract, /authorizes \*\*Part 4C forward-only migration contract review only\*\*/);
  assert.match(
    contract,
    /does not authorize SQL generation, local or Production apply, Server[\s\S]*Actions, Admin UI, feature activation, Storage or provider work/,
  );
});

test("status records the freeze without claiming migration implementation", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE COMPLETE: Owner approved RV01-RV24 in full/,
  );
  assert.doesNotMatch(status, /PART 4C STAFF REVIEW MIGRATION IMPLEMENTED/);
});
