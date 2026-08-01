import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART3B_CUSTOMER_SUBMISSION_SERVICE_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3B freezes all Owner-approved decisions and records the later runtime", () => {
  for (let index = 1; index <= 24; index += 1) {
    assert.match(contract, new RegExp(`\\| MS${String(index).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /OWNER APPROVED \/ MS01-MS24 FROZEN/);
  assert.match(contract, /Owner approved the recommended values for[\s\S]*MS01-MS24 in full/);
  assert.match(contract, /Runtime Implementation:\*\* Local-only implementation authorized and completed/);
  assert.match(contract, /Migration:\*\* None proposed/);
});

test("Part 3B preserves customer-session, tenant and exact-input boundaries", () => {
  assert.match(contract, /createSupabaseServerClient\(\)/);
  assert.match(contract, /never use `createSupabaseSecretClient\(\)` or service role/);
  assert.match(contract, /organizationSlug`, `orderId`, `paymentReference` and `requestId/);
  assert.match(contract, /never trust a browser-supplied organization UUID/);
  assert.match(contract, /api_submit_storefront_payment_proof/);
  assert.match(contract, /no direct table write is allowed/);
});

test("Part 3B freezes privacy-safe result, error and retry recommendations", () => {
  for (const code of [
    "feature_disabled",
    "auth_required",
    "payment_reference_invalid",
    "order_not_payable",
    "payment_expired",
    "payment_reference_conflict",
    "payment_attempt_pending",
    "request_conflict",
    "persistence_error",
  ]) {
    assert.match(contract, new RegExp(`\\b${code}\\b`));
  }
  assert.match(contract, /No result includes the bank reference/);
  assert.match(contract, /Retry same request ID/);
  assert.match(contract, /exclude reference, contact, auth token, raw RPC data/);
  assert.match(contract, /Do not accept files, MIME type, bucket, object path or signed URL/);
});

test("Part 3B status preserves Owner freeze after Part 3C implementation", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3B CUSTOMER SUBMISSION SERVICE CONTRACT REVIEW COMPLETE: MS01-MS24/,
  );
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3B OWNER DECISION FREEZE COMPLETE: Owner approved MS01-MS24 in full/,
  );
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
});
