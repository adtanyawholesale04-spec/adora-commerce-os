import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_PART3D_COUPON_EVALUATION_SUBCONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const migrations = readdirSync("supabase/migrations");
const preflight = readFileSync(
  "supabase/validation/051_phase_1d_coupon_non_destructive_preflight.sql",
  "utf8",
);
const preflightReport = readFileSync(
  "docs/migrations/PHASE_1D_COUPON_NON_DESTRUCTIVE_PREFLIGHT_2026-08-01.md",
  "utf8",
);

test("coupon subcontract freezes CP01-CP30 and records the validated Layer 3 SQL", () => {
  assert.match(
    contract,
    /OWNER FROZEN \/ CP01-CP30 APPROVED \/ IMPLEMENTED \/ LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/,
  );
  assert.match(contract, /Project Owner approved the recommended values for CP01-CP30/);
  for (let id = 1; id <= 30; id += 1) {
    assert.match(contract, new RegExp(`\\| CP${String(id).padStart(2, "0")} \\|`));
  }
  assert.equal(
    migrations.some((name) => /phase_1d_atomic_checkout_layer3/i.test(name)),
    true,
  );
});

test("coupon subcontract reuses canonical sources and separates automatic execution", () => {
  for (const source of [
    "coupons",
    "coupon_redemptions",
    "promotion_campaign_versions",
    "promotion_applied_benefits",
    "orders",
    "commerce_idempotency_keys",
  ]) {
    assert.match(contract, new RegExp(`\\b${source}\\b`));
  }
  assert.match(contract, /Any campaign version referenced by any coupon is coupon-triggered/);
  assert.match(contract, /one version cannot execute through both paths/);
  assert.match(contract, /scope = ORDER/);
});

test("coupon arithmetic and usage are deterministic and race-safe", () => {
  assert.match(contract, /sum of recomputed cart-item `line_total` values/);
  assert.match(contract, /round_half_up\(E \* percent \/ 100, 2\)/);
  assert.match(contract, /benefit <= F/);
  assert.match(contract, /Count `RESERVED` and `CONSUMED`/);
  assert.match(contract, /Campaign and coupon rows are locked before the count-and-insert decision/);
});

test("coupon lifecycle evidence remains private and append-preserving", () => {
  assert.match(contract, /`RESERVED -> CONSUMED`/);
  assert.match(contract, /`RESERVED -> RELEASED`/);
  assert.match(contract, /`CONSUMED -> REVERSED`/);
  assert.match(contract, /never include coupon code or customer\/contact data/);
  assert.match(contract, /does not grant or modify marketing consent/);
  assert.match(contract, /Production Apply:\*\* Not authorized/);
});

test("coupon preflight is read-only and records zero blocking findings", () => {
  assert.match(preflight, /begin transaction read only;/i);
  assert.match(preflight, /rollback;/i);
  assert.doesNotMatch(
    preflight,
    /\b(insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/i,
  );
  for (const check of [
    "normalized_code_duplicates",
    "unsafe_active_codes",
    "automatic_coupon_version_overlap",
    "active_redemption_cart_duplicates",
    "active_redemption_order_duplicates",
    "invalid_active_coupon_campaign_links",
    "invalid_usage_limits",
    "redemption_tenant_or_lifecycle_violations",
  ]) {
    assert.match(preflightReport, new RegExp(`${check}\\|0`));
  }
  assert.match(preflightReport, /coupon_preflight\|pass/);
  assert.match(preflightReport, /Production Query:\*\* Not performed/);
});

test("implementation status records the validated coupon boundary and Part 3E gate", () => {
  assert.match(
    status,
    /PHASE 1D PART 3D COUPON EVALUATION SUBCONTRACT REVIEW PREPARED/,
  );
  assert.match(
    status,
    /PHASE 1D PART 3D COUPON OWNER DECISION FREEZE COMPLETE: Owner approved CP01-CP30 in full on 2026-08-01/,
  );
  assert.match(
    status,
    /PHASE 1D PART 3D COUPON NON-DESTRUCTIVE PREFLIGHT VALIDATED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D-A3 GUARDED PAYMENT SNAPSHOT IMPLEMENTED \/ LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D-B SERVER READ SERVICE AND STOREFRONT ROUTE\/FORM IMPLEMENTATION/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3D-B\/3D-C UI delivery[\s\S]*P16 remains mandatory for Production/,
  );
});
