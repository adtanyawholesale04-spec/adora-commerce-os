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
const p10EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P10_AUTH_LINK_INTEGRITY_EVIDENCE.md";
const p11EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P11_QUOTA_AND_COST_EVIDENCE.md";
const p12EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P12_SECRET_DESTINATION_EVIDENCE.md";
const p13EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P13_ROTATION_REVOCATION_OPERATIONS.md";
const p14EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P14_MONITORING_ALERT_OWNERSHIP.md";
const p15EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P15_ROLLOUT_ROLLBACK_PLAN.md";
const p16EvidencePath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P16_BACKUP_RESTORE_DISPOSITION.md";
const p16DrillReportPath =
  "docs/testing/ACOS_PHASE_1B_PART8F_P16_RESTORE_DRILL_REPORT_2026-07-31.md";
const p16DeferralPath =
  "docs/api-contracts/ACOS_PHASE_1B_PART8F_P16_DEFERRED_WEB_APP_FIRST_OWNER_DECISION.md";
const statusPath = "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md";

test("Part 8F evidence reconciles every P01-P16 input", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  for (let index = 1; index <= 16; index += 1) {
    const id = `P${String(index).padStart(2, "0")}`;
    assert.match(evidence, new RegExp(`\\| ${id} \\|`));
  }

  assert.match(evidence, /VERIFIED: 15/);
  assert.match(evidence, /PARTIAL: 1/);
  assert.match(evidence, /OWNER DECISION REQUIRED: 0/);
  assert.match(evidence, /MISSING: 0/);
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
  assert.match(evidence, /P12 Vercel environment scope: PRODUCTION ONLY/);
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

test("P10 preserves Auth links without provider tracking", async () => {
  const [evidence, p10, adapters, boundary, callback] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p10EvidencePath, "utf8"),
    readFile("src/lib/platform-signup/adapters.ts", "utf8"),
    readFile("src/lib/platform-signup/auth-boundary.ts", "utf8"),
    readFile("src/app/auth/platform/callback/route.ts", "utf8"),
  ]);

  assert.match(evidence, /\| P10 \| VERIFIED \|/);
  assert.match(evidence, /Resend tracking subdomain: NOT CONFIGURED/);
  assert.match(evidence, /Supabase confirmation template: \{\{ \.ConfirmationURL \}\}/);
  assert.match(evidence, /production callback integrity: EXACT \/ SINGLE ALLOWLIST ENTRY/);
  assert.match(p10, /Resend click tracking: INACTIVE/);
  assert.match(p10, /Resend open tracking: INACTIVE/);
  assert.match(p10, /Supabase redirect allowlist count: 1/);
  assert.match(
    p10,
    /Supabase redirect URL: https:\/\/adora-commerce\.com\/auth\/platform\/callback/,
  );
  assert.match(boundary, /PLATFORM_SIGNUP_CALLBACK_PATH = "\/auth\/platform\/callback"/);
  assert.match(adapters, /input\.callbackUrl !== approvedCallbackUrl/);
  assert.match(adapters, /emailRedirectTo: approvedCallbackUrl/);
  assert.match(callback, /new URL\("\/onboarding\?status=account_ready", request\.url\)/);
  assert.match(p10, /custom SMTP: NOT CONFIGURED/);
  assert.match(p10, /production email send: NOT AUTHORIZED/);
  assert.match(p10, /public signup: NOT AUTHORIZED/);
});

test("P11 freezes zero-cost quotas below every provider ceiling", async () => {
  const [evidence, p11, envExample] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p11EvidencePath, "utf8"),
    readFile(".env.example", "utf8"),
  ]);

  assert.match(evidence, /\| P11 \| VERIFIED \|/);
  assert.match(evidence, /Resend transactional quota: FREE \/ 0 OF 3,000 MONTHLY \/ 0 OF 100 DAILY/);
  assert.match(evidence, /Resend payment method\/overage: NONE \/ DISABLED/);
  assert.match(evidence, /Supabase plan\/spend cap\/payment method: FREE \/ ENABLED \/ NONE/);
  assert.match(evidence, /Supabase Auth email rate limit: 2 PER HOUR/);
  assert.match(evidence, /ACOS activation ceiling: 1 ATTEMPTED SIGNUP EMAIL PER HOUR/);
  assert.match(p11, /current effective production send: 0 emails \/ hour/);
  assert.match(p11, /activation global window: 3,600 seconds/);
  assert.match(p11, /activation global attempted-signup limit: 1/);
  assert.match(p11, /derived maximum: 1 \/ hour, 24 \/ day, 744 \/ 31-day month/);
  assert.match(p11, /quota exhaustion: FAIL CLOSED/);
  assert.match(p11, /payment methods: NONE/);
  assert.match(p11, /pay-as-you-go: DISABLED/);
  assert.match(envExample, /^ACOS_SIGNUP_RATE_LIMIT_GLOBAL_WINDOW_SECONDS=$/m);
  assert.match(envExample, /^ACOS_SIGNUP_RATE_LIMIT_GLOBAL_ATTEMPT_LIMIT=$/m);
});

