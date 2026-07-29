import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const er = fs.readFileSync(
  "docs/er/ER_ADDENDUM_PHASE_1B_PLATFORM_LED_SIGNUP.md",
  "utf8",
);
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART2_SERVICE_CONTRACT.md",
  "utf8",
);
const migrationPlan = fs.readFileSync(
  "docs/migrations/MIGRATION_PLAN_PHASE_1B_PLATFORM_LED_SIGNUP.md",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1B Part 2 design is Owner-frozen and remains additive", () => {
  assert.match(er, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN FOR MIGRATION PLANNING/);
  assert.match(er, /\*\*Owner Approval Date:\*\* 2026-07-29/);
  assert.match(er, /must\s+not receive a synthetic `organization_id`/);
  assert.match(er, /No relationship from this graph to a tenant customer or membership/);
  assert.match(er, /Avatar persistence is deferred/);
  assert.match(er, /Revoke table access from `PUBLIC`, `anon` and `authenticated`/);
  assert.match(contract, /creates no organization, membership, tenant customer or ownership link/);
  assert.match(contract, /never writes tenant `customer_interests`/);
  assert.match(contract, /never creates tenant marketing consent/);
  assert.match(contract, /Public publication remains unavailable until Phase 3/);
  assert.match(contract, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(contract, /does not itself authorize migration SQL/);
  assert.match(migrationPlan, /\*\*Status:\*\* IMPLEMENTED \/ VALIDATED/);
  assert.match(migrationPlan, /\*\*SQL Generated:\*\* Yes/);
  assert.match(migrationPlan, /No historical migration may be edited/);
  assert.match(status, /PHASE 1B PART 2 CONTRACT & ER ADDENDUM OWNER APPROVED \/ FROZEN/);
  assert.match(status, /PHASE 1B PART 4 SERVER APPLICATION SERVICE BOUNDARY IMPLEMENTED \/ VALIDATED/);
});
