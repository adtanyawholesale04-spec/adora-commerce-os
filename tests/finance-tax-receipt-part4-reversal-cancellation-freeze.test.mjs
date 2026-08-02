import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART4_REVERSAL_CANCELLATION_FREEZE.md",
  "utf8"
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4 freezes distinct void and reversal meanings", () => {
  assert.match(freeze, /OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /`VOID`/);
  assert.match(freeze, /document itself is invalid/);
  assert.match(freeze, /`REVERSED`/);
  assert.match(freeze, /approved payment\/refund\/reversal boundary/);
  assert.match(freeze, /replacement or correcting document receives the next/);
});

test("Part 4 preserves history and keeps automatic financial writes closed", () => {
  assert.match(freeze, /issued Receipt is never edited or deleted/);
  assert.match(freeze, /Order cancellation does not automatically void/);
  assert.match(freeze, /Refund creation does not silently edit or delete/);
  assert.match(freeze, /ISSUED\s+-> VOID/);
  assert.match(freeze, /ISSUED\s+-> REVERSED/);
  assert.match(freeze, /does \*\*not\*\* authorize a migration/);
  assert.match(freeze, /Part 5 Security, Audit and Portal Read Contract/);
  assert.match(status, /Track A Finance & Tax Receipt Document Part 4 Reversal\/Cancellation Freeze/);
});
