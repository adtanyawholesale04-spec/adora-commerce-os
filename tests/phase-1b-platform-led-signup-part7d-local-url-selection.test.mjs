import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const selection = fs.readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART7D_LOCAL_URL_REDIRECT_SELECTION.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 7D freezes exact local destinations without guessing production", () => {
  assert.match(selection, /OWNER APPROVED \/ FROZEN FOR LOCAL DEVELOPMENT/);
  assert.match(selection, /http:\/\/localhost:3000\/auth\/platform\/callback/);
  assert.match(selection, /http:\/\/localhost:3000\/onboarding/);
  assert.match(selection, /Production Origin:\*\* Deferred/);
  assert.match(selection, /No production origin is guessed/);
});

test("Part 7D denies open redirects and unsafe production configuration", () => {
  assert.match(selection, /No request-provided `origin`, `next`, external URL/);
  assert.match(selection, /Wildcard redirect URLs are forbidden/);
  assert.match(selection, /must never derive a security-sensitive callback from an untrusted request/);
  assert.match(selection, /production\s+process must fail closed/);
});

test("Part 7D keeps deployment and Auth runtime disabled", () => {
  assert.match(selection, /does not create either route/);
  assert.match(selection, /static-only GitHub Pages deployment is not approved/);
  assert.match(selection, /production SMTP\/email provider and cost policy/);
  assert.match(selection, /public signup enablement/);
});

test("Part 7D remains reconciled after email provider selection", () => {
  assert.match(
    status,
    /PHASE 1B PART 7D LOCAL URL AND REDIRECT SELECTION OWNER APPROVED \/ FROZEN/,
  );
  assert.match(
    status,
    /NEXT: Phase 1B Part 8C Server Provider Adapters/,
  );
});
