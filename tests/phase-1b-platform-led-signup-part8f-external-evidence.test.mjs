import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const evidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_EXTERNAL_EVIDENCE_RECONCILIATION.md";
const statusPath = "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md";

test("Part 8F evidence reconciles every P01-P16 input", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  for (let index = 1; index <= 16; index += 1) {
    const id = `P${String(index).padStart(2, "0")}`;
    assert.match(evidence, new RegExp(`\\| ${id} \\|`));
  }

  assert.match(evidence, /VERIFIED: 2/);
  assert.match(evidence, /PARTIAL: 2/);
  assert.match(evidence, /OWNER DECISION REQUIRED: 0/);
  assert.match(evidence, /MISSING: 12/);
});

test("Part 8F verifies the approved P01 and P03 without guessing P02", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  assert.match(evidence, /pirewyrhddrhmtiwmlaw/);
  assert.match(evidence, /ap-northeast-1 \(Tokyo\)/);
  assert.match(evidence, /https:\/\/adora-commerce-os\.vercel\.app/);
  assert.match(evidence, /https:\/\/adora-commerce\.com/);
  assert.match(evidence, /\| P01 \| VERIFIED \|/);
  assert.match(evidence, /deployment\/temporary domain and is not canonical/);
  assert.match(evidence, /\.vercel\/project\.json.*absent/i);
});

test("Part 8F remains fail-closed and secret-free", async () => {
  const [evidence, status] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(statusPath, "utf8"),
  ]);

  assert.match(evidence, /ACOS_PLATFORM_SIGNUP_ENABLED must remain false/);
  assert.match(evidence, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH must remain true/);
  assert.match(evidence, /No value or secret from `\.env\.local` is recorded/);
  assert.match(evidence, /no production email or public signup is authorized/);
  assert.match(status, /Phase 1B Platform-Led Signup Part 8F External Evidence Reconciliation/);
});
