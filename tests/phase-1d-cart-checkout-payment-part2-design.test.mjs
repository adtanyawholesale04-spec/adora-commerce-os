import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rules = readFileSync(
  "docs/business-rules/BUSINESS_RULES_PHASE_1D_CART_CHECKOUT_PAYMENT_MVP.md",
  "utf8",
);
const er = readFileSync(
  "docs/er/ER_ADDENDUM_PHASE_1D_CART_CHECKOUT_PAYMENT_MVP.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 2 records Owner approval for the complete rule set", () => {
  assert.match(rules, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN FOR PART 3/);
  assert.match(rules, /\*\*Owner Approval Date:\*\* 2026-08-01/);
  for (let id = 1; id <= 44; id += 1) {
    assert.match(
      rules,
      new RegExp(`### CO-BR-${String(id).padStart(3, "0")} -`),
    );
  }
  assert.match(rules, /Owner-approved D01-D24 on 2026-07-31/);
});

test("Part 2 preserves tenant, customer and canonical-source boundaries", () => {
  assert.match(rules, /Every Storefront cart belongs to exactly one `organization_id`/);
  assert.match(rules, /active `customer_profile_links` ownership/);
  assert.match(rules, /never create an organization membership, customer, customer/);
  assert.match(er, /No checkout-session table is proposed/);
  assert.match(er, /No provider-intent table is proposed/);
  assert.doesNotMatch(er, /create table/i);
});

test("Part 2 freezes deterministic commercial and inventory behavior for review", () => {
  assert.match(rules, /rounds to two decimal\s+places using half-up rounding/);
  assert.match(rules, /At most one normalized coupon code/);
  assert.match(rules, /one non-negative flat shipping charge in THB/);
  assert.match(rules, /One database transaction must lock and revalidate/);
  assert.match(rules, /never\s+silently reduces quantity or permits backorder/);
  assert.match(er, /one active STOREFRONT cart/);
});

test("Part 2 proposes only the minimum additive persistence", () => {
  assert.match(er, /### organization_checkout_settings/);
  assert.match(er, /### commerce_idempotency_keys/);
  assert.match(er, /features\.code = storefront\.checkout/);
  assert.match(er, /unique \(organization_id, operation, request_id\)/);
  assert.match(er, /request_hash.*cannot be changed/);
  assert.match(er, /no full request\/response body, address, contact, proof/);
});

test("Part 2 protects payment history, consent and recovery", () => {
  assert.match(rules, /Only an active same-tenant actor with `payment\.verify`/);
  assert.match(rules, /Corrections use reversal\/refund records/);
  assert.match(rules, /never grants marketing consent/);
  assert.match(rules, /Any failure before final transaction commit rolls back/);
  assert.match(rules, /idempotent compensation operation/);
  assert.match(er, /no cascade may erase confirmed financial evidence/i);
});

test("Part 2 keeps implementation and production gates closed", () => {
  assert.match(rules, /\*\*Migration:\*\* Not authorized/);
  assert.match(rules, /Production remains blocked by P16/);
  assert.match(er, /Exact DDL remains unauthorized/);
  assert.match(er, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN FOR PART 3/);
  assert.match(er, /\*\*Owner Approval Date:\*\* 2026-08-01/);
  assert.match(er, /requires a separate explicit instruction/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D PART 3A OWNER APPROVED \/ M01-M20 FROZEN FOR PART 3B/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D PART 3B FOUNDATION MIGRATION GENERATION AND LOCAL VALIDATION/,
  );
  assert.match(
    status,
    /BLOCKED: Production migration apply, Part 3C-3E protected runtime, real payment\/provider work and production activation remain unauthorized until later gates/,
  );
});