test("P12 verifies Production-only secret destinations without recording values", async () => {
  const [evidence, p12] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p12EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P12 \| VERIFIED \|/);
  assert.match(evidence, /Preview\/Development P12 variables: NONE/);
  assert.match(p12, /environment scope: PRODUCTION ONLY/);
  assert.match(p12, /preview environment: NO P12 VALUES/);
  assert.match(p12, /development environment: NO P12 VALUES/);
  assert.match(p12, /ACOS_SIGNUP_ABUSE_HASH_SECRET/);
  assert.match(p12, /ACOS_PLATFORM_CALLBACK_STATE_SECRET/);
  assert.match(p12, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(p12, /platform signup enabled: FALSE/);
  assert.match(p12, /platform signup kill switch: TRUE/);
  assert.match(p12, /global limiter window: 3,600 seconds/);
  assert.match(p12, /global attempted-signup limit: 1/);
  assert.match(p12, /Resend SMTP credential \| Provider secret \| Not created/);
  assert.doesNotMatch(p12, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(p12, /=[A-Za-z0-9_-]{32,}/);
});

test("P13 freezes rotation, emergency revocation and rollback ownership", async () => {
  const [evidence, p13] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p13EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P13 \| VERIFIED \|/);
  assert.match(evidence, /P13 rotation\/revocation owner: ACOS OWNER/);
  assert.match(evidence, /P13 fallback disposition: FAIL CLOSED/);
  assert.match(p13, /primary operational owner: ACOS Owner/);
  assert.match(
    p13,
    /primary contact route: owner-controlled primary email of the affected provider account/,
  );
  assert.match(p13, /fallback operator: NONE APPROVED/);
  assert.match(p13, /Next due \|[\s\S]*2026-10-29/);
  assert.match(p13, /Allow up to 15 minutes/);
  assert.match(p13, /Increment `ACOS_SIGNUP_ABUSE_HASH_KEY_VERSION`/);
  assert.match(p13, /at least the longest active limiter window/);
  assert.match(p13, /Never restore a credential suspected or confirmed to be exposed/);
  assert.match(p13, /P13 itself does not authorize that deployment/);
  assert.doesNotMatch(p13, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(p13, /=[A-Za-z0-9_-]{32,}/);
});

test("P14 freezes privacy-safe monitoring destinations and stop thresholds", async () => {
  const [evidence, p14] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p14EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P14 \| VERIFIED \|/);
  assert.match(evidence, /P14 monitoring owner: ACOS OWNER/);
  assert.match(evidence, /P14 consolidated alert sink: NOT CONFIGURED/);
  assert.match(p14, /monitoring owner: ACOS Owner/);
  assert.match(p14, /Supabase Auth logs/);
  assert.match(p14, /Cloudflare Turnstile analytics/);
  assert.match(p14, /Vercel Production runtime logs/);
  assert.match(p14, /Resend transactional logs/);
  assert.match(p14, /one `auth_unavailable`/);
  assert.match(p14, /five CAPTCHA or limiter denials within ten minutes/);
  assert.match(p14, /twenty CAPTCHA or limiter denials within ten minutes/);
  assert.match(p14, /consolidated automated alert sink: NOT CONFIGURED/);
  assert.match(p14, /P15\s+must prove the named dashboards/);
  assert.match(p14, /No permanent per-attempt application audit/);
  assert.doesNotMatch(p14, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(p14, /=[A-Za-z0-9_-]{32,}/);
});

test("P15 freezes a single-cohort rollout and real fail-closed rollback plan", async () => {
  const [evidence, p15] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p15EvidencePath, "utf8"),
  ]);

  assert.match(evidence, /\| P15 \| VERIFIED \|/);
  assert.match(evidence, /P15 smoke-test cohort: 1 OWNER-CONTROLLED TEST MAILBOX/);
  assert.match(evidence, /P15 execution\/public rollout: BLOCKED \/ NOT AUTHORIZED/);
  assert.match(p15, /smoke-test cohort size: 1/);
  assert.match(p15, /cohort address in repository evidence: FORBIDDEN/);
  assert.match(p15, /maximum attempted signup emails: 1 per 3,600 seconds/);
  assert.match(
    p15,
    /P16 commerce-core restore passed, but compatible managed Auth\/Storage/,
  );
  assert.match(p15, /Stage 1: Kill-Switch Exercise/);
  assert.match(p15, /Stage 2: Single-Cohort Attempt/);
  assert.match(p15, /known fail-closed Vercel deployment/);
  assert.match(p15, /editing environment variables without a deployment is not/);
  assert.match(p15, /A new attempt requires a new/);
  assert.match(p15, /No deployment,\nSMTP configuration, email, test identity or public signup was created/);
  assert.doesNotMatch(p15, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(p15, /=[A-Za-z0-9_-]{32,}/);
  assert.doesNotMatch(p15, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
});

