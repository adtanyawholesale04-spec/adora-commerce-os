import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const evidence = readFileSync("docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4G_E_LOCAL_ACTIVATION_VALIDATION.md", "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4G-E records local Auth/RLS validation without Production activation", () => {
  assert.match(evidence, /\*\*Status:\*\* VALIDATED LOCALLY \/ BROWSER QA PASSED/);
  assert.match(evidence, /staff-review action suite passed/);
  assert.match(evidence, /concurrency race/);
  assert.match(evidence, /keyboard\/focus behavior/);
  assert.match(evidence, /No Production project, migration, public activation/);
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 4G-E LOCAL ACTIVATION, AUTH\/RLS, BROWSER QA AND CONTROLLED-STATE MATRIX VALIDATED/);
  assert.match(status, /CURRENT SUBSTEP: PHASE 1E RECEIPT ROLE MAPPING OWNER DECISION REQUIRED \/ RM01-RM24 PREPARED/);
  assert.match(status, /NEXT SUBSTEP: OWNER APPROVAL OR AMENDMENT FOR RECEIPT ROLE MAPPING RM01-RM24/);
  assert.match(status, /BLOCKED: P16 approved recovery plan execution,[\s\S]*Production apply remains unauthorized/);
  assert.match(status, /Latest validation:[\s\S]*authenticated Chrome QA also completed queue\/detail, Verify, Reject, queue removal and keyboard\/focus checks/);
  assert.match(status, /HISTORICAL GATE MARKER \(pre-authenticated-browser QA\): CURRENT SUBSTEP:/);
});

