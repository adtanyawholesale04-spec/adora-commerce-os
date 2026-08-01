import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART3D_A1_GUARDED_PAYMENT_SNAPSHOT_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3D-A2 freezes every Owner-approved snapshot decision", () => {
  for (let index = 1; index <= 24; index += 1) {
    assert.match(
      contract,
      new RegExp(`\\| MR${String(index).padStart(2, "0")} \\|`),
    );
  }
  assert.match(contract, /OWNER APPROVED \/ MR01-MR24 FROZEN/);
  assert.match(
    contract,
    /Owner approved the recommended values for[\s\S]*MR01-MR24 in full/,
  );
  assert.match(contract, /Migration:\*\* `20260801054812_phase_1d_manual_payment_guarded_payment_snapshot\.sql`/);
  assert.match(contract, /creates no SQL function, migration, table, index, policy, grant/);
});

test("Part 3D-A1 reuses canonical identity and payment sources", () => {
  assert.match(contract, /`orders`, `payments`, `payment_transactions` and `payment_proofs`/);
  assert.match(contract, /`customer_profile_links` is the approved ownership association/);
  assert.match(contract, /api_submit_storefront_payment_proof/);
  assert.match(contract, /api_get_customer_portal_snapshot` is intentionally broader/);
  assert.match(contract, /must not be reused or trimmed in the browser/);
  assert.match(contract, /must not inherit or weaken that staff RLS policy/);
});

test("Part 3D-A1 freezes a minimal non-enumerating response", () => {
  assert.match(contract, /api_get_storefront_order_payment_snapshot\(uuid,uuid\)/);
  assert.match(contract, /return exactly `\{"available":false\}`/);
  for (const key of [
    "order_number",
    "order_status",
    "payment_status",
    "fulfillment_status",
    "currency_code",
    "grand_total",
    "amount_due",
    "payment_due_at",
    "pending_attempt",
    "proof_status",
  ]) {
    assert.match(contract, new RegExp(`\\b${key}\\b`));
  }
  assert.match(contract, /expose no transaction ID, proof ID, reference/);
  assert.match(contract, /fixed two-decimal strings/);
});

test("Part 3D-A1 keeps the privileged read boundary fail closed", () => {
  assert.match(contract, /`STABLE SECURITY DEFINER`/);
  assert.match(contract, /`SET search_path = ''`/);
  assert.match(contract, /grant the exact signature only to `authenticated`/);
  assert.match(contract, /source-table grants and RLS policies remain unchanged/);
  assert.match(contract, /creates no event, audit, ledger, consent, idempotency or status row/);
  assert.match(contract, /PAYMENT_SNAPSHOT_FAILED/);
  assert.match(contract, /no row\/advisory locks/);
});

test("Part 3D-A3 status records local implementation and preserves later gates", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3D-A1 GUARDED PAYMENT SNAPSHOT CONTRACT REVIEW COMPLETE: MR01-MR24/,
  );
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3D-A2 OWNER DECISION FREEZE COMPLETE: Owner approved MR01-MR24 in full/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-A OWNER DECISION FREEZE COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-B queue implementation,[\s\S]*P16 remains mandatory for Production/,
  );
});
