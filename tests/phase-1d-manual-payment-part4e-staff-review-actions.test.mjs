import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260801105844_phase_1d_manual_payment_staff_review_actions.sql",
  "utf8",
);
const validation = readFileSync(
  "supabase/validation/057_phase_1d_manual_payment_staff_review_actions_test.sql",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4E exposes only explicit guarded review actions", () => {
  assert.match(migration, /create function public\.api_verify_storefront_payment\(/);
  assert.match(migration, /create function public\.api_reject_storefront_payment\(/);
  assert.doesNotMatch(migration, /api_update_storefront_payment_status/);
  assert.match(migration, /PAYMENT_REVIEW_SELF_ACTION_DENIED/);
  assert.match(migration, /PAYMENT_VERIFY_PERMISSION_REQUIRED/);
});

test("Part 4E settles canonical financial and inventory truth atomically", () => {
  assert.match(migration, /internal_settle_storefront_payment/);
  assert.match(migration, /source_reservation_id/);
  assert.match(migration, /set reserved = balance\.reserved - converted\.quantity/);
  assert.match(migration, /set status = 'PAID', amount_received = v_received/);
  assert.match(migration, /'PAYMENT_VERIFIED'/);
  assert.match(migration, /'PAYMENT_REJECTED'/);
});

test("Part 4E closes direct writes and isolates post-commit failure events", () => {
  for (const policy of [
    "payments_permission_update",
    "payment_transactions_permission_insert",
    "payment_transactions_permission_update",
    "payment_proofs_permission_insert",
    "payment_proofs_permission_update",
  ]) {
    assert.match(migration, new RegExp(`drop policy ${policy}`));
  }
  assert.match(migration, /api_record_storefront_payment_failed_event/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(validation, /Injected settlement failure did not roll back atomically/);
});

test("Part 4E advances only to the separately approved server runtime", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E LOCAL ACTIVATION AND AUTH\/RLS VALIDATED; REAL BROWSER QA BLOCKED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E REAL BROWSER WORKFLOW QA REQUIRES BROWSER CONNECTION AND AUTHENTICATED UI SESSION/,
  );
  assert.match(status, /Production was not queried or changed/);
});





