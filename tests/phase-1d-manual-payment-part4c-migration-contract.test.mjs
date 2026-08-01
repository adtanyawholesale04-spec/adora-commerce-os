import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const contractPath =
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4C_STAFF_REVIEW_FORWARD_MIGRATION_CONTRACT_REVIEW.md";
const contract = readFileSync(contractPath, "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4C preserves all Owner-frozen RM decisions", () => {
  for (let id = 1; id <= 30; id += 1) {
    assert.match(contract, new RegExp(`\\| RM${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /OWNER APPROVED \/ RM01-RM30 FROZEN \/ SQL NOT AUTHORIZED/);
  assert.match(contract, /explicitly approved all recommended values RM01-RM30 on[\s\S]*2026-08-01/);
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

test("Part 4C advances only to separately approved Layer A SQL", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-C PRIVATE REVIEW DETAIL UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-C private detail UI,[\s\S]*P16 remains mandatory for Production/,
  );
  assert.equal(
    existsSync("supabase/migrations/phase_1d_manual_payment_staff_review.sql"),
    false,
  );
});
