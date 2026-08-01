import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_CART_CHECKOUT_PAYMENT_PART3C_GUARDED_CART_BOUNDARY_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const migrations = readdirSync("supabase/migrations");
const migration = readFileSync(
  "supabase/migrations/20260731183955_phase_1d_guarded_cart_rpcs.sql",
  "utf8",
);

test("Part 3C freezes C01-C24 and records the locally validated migration", () => {
  assert.match(
    contract,
    /OWNER APPROVED \/ C01-C24 FROZEN \/ SQL IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(contract, /\*\*Owner Approval Date:\*\* 2026-08-01/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(contract, new RegExp(`\\| C${String(id).padStart(2, "0")} \\|`));
  }
  assert.equal(
    migrations.some((name) => /phase_1d_guarded_cart/i.test(name)),
    true,
  );
});

test("Part 3C freezes candidate signatures and customer ownership posture", () => {
  for (const name of [
    "api_resolve_storefront_cart",
    "api_set_storefront_cart_item",
    "api_remove_storefront_cart_item",
    "api_start_storefront_checkout",
  ]) {
    assert.match(contract, new RegExp(`\\b${name}\\b`));
  }
  assert.match(contract, /Accept no profile ID or customer ID/);
  assert.match(contract, /active same-tenant membership/);
  assert.match(contract, /customer_profile_links/);
  assert.match(contract, /storefront\.checkout/);
});

test("Part 3C fails closed on quantity, stock, promotion and cart state", () => {
  assert.match(contract, /maximum of `999\.000` per variant/);
  assert.match(contract, /does not reserve it/);
  assert.match(contract, /base-price-only fallback is forbidden/);
  assert.match(contract, /Promotion Evaluation Subcontract/);
  assert.match(contract, /allowed only while the owned cart is `OPEN`/);
  assert.match(contract, /create no inventory\/coupon hold/);
});

test("Part 3C preserves idempotency, grants, privacy and Production gates", () => {
  assert.match(contract, /CART_CREATE/);
  assert.match(contract, /CART_ITEM_SET/);
  assert.match(contract, /CART_ITEM_REMOVE/);
  assert.match(contract, /CHECKOUT_START/);
  assert.match(contract, /SECURITY DEFINER/);
  assert.match(contract, /granted only to `authenticated`/);
  assert.match(contract, /No call stores email, phone, address, consent, proof/);
  assert.match(contract, /no Production apply or public checkout activation/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.api_resolve_storefront_cart/);
  assert.match(migration, /to authenticated/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/);
});

test("implementation status records local completion and stops before Part 3D SQL", () => {
  assert.match(
    status,
    /PHASE 1D PART 3C GUARDED CART BOUNDARY CONTRACT REVIEW PREPARED/,
  );
  assert.match(
    status,
    /PHASE 1D PART 3C OWNER DECISION FREEZE COMPLETE: Owner approved C01-C24 in full on 2026-08-01/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4E LAYER B GUARDED ACTION AND HARDENING MIGRATION IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4F SERVER ACTION SERVICE AND POST-COMMIT HANDOFF IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
});
