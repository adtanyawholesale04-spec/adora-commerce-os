import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4A_STAFF_REVIEW_REPOSITORY_DEPENDENCY_AUDIT.md",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");
const operationRls = readFileSync(
  "supabase/migrations/20260726200055_operations_permission_rls.sql",
  "utf8",
);
const checkoutLayer = readFileSync(
  "supabase/migrations/20260731195612_phase_1d_atomic_checkout_layer3.sql",
  "utf8",
);

test("Part 4A reuses every canonical staff review source", () => {
  for (const source of [
    "`payments`",
    "`payment_transactions`, `payment_proofs`",
    "`commerce_idempotency_keys`",
    "`audit_logs`",
    "`api_record_attribution_event`",
    "`inventory_allocations.source_reservation_id`",
  ]) {
    assert.match(audit, new RegExp(source.replaceAll(".", "\\.")));
  }
  assert.match(audit, /No duplicate Commerce Core master is required or authorized/);
  assert.match(audit, /`020_payments\.sql` already[\s\S]*`unique \(order_id\)`/);
});

test("Part 4A records direct payment writes as a future hardening blocker", () => {
  assert.match(operationRls, /grant select, insert, update on table/);
  assert.match(operationRls, /\('payments', 'payment\.view', null, 'payment\.verify'\)/);
  assert.match(operationRls, /\('payment_transactions', 'payment\.view', 'payment\.verify', 'payment\.verify'\)/);
  assert.match(operationRls, /\('payment_proofs', 'payment\.view', 'payment\.verify', 'payment\.verify'\)/);
  assert.match(audit, /future database migration must revoke direct writes/);
});

test("Part 4A refuses to reuse checkout-only idempotency helpers silently", () => {
  assert.match(
    checkoutLayer,
    /p_operation not in \(\s*'CHECKOUT_SUBMIT', 'CHECKOUT_EXPIRE', 'CHECKOUT_COMPENSATE'/,
  );
  assert.match(audit, /dedicated review helpers or a narrowly reviewed extension/);
  assert.match(audit, /No `api_verify_storefront_payment` or `api_reject_storefront_payment` exists/);
});

test("Part 4A advances only to the Staff Review contract gate", () => {
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
