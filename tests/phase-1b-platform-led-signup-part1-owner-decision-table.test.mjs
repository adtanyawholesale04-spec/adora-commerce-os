import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const decisionTable = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART1_OWNER_DECISION_TABLE.md",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1B Part 1 decisions are Owner-frozen and private by default", () => {
  assert.match(decisionTable, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(decisionTable, /\*\*Owner Approval Date:\*\* 2026-07-29/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(decisionTable, new RegExp(`D${String(id).padStart(2, "0")}`));
  }
  assert.match(decisionTable, /creates no organization, organization membership/);
  assert.match(decisionTable, /Account is private by default/);
  assert.match(decisionTable, /no automatic link or merge/);
  assert.match(decisionTable, /do not publish anonymously until Phase 3/);
  assert.match(decisionTable, /Community Terms is separate from tenant marketing consent/);
  assert.match(decisionTable, /Ledger \\| Not required/);
  assert.match(decisionTable, /Part 2 Contract & ER Addendum is \*\*READY\*\*/);
  assert.match(decisionTable, /does not authorize a migration/);
  assert.match(status, /PHASE 1B PART 1 OWNER DECISION FREEZE COMPLETE/);
  assert.match(status, /PHASE 1B PART 3 GUARDED DATABASE BOUNDARY IMPLEMENTED \/ VALIDATED/);
});
