import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gate = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART8F_PRODUCTION_READINESS_GATE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const envExample = readFileSync(".env.example", "utf8");
const localFlow = readFileSync(
  "src/lib/platform-signup/local-flow.ts",
  "utf8",
);

test("Part 8F blocks rollout until every external production input exists", () => {
  assert.match(gate, /\*\*Status:\*\* BLOCKED \/ OWNER INPUTS REQUIRED/);
  for (let id = 1; id <= 16; id += 1) {
    assert.match(gate, new RegExp(`\\| P${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(gate, /No production account, provider configuration, DNS change/);
  assert.match(gate, /Approved Provider Spend:\*\* USD 0/);
});

test("Part 8F preserves disabled defaults and production fail-closed behavior", () => {
  assert.match(envExample, /ACOS_PLATFORM_SIGNUP_ENABLED=false/);
  assert.match(envExample, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true/);
  assert.match(localFlow, /env\.NODE_ENV === "production"/);
  assert.match(gate, /production, preview and local environments use separate credentials/);
  assert.match(gate, /production Auth uses exact redirects, never wildcard preview URLs/);
});

test("implementation status records the Part 8F blocker without guessing", () => {
  assert.match(
    status,
    /PHASE 1B PART 8F PRODUCTION READINESS REVIEW COMPLETE \/ BLOCKED/,
  );
  assert.match(status, /NEXT: Part 8F External Values And Evidence Collection/);
});
