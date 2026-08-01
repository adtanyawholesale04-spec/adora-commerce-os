import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_PART3E_SERVER_APPLICATION_RUNTIME_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3E freezes R01-R24 and records the local implementation", () => {
  assert.match(contract, /OWNER FROZEN \/ R01-R24 APPROVED \/ IMPLEMENTED LOCALLY/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| R${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /Project Owner approved the recommended values for R01-R24/);
  assert.match(contract, /Migration:\*\* None proposed/);
});

test("customer checkout and service-role attribution remain separate", () => {
  assert.match(contract, /createSupabaseServerClient\(\)/);
  assert.match(contract, /Never submit checkout with the secret client/);
  assert.match(contract, /api_record_attribution_event/);
  assert.match(contract, /never invokes `api_compensate_storefront_checkout`/);
  assert.match(contract, /order remains the durable source/);
});

test("Part 3E preserves idempotency, privacy and deferred payment boundaries", () => {
  assert.match(contract, /retain it across transport retry, double click and matching resubmission/);
  assert.match(contract, /require explicit customer confirmation and issue a new request ID/);
  assert.match(contract, /exclude contact, address, coupon, auth token, secret and raw RPC payloads/);
  assert.match(contract, /manual payment, provider, public activation and Production apply require separate authorization/);
});

test("implementation status records Part 3E local completion", () => {
  assert.match(
    status,
    /PHASE 1D PART 3E SERVER APPLICATION RUNTIME CONTRACT REVIEW PREPARED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D-C RESPONSIVE, ACCESSIBILITY AND WORKFLOW QA VALIDATED \/ LOCAL COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT STAFF REVIEW IMPLEMENTATION CONTRACT REVIEW REQUIRES OWNER APPROVAL/,
  );
});
