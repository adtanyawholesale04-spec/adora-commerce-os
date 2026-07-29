import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const review = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART5_AUTH_CALLBACK_CONTRACT_REVIEW.md",
  "utf8",
);
const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART5_OWNER_DECISION_FREEZE.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Owner freeze approves A01-A24 without guessing external providers", () => {
  assert.match(review, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /approved decisions A01-A24/);
  assert.match(freeze, /does not select\s+a vendor, paid plan, secret, storage endpoint or production domain/);
  assert.match(freeze, /CAPTCHA provider and secret-management boundary/);
  assert.match(freeze, /production SMTP\/email provider and cost policy/);
  assert.match(freeze, /durable shared rate-limit adapter\/storage/);
  assert.match(freeze, /production Site URL and exact redirect allowlist/);
});

test("Owner freeze keeps production Auth rollout blocked", () => {
  assert.match(freeze, /Production-capable Auth signup[\s\S]*\*\*BLOCKED\*\*/);
  assert.match(status, /PHASE 1B PART 5 OWNER DECISION FREEZE COMPLETE/);
  assert.match(
    status,
    /NEXT: Phase 1B Part 8C Server Provider Adapters/,
  );
});
