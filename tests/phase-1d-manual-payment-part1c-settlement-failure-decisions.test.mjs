import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART1C_SETTLEMENT_FAILURE_DECISION_TABLE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 1C freezes every Owner-approved settlement and failure decision", () => {
  assert.match(contract, /OWNER APPROVED \/ SC01-SC30 FROZEN/);
  assert.match(contract, /Owner Approval Date:\*\* 2026-08-01/);
  assert.match(contract, /approved all recommended values SC01-SC30 on 2026-08-01/);
  for (let id = 1; id <= 30; id += 1) {
    assert.match(contract, new RegExp(`\\| SC${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /Runtime:\*\* NOT AUTHORIZED/);
  assert.match(contract, /Migration:\*\* NOT AUTHORIZED/);
  assert.match(contract, /authorizes Part 2 migration contract review/);
});

test("settlement is exact, atomic and derived from canonical evidence", () => {
  assert.match(contract, /one non-executable internal settlement helper/);
  assert.match(contract, /transaction `PENDING -> SUCCEEDED`/);
  assert.match(contract, /payment `PAID`/);
  assert.match(contract, /order `PENDING_CONFIRMATION -> CONFIRMED`/);
  assert.match(contract, /No intermediate verified-but-unsettled state is committed/);
  assert.match(contract, /Partial, excess, duplicate-success or currency-mismatched totals fail closed/);
});

test("settlement preserves inventory, coupon and deadline invariants", () => {
  assert.match(contract, /`payment_due_minutes <= reservation_minutes`/);
  assert.match(contract, /default for `payment_due_minutes` from 60 to 15/);
  assert.match(contract, /do not rewrite existing orders, settings or financial evidence automatically/);
  assert.match(contract, /`inventory_allocations\.source_reservation_id`/);
  assert.match(contract, /move the balance quantity from `reserved` to `allocated`/);
  assert.match(contract, /change it to `CONSUMED` with `consumed_at`/);
});

test("rejection and post-commit events cannot corrupt settlement truth", () => {
  assert.match(contract, /transaction `PENDING -> FAILED` and proof `PENDING -> REJECTED`/);
  assert.match(contract, /Rejection leaves payment `UNPAID`, order `PENDING_CONFIRMATION`/);
  assert.match(contract, /records `ORDER_PAID` from canonical order\/customer\/amount data/);
  assert.match(contract, /records one privacy-bounded `payment_failed` cart event/);
  assert.match(contract, /never rewrites the committed review, payment, inventory, coupon or order result/);
});

test("status records the freeze and advances only to Part 2 review", () => {
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 1C SETTLEMENT AND FAILURE DECISION TABLE PREPARED/);
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 1C OWNER DECISION FREEZE COMPLETE/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4E LAYER B GUARDED ACTION AND HARDENING MIGRATION IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4F SERVER ACTION SERVICE AND POST-COMMIT HANDOFF IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4F server action\/runtime orchestration,[\s\S]*P16 remains mandatory for Production/,
  );
});
