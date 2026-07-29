import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const config = fs.readFileSync("supabase/config.toml", "utf8");
const envExample = fs.readFileSync(".env.example", "utf8");
const report = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART8A_LOCAL_CONFIGURATION_READINESS.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 8A aligns exact local Auth destinations", () => {
  assert.match(config, /site_url = "http:\/\/localhost:3000"/);
  assert.match(config, /"http:\/\/localhost:3000\/auth\/callback"/);
  assert.match(config, /"http:\/\/localhost:3000\/auth\/platform\/callback"/);
  assert.doesNotMatch(config, /site_url = "http:\/\/127\.0\.0\.1:3000"/);
  assert.doesNotMatch(config, /additional_redirect_urls = \[[^\]]*\*/s);
});

test("Part 8A enforces the frozen local Auth posture", () => {
  assert.match(config, /\[auth\][\s\S]*enable_anonymous_sign_ins = false/);
  assert.match(config, /minimum_password_length = 8/);
  assert.match(config, /\[auth\.email\][\s\S]*enable_confirmations = true/);
  assert.match(config, /\[auth\.sms\][\s\S]*enable_signup = false/);
  assert.match(config, /\[local_smtp\][\s\S]*enabled = true[\s\S]*port = 54324/);
});

test("Part 8A declares disabled, secret-free environment defaults", () => {
  assert.match(envExample, /^ACOS_PLATFORM_SIGNUP_ENABLED=false$/m);
  assert.match(envExample, /^ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true$/m);
  assert.match(envExample, /^ACOS_PLATFORM_APP_ORIGIN=http:\/\/localhost:3000$/m);
  assert.match(envExample, /^ACOS_SIGNUP_ABUSE_HASH_SECRET=$/m);
  assert.match(envExample, /^ACOS_PLATFORM_CALLBACK_STATE_SECRET=$/m);
  assert.match(envExample, /^NEXT_PUBLIC_TURNSTILE_SITE_KEY=$/m);
  assert.doesNotMatch(envExample, /TURNSTILE_SECRET/);
  assert.doesNotMatch(envExample, /RESEND_API_KEY/);
});

test("Part 8A records readiness and stops before protected migration", () => {
  assert.match(report, /\*\*Status:\*\* IMPLEMENTED \/ VALIDATED/);
  assert.match(report, /\*\*Supabase CLI:\*\* `2\.109\.1` pinned project dependency/);
  assert.match(report, /CAPTCHA is not enabled in `config\.toml`/);
  assert.match(
    status,
    /PHASE 1B PART 8A LOCAL CONFIGURATION READINESS IMPLEMENTED \/ VALIDATED/,
  );
  assert.match(
    status,
    /NEXT: Phase 1B Part 8C Server Provider Adapters/,
  );
});
