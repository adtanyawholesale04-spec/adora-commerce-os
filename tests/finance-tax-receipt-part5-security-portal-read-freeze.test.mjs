import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const freeze = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_PART5_SECURITY_PORTAL_READ_FREEZE.md",
  "utf8"
);
const portalRead = fs.readFileSync("docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_READ_BOUNDARY.md", "utf8");
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 5 freezes least-privilege finance permissions", () => {
  assert.match(freeze, /OWNER APPROVED \/ FROZEN/);
  assert.match(freeze, /finance\.document\.view/);
  assert.match(freeze, /finance\.document\.create/);
  assert.match(freeze, /finance\.document\.void/);
  assert.match(freeze, /finance\.document\.reverse/);
  assert.match(freeze, /payment\.view.*payment\.verify.*do not/si);
  assert.match(freeze, /permission rows and role grants are \*\*not\*\* created/);
});

test("Part 5 reuses Portal ownership/RLS and audit boundaries", () => {
  assert.match(freeze, /ACTIVE customer_profile_links/);
  assert.match(freeze, /browser-supplied `customer_id`/);
  assert.match(freeze, /Direct `anon` and `authenticated` table writes are denied/);
  assert.match(freeze, /append-only `audit_logs`/);
  assert.match(freeze, /RECEIPT_CREATED/);
  assert.match(freeze, /RECEIPT_REVERSED/);
  assert.match(freeze, /does \*\*not\*\* authorize permission seeding/);
  assert.match(freeze, /Part 6 ER\/Schema and Guarded Database Boundary Contract/);
  assert.match(portalRead, /customer_profile_links/);
  assert.match(status, /Track A Finance & Tax Receipt Document Part 5 Security, Audit and Portal Read Freeze/);
});
