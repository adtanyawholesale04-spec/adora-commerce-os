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
  assert.match(report, /PREPARED \/ READ-ONLY EVIDENCE COMPLETE \/ PRODUCTION APPLY BLOCKED/);
  assert.match(report, /project ref: pirewyrhddrhmtiwmlaw/);
  assert.match(report, /repository migration files: 97/);
  assert.match(report, /Production migrations applied: 86/);
  assert.match(report, /Production pending migrations: 11/);
  assert.match(report, /remote-only migration drift: 0/);
  assert.match(report, /dry-run: PASS \/ NO WRITE/);
  assert.match(report, /repository tests: 391 \/ 391 PASS/);
  assert.match(report, /No migration was applied, repaired, pulled or edited/);
});

test("Production preflight preserves recovery and deployment blockers", () => {
  for (const required of [
    "P16 recurring backup plus managed Auth/Storage recovery disposition",
    "Clean local reset/replay and complete regression rerun",
    "Fulfillment lint warning",
    "Carrier Edge Runtime stability",
    "Vercel project link",
    "migration change window",
  ]) {
    assert.ok(report.includes(required), `${required} missing`);
  }
  assert.match(report, /does not authorize `supabase db push`/);
});

test("Implementation status advances to Owner blocker disposition", () => {
  assert.match(status, /CURRENT SUBSTEP: PRODUCTION PREFLIGHT READ-ONLY EVIDENCE COMPLETE; APPLY BLOCKED/);
  assert.match(status, /NEXT SUBSTEP: OWNER PREFLIGHT BLOCKER DISPOSITION/);
  assert.match(status, /BLOCKED: P16 recurring recovery,[\s\S]*Production apply remains unauthorized/);
});
