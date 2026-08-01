import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const decisions = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_CART_CHECKOUT_PAYMENT_PART1_OWNER_DECISION_TABLE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1D Part 1 records explicit Owner approval for D01-D24", () => {
  assert.match(decisions, /\*\*Status:\*\* OWNER APPROVED \/ D01-D24 FROZEN/);
  assert.match(decisions, /\*\*Owner Approval Date:\*\* 2026-07-31/);
  assert.match(decisions, /Owner approved all recommended values D01-D24/);
  for (let id = 1; id <= 24; id += 1) {
    assert.match(
      decisions,
      new RegExp(`\\| D${String(id).padStart(2, "0")} \\|`),
    );
  }
});

test("recommended checkout remains product-only, single-store and authenticated", () => {
  assert.match(decisions, /Product checkout only/);
  assert.match(decisions, /One cart belongs to exactly one organization/);
  assert.match(decisions, /guest checkout is deferred/i);
  assert.match(decisions, /browser-supplied customer or tenant identity is never trusted/i);
  assert.match(decisions, /Checkout never auto-creates organization membership/);
});

test("recommended commerce flow revalidates price, stock, coupon and address", () => {
  assert.match(decisions, /Server recalculates canonical variant price/);
  assert.match(decisions, /Backorder is disabled/);
  assert.match(decisions, /default reservation is 15 minutes/);
  assert.match(decisions, /one coupon code per first MVP checkout/i);
  assert.match(decisions, /copy the final value to immutable `order_addresses`/);
  assert.match(decisions, /browser totals are display-only/);
});

test("recommended payment path remains local, audited and transaction-backed", () => {
  assert.match(decisions, /Local simulation and manual-payment review only/);
  assert.match(decisions, /Only an active actor with `payment\.verify` may confirm/);
  assert.match(decisions, /`payment_transactions` is the money-movement evidence/);
  assert.match(decisions, /provider-neutral server adapter/i);
  assert.match(decisions, /signature, replay and\s+idempotency validation/);
  assert.match(decisions, /no real transfer or provider spend/i);
});

test("recommended controls fail closed and preserve P16", () => {
  assert.match(decisions, /exact feature code `storefront\.checkout`/);
  assert.match(decisions, /checkout processing does not grant marketing consent/i);
  assert.match(decisions, /pre-commit failure rolls back all/);
  assert.match(decisions, /Production:[\s\S]*BLOCKED BY P16/);
  assert.match(decisions, /migration: NOT AUTHORIZED/);
  assert.match(decisions, /real payment\/provider work: NOT AUTHORIZED/);
});

test("implementation status advances only to Part 2 Owner freeze", () => {
  assert.match(status, /PHASE 1D PART 1 OWNER DECISION TABLE PREPARED/);
  assert.match(status, /PHASE 1D PART 1 OWNER DECISION FREEZE COMPLETE/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E LOCAL ACTIVATION AND AUTH\/RLS VALIDATED; REAL BROWSER QA BLOCKED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E REAL BROWSER WORKFLOW QA REQUIRES BROWSER CONNECTION AND AUTHENTICATED UI SESSION/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-E real browser workflow QA,[\s\S]*P16 remains mandatory for Production/,
  );
});





