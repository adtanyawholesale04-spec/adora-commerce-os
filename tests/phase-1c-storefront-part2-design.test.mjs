import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rules = readFileSync(
  "docs/business-rules/BUSINESS_RULES_PHASE_1C_STOREFRONT_MVP.md",
  "utf8",
);
const er = readFileSync(
  "docs/er/ER_ADDENDUM_PHASE_1C_STOREFRONT_MVP.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const freeze = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1C_STOREFRONT_PART2_OWNER_FREEZE.md",
  "utf8",
);

test("Part 2 freezes the complete Storefront rule catalog", () => {
  assert.match(rules, /\*\*Status:\*\* OWNER APPROVED \/ FROZEN FOR PART 3/);
  assert.match(rules, /\*\*Migration:\*\* Not authorized/);
  for (let id = 1; id <= 36; id += 1) {
    assert.match(
      rules,
      new RegExp(`SF-BR-${String(id).padStart(3, "0")}`),
    );
  }
  assert.match(rules, /product-only, read-only Storefront MVP/i);
  assert.match(rules, /No customer, product, order, payment, service or booking master may be/);
});

test("Part 2 keeps publication, entitlement and listings fail-closed", () => {
  assert.match(rules, /Storefront defaults to `PRIVATE`/);
  assert.match(rules, /No row and `HIDDEN` both mean not public/);
  assert.match(rules, /features\.code` value:[\s\S]*storefront/);
  assert.match(rules, /Absence, inactivity, expiry or disabled entitlement[\s\S]*fails closed/);
  assert.match(rules, /Any failure returns the same public not-found result/);
});

test("Part 2 defines only three additive Storefront entities", () => {
  assert.match(er, /### organization_storefronts/);
  assert.match(er, /### storefront_product_listings/);
  assert.match(er, /### storefront_slug_history/);
  assert.match(er, /`organizations\.slug` remains the current canonical store slug/);
  assert.match(er, /does not create[\s\S]*new customer, product, order, payment, service or booking masters/);
  assert.match(er, /No frozen column is changed by this addendum/);
});

test("Part 2 public output excludes protected commerce fields", () => {
  assert.match(rules, /at most 24 products/);
  assert.match(rules, /at most 50 variants/);
  assert.match(rules, /Cost, margin and minimum selling price are forbidden/);
  assert.match(rules, /No exact quantity, warehouse, reservation, allocation or movement data/);
  assert.match(er, /Forbidden outputs include exact inventory/);
  assert.match(er, /product code, stock code, barcode, cost, margin/);
});

test("Part 2 keeps the database closed to anonymous and browser roles", () => {
  assert.match(rules, /Web server calls a reviewed,[\s\S]*service-role-only Storefront RPC/);
  assert.match(rules, /Browser code must never receive a service key/);
  assert.match(rules, /RPC runs as `SECURITY INVOKER`/);
  assert.match(er, /revoke table access from `PUBLIC`, `anon` and `authenticated`/);
  assert.match(er, /grant public-read RPC execution only to `service_role`/);
});

test("Part 2 proposes exact permissions, feature and audit evidence", () => {
  assert.match(rules, /storefront\.view/);
  assert.match(rules, /storefront\.manage/);
  assert.match(rules, /storefront\.publish/);
  assert.match(rules, /STOREFRONT_SETTINGS_UPDATED/);
  assert.match(rules, /STOREFRONT_PRODUCT_LISTING_UPDATED/);
  assert.match(rules, /ORGANIZATION_SLUG_UPDATED/);
  assert.match(er, /No separate Storefront event or ledger table is proposed/);
});

test("Part 2 preserves P16 after the validated Part 3 handoff", () => {
  assert.match(rules, /Part 2 does not close or weaken P16/);
  assert.match(
    status,
    /PHASE 1C PART 2 OWNER FREEZE COMPLETE/,
  );
  assert.match(
    status,
    /PHASE 1C PART 3 DATABASE BOUNDARY IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4F SERVER ACTION SERVICE AND POST-COMMIT HANDOFF IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
});

test("Part 2 Owner freeze preserves exact contracts and closed runtime gates", () => {
  assert.match(
    freeze,
    /\*\*Status:\*\* OWNER APPROVED \/ BUSINESS RULES AND ER FROZEN/,
  );
  assert.match(freeze, /SF-BR-001 through SF-BR-036/);
  assert.match(freeze, /organization_storefronts/);
  assert.match(freeze, /storefront_product_listings/);
  assert.match(freeze, /storefront_slug_history/);
  assert.match(freeze, /migration generation\/application: REQUIRES EXPLICIT PART 3 INSTRUCTION/);
  assert.match(freeze, /public Storefront runtime: NOT AUTHORIZED/);
  assert.match(freeze, /production activation: BLOCKED BY P16/);
});