test("P16 records the validated core drill and Web-app-first deferral without claiming full recovery", async () => {
  const [evidence, p16, drill, deferral] = await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(p16EvidencePath, "utf8"),
    readFile(p16DrillReportPath, "utf8"),
    readFile(p16DeferralPath, "utf8"),
  ]);

  assert.match(evidence, /\| P16 \| PARTIAL \|/);
  assert.match(evidence, /P16 provider backup posture: FREE PLAN \/ NO PROJECT BACKUPS/);
  assert.match(evidence, /P16 commerce-core restore drill: VERIFIED/);
  assert.match(evidence, /P16 full managed-service restore: NOT PROVEN/);
  assert.match(p16, /Status:\*\* DEFERRED \/ PRODUCTION BLOCKER \/ CORE DRILL VALIDATED/);
  assert.match(p16, /scheduled project backups: NOT INCLUDED/);
  assert.match(p16, /point-in-time recovery: NOT ENABLED \/ PAID ADD-ON/);
  assert.match(p16, /restorable provider backup: NONE VERIFIED/);
  assert.match(p16, /temporary encryption\/checksum: PASS/);
  assert.match(p16, /public tables\/rows: 155 \/ 73 \/ MATCH/);
  assert.match(p16, /temporary artifact deletion: PASS/);
  assert.match(p16, /managed schemas such as `auth` and\n`storage` can be excluded/);
  assert.match(p16, /never restore over `ACOS Production`/);
  assert.match(p16, /current effective recovery-point objective remains undefined/);
  assert.match(p16, /P15 smoke-test execution: BLOCKED/);
  assert.match(drill, /Production Writes:\*\* None/);
  assert.match(drill, /restore target: LOCAL DOCKER \/ NETWORK NONE/);
  assert.match(drill, /public base tables: 155/);
  assert.match(drill, /public total rows: 73/);
  assert.match(drill, /auth users: 0/);
  assert.match(drill, /storage objects: 0/);
  assert.match(drill, /Public RLS policies \| PASS \| 545 policies/);
  assert.match(
    drill,
    /Public RLS enablement \| PASS \| RLS is enabled on all 155 public tables/,
  );
  assert.match(drill, /Full managed Auth restore \| BLOCKED/);
  assert.match(drill, /Temporary artifact deletion \| PASS/);
  assert.match(drill, /No retry may silently omit managed service data/);
  assert.match(
    deferral,
    /Status:\*\* OWNER APPROVED \/ P16 PRODUCTION BLOCKER DEFERRED \/ WEB APP FIRST/,
  );
  assert.match(deferral, /NEXT PHASE: PHASE 1C STOREFRONT MVP/);
  assert.match(deferral, /MUTATION POSTURE: READ ONLY/);
  assert.match(deferral, /public platform signup: DISABLED/);
  assert.match(deferral, /real checkout\/payment: NOT AUTHORIZED/);
  assert.match(deferral, /No duplicate customer, product, order or payment source/);
  assert.doesNotMatch(p16, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(p16, /=[A-Za-z0-9_-]{32,}/);
  assert.doesNotMatch(p16, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(drill, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(drill, /=[A-Za-z0-9_-]{32,}/);
  assert.doesNotMatch(drill, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(deferral, /0x4A[A-Za-z0-9_-]+/);
  assert.doesNotMatch(deferral, /=[A-Za-z0-9_-]{32,}/);
  assert.doesNotMatch(deferral, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
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
