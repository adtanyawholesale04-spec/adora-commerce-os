import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_CART_CHECKOUT_PAYMENT_PART3D_ATOMIC_CHECKOUT_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const migrations = readdirSync("supabase/migrations");

test("Part 3D freezes AC01-AC30 and records the locally validated Layer 3 migration", () => {
  assert.match(
    contract,
    /OWNER FROZEN \/ AC01-AC30 APPROVED \/ IMPLEMENTED \/ LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/,
  );
  assert.match(contract, /Project Owner approved the recommended values for AC01-AC30/);
  for (let id = 1; id <= 30; id += 1) {
    assert.match(contract, new RegExp(`\\| AC${String(id).padStart(2, "0")} \\|`));
  }
  assert.equal(
    migrations.some((name) => /phase_1d_atomic_checkout/i.test(name)),
    true,
  );
});

test("Part 3D reuses canonical commerce sources and one transaction", () => {
  for (const source of [
    "orders",
    "order_items",
    "order_addresses",
    "payments",
    "inventory_reservations",
    "coupon_redemptions",
    "commerce_idempotency_keys",
  ]) {
    assert.match(contract, new RegExp(`\\b${source}\\b`));
  }
  assert.match(contract, /Any controlled or database failure before commit rolls back every line/);
  assert.match(contract, /READY -> RESERVED -> CONVERTED/);
  assert.match(contract, /creates no hold\/order\/payment/);
});

test("Part 3D implements the frozen coupon arithmetic and campaign separation", () => {
  assert.match(contract, /Coupon Evaluation Subcontract/);
  assert.match(contract, /coupon-linked campaign versions cannot apply without a submitted code/);
  assert.match(contract, /competing-coupon tests/);
  assert.match(contract, /non-destructive preflight/);
});

test("Part 3D preserves financial, privacy and provider boundaries", () => {
  assert.match(contract, /create no transaction, proof, provider or fee row/);
  assert.match(contract, /never contact\/address\/coupon text/);
  assert.match(contract, /does not grant or modify marketing consent/);
  assert.match(contract, /Production Apply:\*\* Not authorized/);
  assert.match(contract, /USD 0/);
});

test("implementation status records local Layer 3 completion and the Part 3E gate", () => {
  assert.match(status, /PHASE 1D PART 3D ATOMIC CHECKOUT CONTRACT REVIEW PREPARED/);
  assert.match(
    status,
    /PHASE 1D PART 3D OWNER DECISION FREEZE COMPLETE: Owner approved AC01-AC30 in full on 2026-08-01/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B STAFF REVIEW SERVICE CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE FOR RV01-RV24 REQUIRES OWNER APPROVAL/,
  );
});
