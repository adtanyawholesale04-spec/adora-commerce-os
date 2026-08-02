import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART7_FORWARD_MIGRATION_CONTRACT_REVIEW.md",
  "utf8"
);
const part6 = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART6_ER_SCHEMA_GUARDED_BOUNDARY_CONTRACT.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 7 prepares thirty migration decisions without creating SQL authority", () => {
  assert.match(contract, /CONTRACT PREPARED \/ OWNER FREEZE REQUIRED \/ SQL NOT AUTHORIZED/);
  assert.equal(contract.match(/^\| FM\d{2} \|.*\| Owner freeze required \|$/gm)?.length, 30);
  assert.match(contract, /Migration files:\*\* Not created/);
  assert.match(contract, /Local apply:\*\* Not authorized/);
  assert.match(contract, /Production apply:\*\* Not authorized/);
  assert.match(part6, /approved FS01-FS30 in full/);
});

test("Part 7 uses three CLI-generated layers and preserves canonical sources", () => {
  assert.match(contract, /phase_1e_receipt_foundation/);
  assert.match(contract, /phase_1e_receipt_guarded_actions/);
  assert.match(contract, /phase_1e_receipt_read_boundaries/);
  assert.match(contract, /supabase migration new/);
  assert.match(contract, /CLI-generated timestamp is authoritative/);
  assert.match(contract, /No receipt, tax-invoice, bill, ledger, customer, order, payment, refund/);
});

test("Part 7 freezes fail-closed security, preflight, rollback, and validation recommendations", () => {
  assert.match(contract, /revoke all direct table access from `PUBLIC`, `anon`, `authenticated`, and `service_role`/);
  assert.match(contract, /security definer set search_path = ''/);
  assert.match(contract, /privacy-bounded, count-only, fail-fast/);
  assert.match(contract, /commerce idempotency key\s+payment\s+order/s);
  assert.match(contract, /rollback is a new\s+forward migration/s);
  assert.match(contract, /BLOCKED.*Owner freezes FM01-FM30/s);
  assert.match(status, /FINANCE & TAX PART 7 FORWARD-ONLY MIGRATION CONTRACT PREPARED/);
  assert.match(status, /FM01-FM30.*Owner freeze/s);
});
