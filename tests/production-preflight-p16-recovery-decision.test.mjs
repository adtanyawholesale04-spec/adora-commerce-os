import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const decision = readFileSync(
  "docs/api-contracts/ACOS_PRODUCTION_PREFLIGHT_P16_RECOVERY_DECISION.md",
  "utf8",
);
const preflight = readFileSync(
  "docs/migrations/ACOS_PRODUCTION_PREFLIGHT_2026-08-01.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("P16 freezes the minimum provider-managed recovery posture", () => {
  assert.match(decision, /OWNER APPROVED \/ POLICY FROZEN \/ EXECUTION BLOCKED/);
  assert.match(decision, /Supabase Pro before Production migration apply/);
  assert.match(decision, /daily physical backups with seven-day retention/);
  assert.match(decision, /PITR[\s\S]*Defer at initial launch/);
  assert.match(decision, /Initial RPO[\s\S]*Maximum 24 hours/);
  assert.match(decision, /Initial RTO[\s\S]*Maximum 4 hours/);
});

test("P16 keeps Auth, Storage and paid actions separately guarded", () => {
  assert.match(decision, /managed database\/Auth restore: PASS/);
  assert.match(decision, /Storage object restore: PASS/);
  assert.match(decision, /database backups include Storage metadata but not the underlying Storage/);
  assert.match(decision, /Every paid activation remains a separate Owner approval/);
  assert.match(decision, /No Cloudflare R2 bucket, Supabase upgrade,[\s\S]*is authorized/);
  assert.match(decision, /Production migration apply: BLOCKED/);
});

test("P16 decision advances preflight without claiming execution", () => {
  assert.match(preflight, /The policy decision is complete\. P16 execution remains blocked/);
  assert.match(preflight, /P16 RECOVERY EXECUTION AND PRODUCTION CHANGE-WINDOW PREPARATION/);
  assert.match(status, /LOCAL RELEASE CANDIDATE AND UI\/UX POLISH/);
  assert.match(status, /BLOCKED: P16 approved recovery plan execution,[\s\S]*Production apply remains unauthorized/);
});
