import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(
  "src/app/admin/_components/admin-magic-link-form.tsx",
  "utf8",
);
const action = readFileSync("src/app/admin/actions.ts", "utf8");
const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");

test("Admin magic-link sign-in forwards one transient Turnstile token", () => {
  assert.match(form, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(form, /data-action="admin_magic_link"/);
  assert.match(form, /data-response-field-name="cf-turnstile-response"/);
  assert.match(action, /formData\.get\("cf-turnstile-response"\)/);
  assert.match(action, /captchaToken/);
  assert.match(action, /shouldCreateUser: false/);
  assert.doesNotMatch(action, /siteverify|TURNSTILE_SECRET/);
});

test("member-invite callback remains isolated from CAPTCHA request changes", () => {
  assert.match(callback, /acceptMemberInvitationFromCallback/);
  assert.doesNotMatch(callback, /captchaToken|turnstile/i);
});
