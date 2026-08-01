import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const report = readFileSync(
  "docs/migrations/ACOS_PRODUCTION_PREFLIGHT_2026-08-01.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Production preflight records identity and migration parity without apply", () => {
  assert.match(report, /LOCAL REPLAY VALIDATED \/ PRODUCTION APPLY BLOCKED/);
  assert.match(report, /project ref: pirewyrhddrhmtiwmlaw/);
  assert.match(report, /repository migration files: 97/);
  assert.match(report, /Production migrations applied: 86/);
  assert.match(report, /Production pending migrations: 11/);
  assert.match(report, /remote-only migration drift: 0/);
  assert.match(report, /dry-run: PASS \/ NO WRITE/);
  assert.match(report, /repository tests: 391 \/ 391 PASS/);
  assert.match(report, /No Production migration was applied, repaired or pulled/);
  assert.match(report, /local migrations applied after clean replay: 97 \/ 97/);
  assert.match(report, /reset: PASS \/ destructive local QA data cleared/);
  assert.match(report, /replay: PASS \/ all 97 repository migrations applied/);
});

test("Production preflight preserves recovery and deployment blockers", () => {
  for (const required of [
    "P16 approved recovery plan execution",
    "Fulfillment lint warning",
    "Vercel project link",
    "migration change window",
  ]) {
    assert.ok(report.includes(required), `${required} missing`);
  }
  assert.match(report, /does not authorize `supabase db push`/);
});

test("Implementation status advances to Owner blocker disposition", () => {
  assert.match(status, /CURRENT SUBSTEP: PRODUCTION PREFLIGHT P16 RECOVERY DECISION OWNER APPROVED; EXECUTION AND APPLY BLOCKED/);
  assert.match(status, /NEXT SUBSTEP: OWNER FULFILLMENT LINT WARNING DISPOSITION/);
  assert.match(status, /BLOCKED: P16 approved recovery plan execution,[\s\S]*Production apply remains unauthorized/);
});
