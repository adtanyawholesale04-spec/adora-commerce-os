import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const selection = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART7A_CAPTCHA_SELECTION.md",
  "utf8",
);
const boundary = fs.readFileSync("src/lib/platform-signup/auth-boundary.ts", "utf8");
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 7A freezes Turnstile with one validation owner", () => {
  assert.match(selection, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(selection, /\*\*Provider:\*\* Cloudflare Turnstile Free/);
  assert.match(selection, /Supabase Auth is the only Turnstile token validation owner/);
  assert.match(selection, /must not call Cloudflare Siteverify/);
  assert.match(selection, /tokens are single-use/);
});

test("Part 7A keeps the secret out of ACOS and bounds transient tokens", () => {
  assert.match(selection, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(selection, /Turnstile secret \| Supabase Auth CAPTCHA configuration/);
  assert.match(selection, /Never log, persist or put in callback state/);
  assert.match(boundary, /token\.length >= 1 && token\.length <= 2048/);
  assert.doesNotMatch(boundary, /PlatformCaptchaVerifier|siteverify|TURNSTILE_SECRET/i);
});

test("Part 7A advances the provider selection sequence", () => {
  assert.match(status, /PHASE 1B PART 7A CAPTCHA SELECTION OWNER APPROVED \/ FROZEN/);
  assert.match(
    status,
    /NEXT: Phase 1B Part 8C Server Provider Adapters/,
  );
});
