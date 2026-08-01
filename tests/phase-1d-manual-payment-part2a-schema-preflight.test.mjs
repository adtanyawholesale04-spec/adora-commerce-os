import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const review = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART2A_SCHEMA_PREFLIGHT_REVIEW.md",
  "utf8",
);
const sql = readFileSync(
  "supabase/validation/sql/phase-1d-manual-payment-part2a-preflight.sql",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 2A catalogs every bounded preflight check", () => {
  assert.match(review, /COMPLETE \/ LOCAL PREFLIGHT PASSED \/ 0 BLOCKERS/);
  for (let id = 1; id <= 20; id += 1) {
    assert.match(review, new RegExp(`\\| PF${String(id).padStart(2, "0")} \\|`));
    assert.match(sql, new RegExp(`PF${String(id).padStart(2, "0")}_`));
  }
  assert.match(review, /BLOCKER findings:\s+0/);
  assert.match(review, /EXPECTED_GAP findings: 2/);
});

test("preflight SQL is one read-only privacy-bounded statement", () => {
  assert.match(sql, /^with\s/m);
  assert.doesNotMatch(sql, /\b(insert|update|delete|alter|create|drop|truncate)\b/i);
  assert.match(
    sql,
    /\)\s*select check_id, severity, finding_count\s*from checks\s*order by check_id;\s*$/,
  );
});

test("preflight preserves canonical payment and allocation boundaries", () => {
  assert.match(review, /`payments` already has a unique `order_id`/);
  assert.match(review, /reuse that[\s\S]*catalog/);
  assert.match(review, /normalized active-reference invariant/);
  assert.match(review, /only allocation source lineage remains additive/);
  assert.match(review, /not evidence that Production data is clean/);
});

test("status advances only to Part 2B additive schema design", () => {
  assert.match(status, /PHASE 1D MANUAL PAYMENT PART 2A SCHEMA AND PREFLIGHT REVIEW COMPLETE \/ LOCAL VALIDATED/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B STAFF REVIEW SERVICE CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE FOR RV01-RV24 REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: RV01-RV24 Owner freeze, Staff Review migration, guarded actions,[\s\S]*P16 remains mandatory for Production/,
  );
});
