import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const localFlow = readFileSync(
  "src/lib/platform-signup/local-flow.ts",
  "utf8",
);
const action = readFileSync("src/app/signup/actions.ts", "utf8");
const form = readFileSync("src/app/signup/signup-form.tsx", "utf8");
const signupPage = readFileSync("src/app/signup/page.tsx", "utf8");
const callback = readFileSync(
  "src/app/auth/platform/callback/route.ts",
  "utf8",
);
const onboarding = readFileSync("src/app/onboarding/page.tsx", "utf8");
const service = readFileSync("src/lib/platform-signup/service.ts", "utf8");
const existingCallback = readFileSync("src/app/auth/callback/route.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 8D is local-only and production fails closed", () => {
  assert.match(localFlow, /^import "server-only";/);
  assert.match(localFlow, /env\.NODE_ENV === "production"/);
  assert.match(localFlow, /http:\/\/localhost:3000/);
  assert.match(localFlow, /isPlatformSignupAvailable\(\)/);
  assert.match(envExample, /^ACOS_PLATFORM_SIGNUP_ENABLED=false$/m);
  assert.match(envExample, /^ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true$/m);
});

test("signup action is guarded and callback state is an HttpOnly bounded cookie", () => {
  assert.match(action, /^"use server";/);
  assert.match(action, /requestLocalPlatformSignup/);
  assert.match(action, /cf-turnstile-response/);
  assert.match(localFlow, /httpOnly: true/);
  assert.match(localFlow, /sameSite: "lax"/);
  assert.match(localFlow, /path: PLATFORM_SIGNUP_CALLBACK_PATH/);
  assert.match(localFlow, /15 \* 60/);
  assert.doesNotMatch(action, /createSupabaseAuthAdminClient|\.from\(/);
});

test("Turnstile is validated once by Supabase Auth and reset after submit", () => {
  assert.match(config, /\[auth\.captcha\][\s\S]*enabled = true/);
  assert.match(config, /provider = "turnstile"/);
  assert.match(config, /secret = "env\(SUPABASE_AUTH_CAPTCHA_SECRET\)"/);
  assert.match(form, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(form, /data-action="platform_signup"/);
  assert.match(form, /window\.turnstile\?\.reset\(\)/);
  assert.doesNotMatch(localFlow, /siteverify|TURNSTILE_SECRET/);
});

test("dedicated callback verifies session, supports retry and uses fixed redirects", () => {
  assert.match(callback, /completeLocalPlatformSignupCallback/);
  assert.match(callback, /\/onboarding\?status=account_ready/);
  assert.match(callback, /callback_retry/);
  assert.match(callback, /\/signup\?status=/);
  assert.doesNotMatch(callback, /searchParams\.get\("next"\)/);
  assert.match(signupPage, /\/auth\/platform\/callback\?retry=1/);
  assert.match(signupPage, /Retry account setup/);
  assert.match(existingCallback, /acceptMemberInvitationFromCallback/);
  assert.doesNotMatch(existingCallback, /completeLocalPlatformSignupCallback/);
});

test("onboarding is private and read-only", () => {
  assert.match(onboarding, /supabase\.auth\.getUser\(\)/);
  assert.match(onboarding, /email_confirmed_at/);
  assert.match(onboarding, /getLocalPlatformOnboardingSnapshot/);
  assert.match(service, /callSnapshotRpc/);
  assert.match(service, /payload\.onboarding/);
  assert.match(service, /Array\.isArray\(payload\.active_interests\)/);
  assert.doesNotMatch(onboarding, /\.from\(|\.insert\(|\.update\(|\.delete\(/);
  assert.match(onboarding, /read-only skeleton/i);
});

test("Part 8D status advances to local E2E validation", () => {
  assert.match(
    status,
    /PHASE 1B PART 8D LOCAL SIGNUP, CALLBACK AND ONBOARDING SKELETON IMPLEMENTED \/ VALIDATED/,
  );
  assert.match(
    status,
    /NEXT: Part 8F External Values And Evidence Collection/,
  );
});
