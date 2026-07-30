import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const adapters = readFileSync(
  "src/lib/platform-signup/adapters.ts",
  "utf8",
);
const authBoundary = readFileSync(
  "src/lib/platform-signup/auth-boundary.ts",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART8C_SERVER_PROVIDER_ADAPTERS.md",
  "utf8",
);

test("Part 8C adapters are server-only and keep secrets out of public contracts", () => {
  assert.match(adapters, /^import "server-only";/);
  assert.match(adapters, /requiredSecret\(env\.ACOS_SIGNUP_ABUSE_HASH_SECRET\)/);
  assert.match(adapters, /requiredSecret\(env\.ACOS_PLATFORM_CALLBACK_STATE_SECRET\)/);
  assert.match(adapters, /const SECRET_MIN_BYTES = 32/);
  assert.doesNotMatch(authBoundary, /ipHash|destinationHash/);
  assert.match(contract, /browsers do not choose persisted\s+hashes/i);
});

test("durable limiter uses domain-separated HMAC identities for all scopes", () => {
  assert.match(adapters, /createHmac\("sha256", secret\)/);
  assert.match(adapters, /acos:platform-signup:\$\{scope\}\\0\$\{value\}/);
  assert.match(adapters, /"IP" \| "DESTINATION" \| "GLOBAL"/);
  assert.match(adapters, /api_consume_platform_signup_rate_limit/);
  assert.match(adapters, /readBoundedInteger/);
  assert.match(adapters, /decisions\.every\(Boolean\)/);
});

test("callback state is signed, allowlisted, bounded and time checked on seal and open", () => {
  assert.match(adapters, /timingSafeEqual/);
  assert.match(adapters, /const CALLBACK_TOKEN_MAX_LENGTH = 4096/);
  assert.match(adapters, /const expectedKeys = \[/);
  assert.ok(
    adapters.match(/isPlatformCallbackStateCurrent\(state, now\(\)\)/g)
      ?.length >= 2,
  );
  assert.match(adapters, /getPlatformCallbackUrl/);
  assert.doesNotMatch(adapters, /x-forwarded-host|headers\(\)/i);
});

test("Supabase Auth owns CAPTCHA and callback session verification", () => {
  assert.match(adapters, /captchaToken: input\.captchaToken/);
  assert.match(adapters, /emailRedirectTo: approvedCallbackUrl/);
  assert.match(adapters, /exchangeCodeForSession\(code\)/);
  assert.match(adapters, /\.auth\.getUser\(\)/);
  assert.doesNotMatch(adapters, /siteverify|TURNSTILE_SECRET|getSession\(/);
});

test("bootstrap reuses Part 4 and remains isolated from the later Part 8D route", () => {
  assert.match(adapters, /createPlatformSignupService/);
  assert.match(adapters, /createSupabaseAuthAdminClient/);
  assert.equal(existsSync("src/app/auth/platform/callback/route.ts"), true);
  assert.doesNotMatch(adapters, /src\/app\/auth\/platform|NextResponse/);
  assert.match(status, /PHASE 1B PART 8C SERVER PROVIDER ADAPTERS IMPLEMENTED \/ VALIDATED/);
  assert.match(
    status,
    /NEXT: Phase 1C Storefront MVP/,
  );
});
