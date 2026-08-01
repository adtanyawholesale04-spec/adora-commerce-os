import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_CART_CHECKOUT_PAYMENT_PART0_REPOSITORY_DEPENDENCY_AUDIT.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1D Part 0 reuses canonical Commerce Core sources", () => {
  assert.match(
    audit,
    /\*\*Status:\*\* VALIDATED \/ OWNER DECISIONS REQUIRED \/ IMPLEMENTATION BLOCKED/,
  );
  for (const source of [
    "carts",
    "cart_items",
    "inventory_reservations",
    "customers",
    "customer_profile_links",
    "coupons",
    "coupon_redemptions",
    "orders",
    "order_items",
    "payments",
    "payment_transactions",
    "fulfillments",
    "shipments",
    "attribution_events",
    "audit_logs",
  ]) {
    assert.match(audit, new RegExp(`\\b${source}\\b`));
  }
  assert.match(
    audit,
    /No new customer, product, variant, inventory, cart, order, payment, refund,/,
  );
});

test("Phase 1D Part 0 identifies the protected orchestration gaps", () => {
  assert.match(audit, /No Phase 1D Business Rules document exists/);
  assert.match(audit, /No Phase 1D ER addendum exists/);
  assert.match(audit, /No canonical checkout session source or guarded service exists/);
  assert.match(audit, /Generic tenant RLS and staff inventory wrappers are not a customer boundary/);
  assert.match(audit, /No transaction composes price, promotion, coupon, stock, address, order and payment state/);
  assert.match(audit, /No payment provider adapter, secret destination, webhook verifier or provider idempotency map exists/);
});

test("Phase 1D Part 0 keeps browser, payment and production boundaries closed", () => {
  assert.match(audit, /\*\*Migration:\*\* Not required or authorized for Part 0/);
  assert.match(audit, /\*\*Production:\*\* NOT AUTHORIZED \/ BLOCKED BY P16/);
  assert.match(audit, /\*\*Approved Provider Spend:\*\* USD 0/);
  assert.match(audit, /never grant direct browser writes to core tables/);
  assert.match(audit, /no real provider or spend without separate approval/i);
  assert.match(audit, /production remains blocked by P16/i);
});

test("Phase 1D Part 1 has a complete Owner decision queue", () => {
  for (let id = 1; id <= 24; id += 1) {
    assert.match(
      audit,
      new RegExp(`\\| D${String(id).padStart(2, "0")} \\|`),
    );
  }
  assert.match(audit, /Product checkout only; defer service, package and booking/);
  assert.match(audit, /One organization per cart; multi-store cart deferred/);
  assert.match(audit, /Points redemption.*Defer/i);
  assert.match(audit, /No automatic membership unless a separate guarded policy is approved/);
});

test("Phase 1D validation covers tenant, concurrency, idempotency and financial history", () => {
  assert.match(audit, /Authenticated customer ownership, tenant isolation and cross-store denial/);
  assert.match(audit, /concurrent stock attempts\s+and coupon races/);
  assert.match(audit, /No duplicate order, payment transaction, coupon redemption or financial/);
  assert.match(audit, /No overselling, negative balances, silent quantity reduction or expired-link/);
  assert.match(audit, /Fresh migration replay, RLS\/security, concurrency, workflow, lint,/);
});

test("implementation status advances only to the Owner freeze", () => {
  assert.match(
    status,
    /PHASE 1D PART 0 REPOSITORY AND DEPENDENCY AUDIT COMPLETE/,
  );
  assert.match(
    status,
    /BLOCKED: Phase 1D protected implementation has no frozen Business Rules\/ER/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3B OWNER FROZEN \/ NO RUNTIME IMPLEMENTED \/ PRODUCTION NOT APPLIED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: OWNER AUTHORIZATION FOR PHASE 1D MANUAL PAYMENT PART 3C CUSTOMER SUBMISSION SERVICE IMPLEMENTATION/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3C customer submission service implementation, staff verification, private proof Storage[\s\S]*P16 remains mandatory for Production/,
  );
});
