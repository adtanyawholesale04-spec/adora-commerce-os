import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART3_IMMUTABLE_SNAPSHOT_FREEZE.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 3 freezes the Receipt immutable snapshot groups", () => {
  assert.match(freeze, /OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /canonical `order_id` and `order_number`/);
  assert.match(freeze, /customer_id/);
  assert.match(freeze, /billing address snapshot/);
  assert.match(freeze, /quantity, applied unit price, line discount, and line total/);
  assert.match(freeze, /canonical `payment_id`/);
  assert.match(freeze, /Tax\/VAT fields are intentionally excluded/);
});

test("Part 3 freezes write-once privacy and source-of-truth rules", () => {
  assert.match(freeze, /Snapshot fields are write-once/);
  assert.match(freeze, /cannot edit or delete an issued snapshot/);
  assert.match(freeze, /original snapshot remains unchanged/);
  assert.match(freeze, /External provider references, proof storage paths, bank data/);
  assert.match(freeze, /does \*\*not\*\* authorize a migration/);
  assert.match(freeze, /Part 4 Reversal\/Cancellation/);
  assert.match(status, /Track A Finance & Tax Receipt Document Part 3 Immutable Snapshot Freeze/);
});
