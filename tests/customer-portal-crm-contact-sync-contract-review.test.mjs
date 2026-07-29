import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const review = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_CRM_CONTACT_SYNC_CONTRACT_REVIEW.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("CRM contact sync review protects the canonical customer boundary", () => {
  assert.match(review, /OWNER APPROVED \/ FROZEN/);
  assert.match(review, /Existing non-empty CRM value.*Do not overwrite automatically/);
  assert.match(review, /Duplicate value on another customer.*Block automatic sync/);
  assert.match(review, /Do not copy, grant, revoke, or retarget consent automatically/);
  assert.match(review, /service-role-only RPC/i);
  assert.match(review, /never store the raw contact value/i);
});

test("implementation status records the Owner freeze and keeps Part 2 explicit", () => {
  assert.match(status, /Customer Portal Part 5 CRM Contact Synchronization Contract Review/);
  assert.match(status, /OWNER APPROVED \/ FROZEN/);
  assert.match(
    status,
    /PART 3 CRM CONTACT SYNC SERVER INTEGRATION IMPLEMENTED \/ VALIDATED/,
  );
  assert.match(
    status,
    /PART 4 CUSTOMER PORTAL CONTACT WORKFLOW VALIDATED/,
  );
  assert.match(status, /PHASE 1B PART 0 REPOSITORY & DEPENDENCY AUDIT VALIDATED/);
  assert.match(
    status,
    /NEXT: Owner review and approval of Phase 1B Part 8B Durable Rate-Limit Migration Plan/,
  );
});
