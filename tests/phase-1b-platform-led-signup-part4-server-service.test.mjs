import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/lib/platform-signup/service.ts", "utf8");
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART4_SERVER_SERVICE_BOUNDARY.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4 remains server-only and fail-closed", () => {
  assert.match(source, /import "server-only"/);
  assert.match(source, /ACOS_PLATFORM_SIGNUP_ENABLED/);
  assert.match(source, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_ACOS_PLATFORM_SIGNUP/);
  assert.match(source, /if \(!dependencies\.abuseGuard\).*"rate_limited"/);
  assert.match(source, /\^\[a-f0-9\]\{64\}\$/);
  assert.doesNotMatch(source, /console\.(log|error)|throw new Error/);
});

test("Part 4 maps exactly the frozen guarded operations without UI exposure", () => {
  for (const rpc of [
    "api_bootstrap_platform_account",
    "api_get_platform_onboarding_snapshot",
    "api_update_platform_interests",
    "api_record_community_terms_decision",
    "api_update_public_profile_draft",
    "api_complete_platform_onboarding",
  ]) {
    assert.match(source, new RegExp(rpc));
  }
  assert.match(contract, /No route, Server Action, signup page or browser/);
  assert.match(status, /PHASE 1B PART 4 SERVER APPLICATION SERVICE BOUNDARY IMPLEMENTED \/ VALIDATED/);
  assert.match(
    status,
    /NEXT: Phase 1B Part 8C Server Provider Adapters/,
  );
});
