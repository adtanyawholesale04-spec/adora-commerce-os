import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const decision = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_ROLE_MAPPING_OWNER_DECISION_TABLE.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Receipt role mapping prepares exactly RM01-RM24 for Owner review", () => {
  assert.match(decision, /OWNER DECISION REQUIRED \/ RM01-RM24 PREPARED/);
  assert.match(decision, /Owner Approval Date:\*\* Pending/);
  assert.equal(
    decision.match(/^\| RM\d{2} \|.*\| Owner decision required \|$/gm)?.length,
    24,
  );
  assert.match(decision, /Migration:\*\* None authorized/);
  assert.match(decision, /Runtime:\*\* None authorized/);
  assert.match(decision, /Production:\*\* NOT AUTHORIZED \/ BLOCKED BY P16/);
});

test("Receipt role matrix keeps lifecycle authority least-privileged", () => {
  assert.match(decision, /\| `owner` \| YES \| YES \| YES \| YES \|/);
  assert.match(decision, /\| `manager` \| YES \| YES \| NO \| NO \|/);
  assert.match(decision, /\| `warehouse` \| NO \| NO \| NO \| NO \|/);
  assert.match(decision, /\| `support` \| NO \| NO \| NO \| NO \|/);
  assert.match(decision, /\| Custom roles \| NO AUTO-GRANT \| NO AUTO-GRANT \| NO AUTO-GRANT \| NO AUTO-GRANT \|/);
  assert.match(decision, /Create no new `finance`, `accounting`, `cashier`, or other role/);
  assert.match(decision, /Customer Portal Receipt access remains ownership-scoped/);
  assert.match(decision, /Do not infer Receipt authority from `payment\.view`, `payment\.verify`, `payment\.refund`/);
});

test("Receipt role mapping remains gated on explicit Owner approval", () => {
  assert.match(status, /Receipt Role Mapping Owner Decision Table.*OWNER DECISION REQUIRED \/ RM01-RM24 PREPARED/);
  assert.match(status, /CURRENT SUBSTEP: PHASE 1E RECEIPT ROLE MAPPING OWNER DECISION REQUIRED \/ RM01-RM24 PREPARED/);
  assert.match(status, /NEXT SUBSTEP: OWNER APPROVAL OR AMENDMENT FOR RECEIPT ROLE MAPPING RM01-RM24/);
  assert.match(status, /no role mapping, migration, runtime or Production authority was created/i);
});
