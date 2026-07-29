import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/lib/platform-signup/auth-boundary.ts", "utf8");
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART6_PROVIDER_NEUTRAL_AUTH_BOUNDARY.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 6 defines every provider-neutral port without runtime adapters", () => {
  assert.match(source, /import "server-only"/);
  for (const port of [
    "PlatformSignupRateLimiter",
    "PlatformCallbackStateCodec",
    "PlatformEmailPasswordAuthGateway",
    "PlatformCallbackSessionGateway",
    "PlatformAccountBootstrapPort",
  ]) {
    assert.match(source, new RegExp(`export type ${port}`));
  }
  assert.doesNotMatch(
    source,
    /createSupabase|\.auth\.signUp|fetch\s*\(|axios|siteverify|hcaptcha|resend|sendgrid|upstash/i,
  );
});

test("Part 6 callback state is short-lived and excludes secrets", () => {
  assert.match(source, /intent: "PLATFORM_SIGNUP"/);
  assert.match(source, /isValidTurnstileTokenShape/);
  assert.match(source, /expiresAt - issuedAt <= 15 \* 60 \* 1000/);
  assert.match(source, /PLATFORM_SIGNUP_CALLBACK_PATH = "\/auth\/platform\/callback"/);
  assert.match(source, /PLATFORM_ONBOARDING_PATH = "\/onboarding"/);
  const stateBlock = source.match(/export type PlatformCallbackState = \{([\s\S]*?)\n\};/)?.[1] ?? "";
  assert.doesNotMatch(
    stateBlock,
    /email|password|captcha|authCode|tokenHash|session|ipHash|destinationHash/i,
  );
});

test("Part 6 remains runtime-disabled pending provider selection", () => {
  assert.match(contract, /\*\*Status:\*\* IMPLEMENTED \/ VALIDATED \/ RUNTIME DISABLED/);
  assert.match(contract, /Production and public runtime\s+remain \*\*BLOCKED\*\*/);
  assert.match(status, /PHASE 1B PART 6 PROVIDER-NEUTRAL AUTH BOUNDARY DESIGN IMPLEMENTED \/ VALIDATED/);
  assert.match(
    status,
    /NEXT: Part 8F External Values And Evidence Collection/,
  );
});
