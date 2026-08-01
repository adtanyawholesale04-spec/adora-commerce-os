import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260801023901_phase_1d_manual_payment_customer_submission_boundary.sql",
  "utf8",
);
const validation = readFileSync(
  "supabase/validation/054_phase_1d_manual_payment_customer_submission_test.sql",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3A exposes only the frozen authenticated submission RPC", () => {
  assert.match(
    migration,
    /api_submit_storefront_payment_proof\(\s*p_organization_id uuid,\s*p_order_id uuid,\s*p_payment_reference text,\s*p_request_id uuid/s,
  );
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(
    migration,
    /revoke all on function public\.api_submit_storefront_payment_proof[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.api_submit_storefront_payment_proof[\s\S]*to authenticated/i,
  );
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
});

test("Part 3A derives canonical payment data and stores reference-only evidence", () => {
  assert.match(migration, /v_payment\.amount_expected/);
  assert.match(migration, /v_payment\.amount_expected <> v_order\.grand_total/);
  assert.match(migration, /v_payment\.amount_expected <> v_order\.amount_due/);
  assert.match(migration, /'BANK_TRANSFER'/);
  assert.match(migration, /'REFERENCE_ONLY'/);
  assert.match(migration, /storage_path,[\s\S]*mime_type,[\s\S]*submitted_by_type/);
  assert.doesNotMatch(migration, /insert into public\.orders/i);
  assert.doesNotMatch(migration, /update public\.(orders|payments)/i);
});

test("Part 3A enforces identity, ownership, privacy, idempotency and direct-write denial", () => {
  for (const code of [
    "AUTH_REQUIRED",
    "MEMBERSHIP_REQUIRED",
    "CUSTOMER_LINK_REQUIRED",
    "CHECKOUT_NOT_ENABLED",
    "ORDER_NOT_PAYABLE",
    "PAYMENT_EXPIRED",
    "PAYMENT_REFERENCE_INVALID",
    "PAYMENT_REFERENCE_CONFLICT",
    "PAYMENT_ATTEMPT_PENDING",
    "PAYMENT_STATE_INCONSISTENT",
    "IDEMPOTENCY_CONFLICT",
    "PAYMENT_SUBMISSION_FAILED",
  ]) {
    assert.match(migration, new RegExp(`'${code}'`));
  }
  assert.match(migration, /PAYMENT_PROOF_SUBMITTED/);
  assert.match(migration, /PAYMENT_PROOF_SUBMIT/);
  const auditStart = migration.indexOf("insert into public.audit_logs");
  const auditEnd = migration.indexOf(
    "update public.commerce_idempotency_keys k",
    auditStart,
  );
  const auditWrite = migration.slice(auditStart, auditEnd);
  assert.doesNotMatch(
    auditWrite,
    /v_normalized_reference/,
  );
  assert.match(validation, /other customer order unexpectedly succeeded/);
  assert.match(validation, /cross-tenant order unexpectedly succeeded/);
  assert.match(validation, /direct payment transaction write unexpectedly succeeded/);
  assert.match(validation, /payment reference leaked into audit/);
});

test("Part 3A remains local-only while Part 3B waits for Owner freeze", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3A CUSTOMER SUBMISSION GUARDED DATABASE BOUNDARY IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-C PRIVATE REVIEW DETAIL UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
});
