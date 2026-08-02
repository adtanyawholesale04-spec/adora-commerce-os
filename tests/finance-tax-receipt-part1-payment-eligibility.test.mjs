import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART1_PAYMENT_ELIGIBILITY_FREEZE.md",
  "utf8"
);
const businessRules = fs.readFileSync(
  "docs/business-rules/BUSINESS_RULES_PHASE_1D_CART_CHECKOUT_PAYMENT_MVP.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 1 freezes full successful payment eligibility", () => {
  assert.match(freeze, /OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /orders\.payment_status = PAID/);
  assert.match(freeze, /orders\.order_status = CONFIRMED/);
  assert.match(freeze, /payment_transactions.*SUCCEEDED/);
  assert.match(freeze, /aggregate of successful non-reversed transactions equals/);
  assert.match(businessRules, /CO-BR-029 - Successful payment transition/);
});

test("Part 1 rejects unsafe payment states and keeps runtime closed", () => {
  assert.match(freeze, /PENDING.*FAILED.*CANCELLED.*REVERSED/);
  assert.match(freeze, /PARTIALLY_PAID/);
  assert.match(freeze, /does \*\*not\*\* authorize a receipt table/);
  assert.match(freeze, /Part 2: Document Number/);
  assert.match(status, /Track A Finance & Tax Receipt Document Part 1 Payment Eligibility Freeze/);
});
