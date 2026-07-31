import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_CART_CHECKOUT_PAYMENT_PART3A_MIGRATION_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const migrations = readdirSync("supabase/migrations");

test("Part 3A records Owner approval for M01-M20 without creating SQL", () => {
  assert.match(contract, /\*\*Status:\*\* OWNER APPROVED \/ M01-M20 FROZEN FOR PART 3B/);
  assert.match(contract, /\*\*Owner Approval Date:\*\* 2026-08-01/);
  assert.match(contract, /Owner approved M01-M20 in full on 2026-08-01/);
  for (let id = 1; id <= 20; id += 1) {
    assert.match(
      contract,
      new RegExp(`\\| M${String(id).padStart(2, "0")} \\|`),
    );
  }
  assert.equal(
    migrations.some((name) => /phase_1d_checkout_foundation/i.test(name)),
    false,
  );
});

test("foundation contract stays additive and reuses canonical masters", () => {
  assert.match(contract, /Create only `organization_checkout_settings` and `commerce_idempotency_keys`/);
  assert.match(contract, /Add nullable `orders\.source_cart_id`/);
  assert.match(contract, /Add nullable `inventory_reservations\.order_item_id`/);
  assert.match(contract, /No checkout-session table/);
  assert.match(contract, /no provider-intent table/i);
  assert.match(contract, /Do not replace or widen `reserve_inventory`/);
});

test("foundation contract defines database concurrency safeguards", () => {
  assert.match(contract, /one `STOREFRONT` cart in `OPEN`, `READY` or `RESERVED`/);
  assert.match(contract, /one row per `\(organization_id, cart_id, variant_id\)`/);
  assert.match(contract, /Prevent duplicate active `BANK_TRANSFER`\/`QR` references/);
  assert.match(contract, /unique \(organization_id, operation, request_id\)/);
  assert.match(contract, /deterministic `\(warehouse\.code, warehouse\.id\)` order/);
});

test("foundation contract fails closed at RLS and definer boundaries", () => {
  assert.match(contract, /revoke all from `PUBLIC`, `anon`, `authenticated`/i);
  assert.match(contract, /check `auth\.uid\(\)` before any privileged read\/write/);
  assert.match(contract, /active `customer_profile_links` row/);
  assert.match(contract, /revoke execute from `PUBLIC` and `anon`/);
  assert.match(contract, /never expose `service_role` credentials/);
});

test("foundation contract has non-destructive preflight and rollback gates", () => {
  assert.match(contract, /stop before DDL if any query returns an unsafe row/);
  assert.match(contract, /never repairs, merges, deletes\s+or rewrites production data automatically/);
  assert.match(contract, /a failed transactional migration rolls back automatically/);
  assert.match(contract, /tables\/columns\/history are never dropped/);
  assert.match(contract, /no Production push occurs/);
});

test("implementation status advances only to Part 3B local foundation", () => {
  assert.match(status, /PHASE 1D PART 3A MIGRATION CONTRACT REVIEW PREPARED/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D PART 3A OWNER APPROVED \/ M01-M20 FROZEN FOR PART 3B/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D PART 3B FOUNDATION MIGRATION GENERATION AND LOCAL VALIDATION/,
  );
  assert.match(
    status,
    /BLOCKED: Production migration apply, Part 3C-3E protected runtime, real payment\/provider work and production activation remain unauthorized until later gates/,
  );
});
