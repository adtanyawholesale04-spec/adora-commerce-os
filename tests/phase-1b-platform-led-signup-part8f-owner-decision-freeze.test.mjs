import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const freeze = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART8F_OWNER_DECISION_FREEZE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 8F freezes all P01-P16 policies without inventing external values", () => {
  assert.match(
    freeze,
    /\*\*Status:\*\* OWNER APPROVED \/ POLICY FROZEN \/ EXTERNAL VALUES PENDING/,
  );
  for (let id = 1; id <= 16; id += 1) {
    assert.match(freeze, new RegExp(`\\| P${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(freeze, /Exact origin pending/);
  assert.match(freeze, /Project reference and region pending/);
  assert.match(freeze, /Exact address and sender name pending/);
});

test("Part 8F keeps secrets, cost and rollout safely bounded", () => {
  assert.match(freeze, /recurring provider spend remains `USD 0`/);
  assert.match(freeze, /Turnstile secret \| Supabase Auth CAPTCHA configuration only/);
  assert.match(freeze, /Resend SMTP credential \| Supabase Auth Custom SMTP configuration only/);
  assert.match(freeze, /ACOS_PLATFORM_SIGNUP_ENABLED=false/);
  assert.match(freeze, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true/);
  assert.match(freeze, /Production remains `BLOCKED`/);
});

test("implementation status advances to external evidence collection", () => {
  assert.match(
    status,
    /PHASE 1B PART 8F OWNER DECISION FREEZE COMPLETE: P01-P16 safety policies approved/,
  );
  assert.match(
    status,
    /NEXT: Part 8F External Values And Evidence Collection/,
  );
});
