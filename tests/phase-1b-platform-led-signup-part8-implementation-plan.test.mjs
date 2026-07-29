import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plan = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART8_IMPLEMENTATION_PLAN.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 8 freezes a local-first six-part implementation plan", () => {
  assert.match(plan, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  for (const part of ["8A", "8B", "8C", "8D", "8E", "8F"]) {
    assert.match(plan, new RegExp(`## Part ${part}:`));
  }
  assert.match(plan, /\*\*Runtime:\*\* Disabled/);
  assert.match(plan, /\*\*Public Signup:\*\* Disabled/);
});

test("Part 8 separately gates protected and external operations", () => {
  assert.match(plan, /protected migration and requires separate explicit Owner approval/);
  assert.match(plan, /No provider secret may enter browser code/);
  assert.match(plan, /Passing local E2E does not authorize production/);
  assert.match(plan, /Production rollout remains blocked/);
});

test("Part 8 preserves canonical identity and tenant boundaries", () => {
  assert.match(plan, /Central private profile; no organization\/customer side effect/);
  assert.match(plan, /must not create customer, organization membership, payment, payout/);
  assert.match(plan, /no tenant\/customer\/consent side effects/);
});

test("Part 8 remains reconciled after local configuration readiness", () => {
  assert.match(
    status,
    /PHASE 1B PART 8 IMPLEMENTATION PLAN OWNER APPROVED \/ FROZEN/,
  );
  assert.match(
    status,
    /NEXT: Owner review and approval of Phase 1B Part 8B Durable Rate-Limit Migration Plan/,
  );
});
