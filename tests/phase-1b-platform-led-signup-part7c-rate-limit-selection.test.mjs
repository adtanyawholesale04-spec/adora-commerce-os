import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const selection = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART7C_DURABLE_RATE_LIMIT_SELECTION.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 7C freezes Supabase Postgres without authorizing migration", () => {
  assert.match(selection, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN/);
  assert.match(selection, /\*\*Store:\*\* Existing Supabase Postgres/);
  assert.match(selection, /Required later; not authorized by this selection/);
  assert.match(selection, /does not create a\s+table, function, scheduled cleanup job or public signup route/);
});

test("Part 7C protects pre-auth identifiers and fails closed", () => {
  assert.match(selection, /Never persist a raw IP address, email address, phone number or CAPTCHA token/);
  assert.match(selection, /HMAC-SHA256 and a server-only secret pepper/);
  assert.match(selection, /ACOS_SIGNUP_ABUSE_HASH_SECRET/);
  assert.match(selection, /count denied attempts/);
  assert.match(selection, /fail closed/);
  assert.match(selection, /revoke all direct access from `public`, `anon` and `authenticated`/);
});

test("Part 7C freezes dimensions while leaving numeric thresholds gated", () => {
  assert.match(selection, /`IP`/);
  assert.match(selection, /`DESTINATION`/);
  assert.match(selection, /`GLOBAL`/);
  assert.match(selection, /does not freeze numeric limits/);
  assert.match(selection, /no longer than 24 hours after their\s+window ends/);
});

test("Part 7C remains reconciled after local URL selection", () => {
  assert.match(
    status,
    /PHASE 1B PART 7C DURABLE RATE LIMIT SELECTION OWNER APPROVED \/ FROZEN/,
  );
  assert.match(
    status,
    /NEXT: Phase 1C Storefront MVP/,
  );
});
