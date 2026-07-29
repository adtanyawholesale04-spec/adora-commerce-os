import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const report = readFileSync(
  "docs/testing/ACOS_PHASE_1B_PART8E_LOCAL_E2E_VALIDATION_REPORT.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const config = readFileSync("supabase/config.toml", "utf8");
const suite = readFileSync(
  "supabase/validation/phase-1b-platform-signup-local-e2e-suite.mjs",
  "utf8",
);

test("Part 8E records passed local flow and privacy evidence", () => {
  assert.match(report, /fresh migration replay passed/);
  assert.match(report, /Mailpit captured the confirmation email/);
  assert.match(report, /PKCE exchange/);
  assert.match(report, /no organization membership/);
  assert.match(suite, /CUSTOMER_ACCOUNT_CREATED/);
  assert.match(suite, /organization_memberships/);
  assert.match(suite, /customer_profile_links/);
});

test("Part 8E validates the approved Admin Auth CAPTCHA compatibility", () => {
  assert.match(report, /\*\*Status:\*\* VALIDATED/);
  assert.match(report, /signInWithOtp/);
  assert.match(report, /Supabase Auth remains the single token-validation owner/);
  assert.match(report, /shouldCreateUser: false/);
  assert.match(config, /\[auth\.captcha\][\s\S]*enabled = true/);
  assert.match(
    status,
    /PHASE 1B PART 8E LOCAL END-TO-END VALIDATION COMPLETE \/ VALIDATED/,
  );
  assert.match(status, /NEXT: Owner Decision Freeze for Part 8F inputs P01-P16/);
});
