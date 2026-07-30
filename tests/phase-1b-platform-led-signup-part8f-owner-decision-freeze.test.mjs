import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const freeze = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART8F_OWNER_DECISION_FREEZE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 8F freezes all P01-P16 policies and records the approved P01", () => {
  assert.match(
    freeze,
    /\*\*Status:\*\* OWNER APPROVED \/ POLICY FROZEN \/ EXTERNAL EVIDENCE PARTIAL/,
  );
  for (let id = 1; id <= 16; id += 1) {
    assert.match(freeze, new RegExp(`\\| P${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(freeze, /https:\/\/adora-commerce\.com/);
  assert.match(freeze, /deployment\/temporary domain and must not be treated as canonical/);
  assert.doesNotMatch(freeze, /exact canonical HTTPS origin;/);
  assert.match(freeze, /Project reference and region pending/);
  assert.match(
    freeze,
    /ADORA Commerce <no-reply@auth\.adora-commerce\.com>/,
  );
  assert.match(freeze, /Owner approved and exact sender identity frozen/);
  assert.match(
    freeze,
    /Verified: no tracking subdomain, exact Site URL\/callback allowlist and default ConfirmationURL template/,
  );
  assert.match(
    freeze,
    /Resend overage is unavailable, Supabase spend cap is enabled and ACOS activation is capped at one attempted signup email per hour/,
  );
  assert.match(
    freeze,
    /Verified: platform-signup values are Production-only, independent server secrets are sensitive/,
  );
  assert.match(
    freeze,
    /Verified: `ACOS Owner` owns rotation, emergency revocation and rollback/,
  );
  assert.match(
    freeze,
    /Verified: `ACOS Owner` owns Supabase Auth, Cloudflare Turnstile, Vercel runtime and Resend monitoring/,
  );
  assert.match(
    freeze,
    /Verified plan: one dedicated Owner-controlled test mailbox/,
  );
  assert.match(
    freeze,
    /Partial evidence: the approved encrypted temporary export and isolated commerce-core restore passed/,
  );
});

test("Part 8F keeps secrets, cost and rollout safely bounded", () => {
  assert.match(freeze, /recurring provider spend remains `USD 0`/);
  assert.match(freeze, /Turnstile secret \| Supabase Auth CAPTCHA configuration only/);
  assert.match(freeze, /Resend SMTP credential \| Supabase Auth Custom SMTP configuration only/);
  assert.match(freeze, /ACOS_PLATFORM_SIGNUP_ENABLED=false/);
  assert.match(freeze, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true/);
  assert.match(freeze, /Production remains `BLOCKED`/);
});

test("implementation status advances to the approved Storefront Web app work", () => {
  assert.match(
    status,
    /PHASE 1B PART 8F OWNER DECISION FREEZE COMPLETE: P01-P16 safety policies approved/,
  );
  assert.match(
    status,
    /NEXT: Phase 1C Storefront MVP/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1C STOREFRONT VISIBILITY \/ READ MODEL CONTRACT REVIEW/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1C OWNER DECISION FREEZE D01-D18/,
  );
});
