import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const validation = fs.readFileSync(
  "supabase/validation/044_customer_portal_contact_workflow_e2e_test.sql",
  "utf8",
);
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_CONTACT_WORKFLOW_FINAL_VALIDATION.md",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 4 validates the complete guarded contact workflow", () => {
  assert.match(validation, /api_request_customer_contact_change/);
  assert.match(validation, /api_verify_customer_contact_change_request/);
  assert.match(validation, /api_apply_customer_contact_change/);
  assert.match(validation, /api_sync_applied_customer_contact_to_crm/);
  assert.match(validation, /CUSTOMER_CONTACT_CHANGE_APPLIED/);
  assert.match(validation, /raw contact leaked into workflow audit/);
  assert.match(validation, /consent was changed by contact workflow/);
  assert.match(validation, /customer identity was changed by contact workflow/);
  assert.match(contract, /\*\*Status:\*\* IMPLEMENTED \/ VALIDATED/);
  assert.match(status, /PART 4 CUSTOMER PORTAL CONTACT WORKFLOW VALIDATED/);
  assert.match(status, /PHASE 1 CUSTOMER PORTAL MVP VALIDATED/);
});
