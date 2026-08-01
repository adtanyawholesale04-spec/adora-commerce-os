import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const contractPath =
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4C_STAFF_REVIEW_FORWARD_MIGRATION_CONTRACT_REVIEW.md";
const contract = readFileSync(contractPath, "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4C records all RM recommendations without freezing them", () => {
  for (let id = 1; id <= 30; id += 1) {
    assert.match(contract, new RegExp(`\\| RM${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /RM01-RM30 OWNER DECISION REQUIRED \/ SQL NOT AUTHORIZED/);
  assert.match(contract, /recommendations, not frozen decisions/);
});

test("Part 4C separates private reads from atomic guarded-write hardening", () => {
  assert.match(contract, /two separately generated forward-only migrations/);
  assert.match(contract, /Layer A contains only the two Owner-frozen read functions/);
  assert.match(contract, /guarded action functions and direct-write hardening must not be split/);
  assert.match(contract, /creates no migration, function, policy, grant, runtime/);
});

test("future grants and direct Payment write closure are exact", () => {
  assert.match(contract, /api_list_storefront_payment_reviews\(uuid,timestamptz,uuid,integer\)/);
  assert.match(contract, /api_get_storefront_payment_review\(uuid,uuid\)/);
  assert.match(contract, /api_verify_storefront_payment\(uuid,uuid,text,text,uuid\)/);
  assert.match(contract, /api_reject_storefront_payment\(uuid,uuid,text,text,uuid\)/);
  assert.match(contract, /payments_permission_update/);
  assert.match(contract, /payment_transactions_permission_insert/);
  assert.match(contract, /payment_proofs_permission_update/);
  assert.match(
    contract,
    /Direct Payment table mutation \| none \| none \| revoke \| existing trusted server posture only/,
  );
});

test("settlement, idempotency and post-commit events remain isolated", () => {
  assert.match(contract, /dedicated review idempotency helpers/);
  assert.match(contract, /one internal non-executable approval settlement helper/);
  assert.match(contract, /api_record_storefront_payment_failed_event\(uuid,uuid,uuid\)/);
  assert.match(contract, /Reuse the existing service-role `ORDER_PAID` attribution boundary/);
  assert.match(contract, /event failure never compensates financial truth/);
});

test("Part 4C advances only to the Owner freeze gate and creates no SQL", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4C STAFF REVIEW FORWARD-ONLY MIGRATION CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4C OWNER DECISION FREEZE FOR RM01-RM30 REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: RM01-RM30 Owner freeze, Staff Review SQL generation and apply, guarded actions,[\s\S]*P16 remains mandatory for Production/,
  );
  assert.equal(
    existsSync("supabase/migrations/phase_1d_manual_payment_staff_review.sql"),
    false,
  );
});
