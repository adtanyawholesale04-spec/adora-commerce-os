import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4B_STAFF_REVIEW_SERVICE_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4B records all recommended RV decisions without freezing them", () => {
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| RV${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /CONTRACT REVIEW COMPLETE \/ OWNER DECISION REQUIRED/);
  assert.match(contract, /recommendations only[\s\S]*explicit Owner approval of RV01-RV24/);
});

test("read boundaries separate queue visibility from private reference detail", () => {
  assert.match(contract, /Queue authorization[\s\S]*`payment\.view`/);
  assert.match(contract, /Require both `payment\.view` and `payment\.verify`/);
  assert.match(contract, /queue response is intentionally reference-free/);
  assert.match(contract, /only review boundary allowed to return the normalized[\s\S]*reference/);
  assert.match(contract, /`Cache-Control: no-store`/);
});

test("actions preserve guarded settlement, grants, and post-commit isolation", () => {
  assert.match(contract, /api_verify_storefront_payment\(uuid,uuid,text,text,uuid\)/);
  assert.match(contract, /matching `api_reject_storefront_payment`/);
  assert.match(contract, /revoke direct authenticated insert\/update\/delete/);
  assert.match(contract, /dedicated non-executable review idempotency helpers/);
  assert.match(contract, /one non-executable SC01-SC30 internal settlement helper/);
  assert.match(contract, /neither failure compensates financial truth/);
});

test("Part 4B advances only to Owner freeze", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B STAFF REVIEW SERVICE CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE FOR RV01-RV24 REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: RV01-RV24 Owner freeze, Staff Review migration, guarded actions,[\s\S]*P16 remains mandatory for Production/,
  );
});
