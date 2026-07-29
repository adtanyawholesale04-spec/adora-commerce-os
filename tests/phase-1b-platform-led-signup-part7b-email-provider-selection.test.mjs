import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const selection = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART7B_EMAIL_PROVIDER_COST_SELECTION.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 7B freezes local Mailpit and future Resend SMTP", () => {
  assert.match(selection, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(selection, /\*\*Local Provider:\*\* Supabase CLI Mailpit/);
  assert.match(selection, /\*\*Production Provider:\*\* Resend Custom SMTP/);
  assert.match(selection, /Supabase Auth remains the template, token and\s+confirmation-flow owner/);
});

test("Part 7B enforces zero approved spend", () => {
  assert.match(selection, /\*\*Approved Monthly Spend:\*\* USD 0/);
  assert.match(selection, /Paid-plan upgrade, payment method, overage or add-on activation requires/);
  assert.match(selection, /must not silently create paid usage/);
  assert.match(selection, /Provider quotas and prices must be rechecked/);
});

test("Part 7B keeps secrets and production delivery disabled", () => {
  assert.match(selection, /SMTP credentials live only in Supabase Auth Custom SMTP configuration/);
  assert.match(selection, /forbidden from the browser, repository, ACOS\s+application environment/);
  assert.match(selection, /does not create a\s+Resend account/);
  assert.match(selection, /No placeholder sender is approved/);
});

test("Part 7B remains reconciled after implementation planning", () => {
  assert.match(
    status,
    /PHASE 1B PART 7B EMAIL PROVIDER AND COST SELECTION OWNER APPROVED \/ FROZEN/,
  );
  assert.match(
    status,
    /NEXT: Part 8F External Values And Evidence Collection/,
  );
});
