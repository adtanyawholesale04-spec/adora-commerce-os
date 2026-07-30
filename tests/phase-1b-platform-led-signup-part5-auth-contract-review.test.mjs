import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const review = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART5_AUTH_CALLBACK_CONTRACT_REVIEW.md",
  "utf8",
);
const callback = fs.readFileSync("src/app/auth/callback/route.ts", "utf8");
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 5 records the existing callback and protects member invite behavior", () => {
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /verifyOtp/);
  assert.match(callback, /acceptMemberInvitationFromCallback/);
  assert.match(review, /must not be extended by treating every successful Auth callback as a\s+platform signup/);
  assert.match(review, /Admin login and member invitation acceptance remain behaviorally unchanged/);
});

test("Part 5 freezes Owner decisions while preserving provider gates", () => {
  assert.match(review, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(review, new RegExp(`A${String(id).padStart(2, "0")}`));
  }
  assert.match(review, /Part 6 Auth implementation is \*\*BLOCKED\*\*/);
  assert.match(review, /CAPTCHA provider/);
  assert.match(review, /production SMTP\/email provider/);
  assert.match(review, /durable shared rate-limit adapter/);
  assert.match(review, /production Site URL and exact redirect allowlist/);
  assert.match(status, /PHASE 1B PART 5 AUTH SIGNUP AND CALLBACK CONTRACT REVIEW COMPLETE/);
  assert.match(status, /PHASE 1B PART 5 OWNER DECISION FREEZE COMPLETE/);
  assert.match(
    status,
    /NEXT: Phase 1C Storefront MVP/,
  );
});

test("Part 5 preserves identity privacy and tenant isolation", () => {
  assert.match(review, /Email and password only/);
  assert.match(review, /Phone signup.*Deferred/);
  assert.match(review, /OAuth\/social signup.*Deferred/);
  assert.match(review, /signed, short-lived, HTTP-only state\/cookie/i);
  assert.match(review, /No automatic merge\/link, organization, membership, tenant customer or consent creation/);
  assert.match(review, /Never log raw email, password, CAPTCHA token, Auth code, token hash/);
});
