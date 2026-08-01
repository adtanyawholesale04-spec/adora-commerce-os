import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const evidence = readFileSync("docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4G_E_LOCAL_ACTIVATION_VALIDATION.md", "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4G-E records local Auth/RLS validation without Production activation", () => {
  assert.match(evidence, /\*\*Status:\*\* PARTIALLY VALIDATED \/ BROWSER VERIFY AND REJECT QA PASSED \/ KEYBOARD-FOCUS QA PENDING/);
  assert.match(evidence, /staff-review action suite passed/);
  assert.match(evidence, /concurrency race/);
  assert.match(evidence, /No Production project, migration, public activation/);
  assert.match(status, /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E LOCAL ACTIVATION AND AUTH\/RLS VALIDATED; REAL BROWSER QA BLOCKED/);
  assert.match(status, /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E REAL BROWSER WORKFLOW QA REQUIRES BROWSER CONNECTION AND AUTHENTICATED UI SESSION/);
  assert.match(status, /BLOCKED: Part 4G-E real browser workflow QA,[\s\S]*P16 remains mandatory for Production/);
});

