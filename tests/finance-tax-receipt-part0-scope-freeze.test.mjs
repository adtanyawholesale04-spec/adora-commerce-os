import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART0_SCOPE_FREEZE.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Finance & Tax Part 0 freezes Receipt-only scope", () => {
  assert.match(freeze, /OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /first Finance & Tax document scope is frozen to a\s+\*\*Receipt\*\* capability\s+only/);
  assert.match(freeze, /Tax Invoice and e-Tax Invoice/);
  assert.match(freeze, /Credit Note and Debit Note/);
  assert.match(freeze, /Supplier Bill, Expense, VAT report/);
  assert.match(freeze, /Part 1: Payment Eligibility/);
});

test("Part 0 keeps protected financial gates closed", () => {
  assert.match(freeze, /does \*\*not\*\* authorize:/);
  assert.match(freeze, /a new migration or table/);
  assert.match(freeze, /payment\/order\/refund updates/);
  assert.match(freeze, /Customer Portal UI or Production activation/);
  assert.match(status, /Track A Finance & Tax Receipt Document Part 0 Scope Freeze/);
});
