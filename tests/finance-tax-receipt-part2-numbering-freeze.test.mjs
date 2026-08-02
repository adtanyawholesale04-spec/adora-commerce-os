import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART2_NUMBERING_FREEZE.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 2 freezes the Receipt document number format", () => {
  assert.match(freeze, /OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /RC-\{YYYY\}-\{NNNNNN\}/);
  assert.match(freeze, /RC-2026-000001/);
  assert.match(freeze, /\(organization_id, document_type, year\)/);
  assert.match(freeze, /does not include branch/);
});

test("Part 2 freezes atomic non-reuse and keeps allocation closed", () => {
  assert.match(freeze, /allocate the next number atomically/);
  assert.match(freeze, /never reused after a document is created/);
  assert.match(freeze, /retry of the same idempotent document/);
  assert.match(freeze, /does \*\*not\*\* authorize a migration/);
  assert.match(freeze, /Part 3 Immutable Document Snapshot/);
  assert.match(status, /Track A Finance & Tax Receipt Document Part 2 Document Number Freeze/);
});
