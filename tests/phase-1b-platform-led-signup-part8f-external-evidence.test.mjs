import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const evidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_EXTERNAL_EVIDENCE_RECONCILIATION.md";
const p06OperationsPath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P06_TURNSTILE_CREDENTIAL_OPERATIONS.md";
const p07EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P07_RESEND_DOMAIN_EVIDENCE.md";
const p09EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P09_RESEND_DNS_VERIFICATION.md";
const p08EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P08_SENDER_IDENTITY_FREEZE.md";
const statusPath = "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md";

test("Part 8F evidence reconciles every P01-P16 input", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  for (let index = 1; index <= 16; index += 1) {
    const id = `P${String(index).padStart(2, "0")}`;
    assert.match(evidence, new RegExp(`\\| ${id} \\|`));
  }

  assert.match(evidence, /VERIFIED: 9/);
  assert.match(evidence, /PARTIAL: 1/);
  assert.match(evidence, /OWNER DECISION REQUIRED: 0/);
  assert.match(evidence, /MISSING: 6/);
});

test("Part 8F verifies the approved P01-P06 provider evidence", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  assert.match(evidence, /pirewyrhddrhmtiwmlaw/);
  assert.match(evidence, /ap-northeast-1 \(Tokyo\)/);
  assert.match(evidence, /https:\/\/adora-commerce-os\.vercel\.app/);
  assert.match(evidence, /https:\/\/adora-commerce\.com/);
  assert.match(evidence, /\| P01 \| VERIFIED \|/);
  assert.match(evidence, /\| P02 \| VERIFIED \|/);
  assert.match(evidence, /\| P03 \| VERIFIED \|/);
  assert.match(evidence, /\| P04 \| VERIFIED \|/);
  assert.match(evidence, /\| P05 \| VERIFIED \|/);
  assert.match(evidence, /\| P06 \| VERIFIED \|/);
  assert.match(evidence, /deployment\/temporary domain and is not canonical/);
  assert.match(evidence, /prj_toXXCAFY8ajeBJPlDHWby3in7jaI/);
  assert.match(evidence, /adtanyawholesale04-spec\/adora-commerce-os/);
  assert.match(evidence, /a82fe037db6c1071\.vercel-dns-017\.com \(DNS only\)/);
  assert.match(evidence, /Supabase Auth Site URL: https:\/\/adora-commerce\.com/);
  assert.match(
    evidence,
    /Supabase Auth redirect allowlist: https:\/\/adora-commerce\.com\/auth\/platform\/callback/,
  );
  assert.match(evidence, /Cloudflare Turnstile widget: ACOS Production Signup/);
  assert.match(evidence, /Turnstile hostname\/mode: adora-commerce\.com \/ Managed/);
  assert.match(evidence, /Turnstile pre-clearance: DISABLED/);
  assert.match(evidence, /Supabase Auth CAPTCHA: ENABLED \/ CLOUDFLARE TURNSTILE/);
  assert.match(evidence, /Turnstile secret destination: SUPABASE AUTH ONLY/);
  assert.match(evidence, /Turnstile credential owner: ACOS Owner/);
  assert.match(evidence, /Turnstile rotation cadence: 90 DAYS \/ NEXT DUE 2026-10-29/);
  assert.match(evidence, /project environment variables: NONE/);
});

test("P06 freezes safe scheduled and emergency credential operations", async () => {
  const operations = await readFile(p06OperationsPath, "utf8");

  assert.match(operations, /Credential owner: ACOS Owner/);
  assert.match(operations, /Rotation cadence: every 90 days/);
  assert.match(operations, /Next scheduled rotation due: 2026-10-29/);
  assert.match(operations, /two-hour grace period/);
  assert.match(operations, /immediate invalidation only when exposure is suspected/);
  assert.match(operations, /ACOS_PLATFORM_SIGNUP_ENABLED=false/);
  assert.match(operations, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true/);
  assert.match(operations, /Never record the site key, secret, token, secret hash/);
  assert.doesNotMatch(operations, /0x4A[A-Za-z0-9_-]+/);
});

test("P07 verifies the dedicated Resend domain without crossing P09", async () => {
  const [evidence, p07] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p07EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P07 \| VERIFIED \|/);
  assert.match(evidence, /Resend transactional domain: auth\.adora-commerce\.com/);
  assert.match(evidence, /Resend sending region: Tokyo \(ap-northeast-1\)/);
  assert.match(evidence, /Resend domain status: VERIFIED/);
  assert.match(p07, /transactional sending domain: auth\.adora-commerce\.com/);
  assert.match(p07, /sending region: Tokyo \(ap-northeast-1\)/);
  assert.match(p07, /DNS verification: PENDING P09/);
  assert.match(p07, /Approved Provider Spend:\*\* USD 0/);
  assert.match(p07, /production email send: NOT AUTHORIZED/);
  assert.match(p07, /public signup: NOT AUTHORIZED/);
  assert.doesNotMatch(p07, /\bre_[A-Za-z0-9_-]{12,}\b/);
});

test("P09 verifies DNS without recording provider credential material", async () => {
  const [evidence, p09] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p09EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P09 \| VERIFIED \|/);
  assert.match(evidence, /Resend domain status: VERIFIED/);
  assert.match(evidence, /Resend DKIM\/SPF\/mail-from: VERIFIED/);
  assert.match(
    evidence,
    /DMARC monitoring: _dmarc\.adora-commerce\.com \/ p=none/,
  );
  assert.match(p09, /DKIM: VERIFIED/);
  assert.match(p09, /SPF: VERIFIED/);
  assert.match(p09, /mail-from MX: CONFIGURED/);
  assert.match(p09, /DMARC policy: p=none \(monitoring\)/);
  assert.match(p09, /DNS proxy mode: DNS ONLY/);
  assert.match(p09, /production email send: NOT AUTHORIZED/);
  assert.match(p09, /public signup: NOT AUTHORIZED/);
  assert.doesNotMatch(p09, /p=MIGfMA0GCSq/);
  assert.doesNotMatch(p09, /\bre_[A-Za-z0-9_-]{12,}\b/);
});

test("P08 freezes one exact Auth sender without enabling email", async () => {
  const [evidence, p08] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p08EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P08 \| VERIFIED \|/);
  assert.match(
    evidence,
    /Resend sender identity: ADORA Commerce <no-reply@auth\.adora-commerce\.com>/,
  );
  assert.match(p08, /sender name: ADORA Commerce/);
  assert.match(p08, /from address: no-reply@auth\.adora-commerce\.com/);
  assert.match(p08, /purpose: authentication and account lifecycle email only/);
  assert.match(p08, /reply-to: NOT CONFIGURED/);
  assert.match(p08, /production email send: NOT AUTHORIZED/);
  assert.match(p08, /public signup: NOT AUTHORIZED/);
});

test("Part 8F remains fail-closed and secret-free", async () => {
  const [evidence, status] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(statusPath, "utf8"),
  ]);

  assert.match(evidence, /ACOS_PLATFORM_SIGNUP_ENABLED must remain false/);
  assert.match(evidence, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH must remain true/);
  assert.match(evidence, /No value or secret from `\.env\.local` is recorded/);
  assert.doesNotMatch(evidence, /0x4A[A-Za-z0-9_-]+/);
  assert.match(evidence, /no production email or public signup is authorized/);
  assert.match(status, /Phase 1B Platform-Led Signup Part 8F External Evidence Reconciliation/);
});
