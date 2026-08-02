import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const action = fs.readFileSync("src/app/portal/auth-actions.ts", "utf8");
const callback = fs.readFileSync("src/app/auth/callback/route.ts", "utf8");
const form = fs.readFileSync("src/app/portal/portal-magic-link-form.tsx", "utf8");
const login = fs.readFileSync("src/app/portal/login/page.tsx", "utf8");
const portal = fs.readFileSync("src/app/portal/page.tsx", "utf8");
const proxy = fs.readFileSync("src/proxy.ts", "utf8");
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_PART2_AUTH_SESSION_INTEGRATION.md",
  "utf8",
);

test("customer portal sign-in uses the existing Auth source and fixed callback", () => {
  assert.match(action, /^"use server";/);
  assert.match(action, /signInWithOtp/);
  assert.match(action, /shouldCreateUser: false/);
  assert.match(action, /searchParams\.set\("next", portalPath\)/);
  assert.match(action, /captchaToken/);
  assert.doesNotMatch(action, /formData\.get\("next"\)/);
  assert.doesNotMatch(action, /service.role|service_role|createSupabaseAuthAdminClient/);
  assert.match(callback, /acceptMemberInvitationFromCallback/);
  assert.match(callback, /appendAuthCallbackError\(next\)/);
});

test("customer login and portal expose controlled session affordances", () => {
  assert.match(form, /data-action="customer_portal_magic_link"/);
  assert.match(form, /data-response-field-name="cf-turnstile-response"/);
  assert.match(login, /signInToCustomerPortalAction/);
  assert.match(login, /supabase\.auth\.getUser\(\)/);
  assert.match(login, /redirect\("\/portal"\)/);
  assert.match(portal, /signOutFromCustomerPortalAction/);
  assert.match(portal, /href="\/portal\/login"/);
});

test("portal proxy refreshes cookies without becoming an authorization layer", () => {
  assert.match(proxy, /matcher: \["\/portal\/:path\*"\]/);
  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.match(proxy, /request\.cookies\.set/);
  assert.match(proxy, /response\.cookies\.set/);
  assert.match(proxy, /response\.headers\.set/);
  assert.doesNotMatch(proxy, /service.role|service_role|\.from\(|\.rpc\(|redirect\(/);
  assert.match(contract, /Portal server read boundary remains the\s+authorization authority/);
});
