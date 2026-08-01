import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_PART3C_PROMOTION_EVALUATION_SUBCONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const migrations = readdirSync("supabase/migrations");
const migration = readFileSync(
  "supabase/migrations/20260731182133_phase_1d_promotion_evaluator.sql",
  "utf8",
);
const validation = readFileSync(
  "supabase/validation/049_phase_1d_promotion_evaluator_test.sql",
  "utf8",
);

test("promotion subcontract freezes PE01-PE24 with approved runtime evidence", () => {
  assert.match(contract, /OWNER APPROVED \/ PE01-PE24 FROZEN \/ SQL IMPLEMENTED \/ LOCAL VALIDATED/);
  assert.match(contract, /Approved in full on 2026-08-01/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(
      contract,
      new RegExp(`\\| PE${String(id).padStart(2, "0")} \\|`),
    );
  }
  assert.equal(
    migrations.some((name) => /phase_1d.*promotion.*evaluator/i.test(name)),
    true,
  );
});

test("promotion evaluator is internal, invoker-only and read-only", () => {
  assert.match(migration, /internal_evaluate_storefront_variant_promotion/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /from public, anon, authenticated, service_role/,
  );
  assert.doesNotMatch(migration, /\b(insert into|update|delete from) public\.cart/i);
  assert.match(validation, /PROMOTION_PRICE_FLOOR_VIOLATION/);
  assert.match(validation, /Cross-tenant target unexpectedly succeeded/);
});

test("promotion subcontract keeps an exact narrow executable catalog", () => {
  assert.match(contract, /automatic item promotions only/);
  assert.match(contract, /rule_type = MIN_QUANTITY/);
  assert.match(contract, /PERCENT_DISCOUNT/);
  assert.match(contract, /FIXED_DISCOUNT/);
  assert.match(contract, /FIXED_UNIT_PRICE/);
  assert.match(contract, /scope_type = VARIANT/);
  assert.match(contract, /Any tier, bundle, bundle component, reward rule/);
});

test("promotion arithmetic is deterministic and financially bounded", () => {
  assert.match(contract, /campaign priority descending/);
  assert.match(contract, /UUID ascending/);
  assert.match(contract, /first ordered eligible candidate in one normalized group/);
  assert.match(contract, /round_half_up/);
  assert.match(contract, /minimum_selling_price/);
  assert.match(contract, /total discount cannot exceed the eligible line base/);
});

test("promotion subcontract keeps coupon, order evidence and private data out", () => {
  assert.match(contract, /Part 3C neither accepts nor stores a coupon/);
  assert.match(contract, /Only Part 3D writes `promotion_applied_benefits`/);
  assert.match(contract, /exclude names, codes, raw JSON, cost, margin and customer data/);
  assert.match(contract, /no Production apply or public checkout activation/);
});

test("implementation status advances to guarded cart RPC implementation", () => {
  assert.match(
    status,
    /PHASE 1D PART 3C PROMOTION EVALUATION SUBCONTRACT REVIEW PREPARED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D OWNER APPROVED \/ MU01-MU24 FROZEN \/ NO READ MIGRATION OR UI IMPLEMENTED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D-A GUARDED CUSTOMER ORDER PAYMENT SNAPSHOT CONTRACT REVIEW/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3D-A guarded customer order payment snapshot and Part 3D-B\/3D-C UI delivery[\s\S]*P16 remains mandatory for Production/,
  );
});
