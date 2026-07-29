import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const audit = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART0_READINESS_AUDIT.md",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1B Part 0 audit preserves identity and tenant boundaries", () => {
  assert.match(audit, /\*\*Status:\*\* VALIDATED \/ OWNER DECISIONS REQUIRED/);
  assert.match(audit, /Do not create a platform or synthetic organization/);
  assert.match(audit, /Do not create a tenant `customers` row/);
  assert.match(audit, /Do not infer or merge identity from email, phone/);
  assert.match(audit, /Public profile is absent\/private until explicit opt-in/);
  assert.match(audit, /No organization membership, customer row or ownership link is created/);
  assert.match(audit, /Part 1 Owner Decision Freeze is\s+\*\*ready\*\*/);
  assert.match(status, /PHASE 1B PART 0 REPOSITORY & DEPENDENCY AUDIT VALIDATED/);
  assert.match(status, /PHASE 1B PART 1 OWNER DECISION FREEZE COMPLETE/);
  assert.match(status, /PHASE 1B PART 3 GUARDED DATABASE BOUNDARY IMPLEMENTED \/ VALIDATED/);
});
