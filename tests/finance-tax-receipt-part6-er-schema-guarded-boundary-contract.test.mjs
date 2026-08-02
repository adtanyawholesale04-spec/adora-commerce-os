import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART6_ER_SCHEMA_GUARDED_BOUNDARY_CONTRACT.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 6 proposes one additive Receipt snapshot boundary without duplicating canonical masters", () => {
  assert.match(contract, /OWNER APPROVED \/ FROZEN/);
  assert.match(contract, /Owner Approval Date:\*\* 2026-08-03/);
  assert.match(contract, /finance_documents/);
  assert.match(contract, /finance_document_lines/);
  assert.match(contract, /do\s+not become another order, payment, refund, ledger, customer, or tax engine/);
  assert.match(contract, /FS01/);
  assert.match(contract, /FS30/);
  assert.equal(
    contract.match(/^\| FS\d{2} \|.*\| Owner approved \/ frozen \|$/gm)?.length,
    30
  );
  assert.match(contract, /Migration:\*\* Not authorized/);
});

test("Part 6 keeps mutations guarded, idempotent, tenant-scoped, and directly inaccessible", () => {
  assert.match(contract, /commerce_idempotency_keys/);
  assert.match(contract, /api_create_receipt_document/);
  assert.match(contract, /api_void_receipt_document/);
  assert.match(contract, /api_reverse_receipt_document/);
  assert.match(contract, /revoke all table privileges from `PUBLIC`, `anon`, and `authenticated`/);
  assert.match(contract, /security definer set search_path = ''/);
  assert.match(contract, /active `customer_profile_links` owner/);
  assert.match(contract, /append-only `audit_logs`/);
});

test("Part 6 freezes FS01-FS30 while preserving migration and runtime gates", () => {
  assert.match(contract, /approved FS01-FS30 in full/);
  assert.match(contract, /Part 7 Migration Contract\s+Review/);
  assert.match(contract, /does not authorize migration generation/);
  assert.match(status, /FINANCE & TAX PART 6 OWNER DECISION FREEZE COMPLETE/);
  assert.match(status, /FS01-FS30 are Owner approved\/frozen/);
  assert.match(status, /Part 7 migration contract review may proceed/);
});
