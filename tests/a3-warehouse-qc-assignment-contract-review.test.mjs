import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const contractPath = path.join(
  root,
  "docs",
  "api-contracts",
  "A3_WAREHOUSE_QC_ASSIGNMENT_CONTRACT_REVIEW.md",
);
const statusPath = path.join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");

test("Warehouse QC assignment review records approval and implementation boundary", () => {
  const contract = fs.readFileSync(contractPath, "utf8");
  for (const required of [
    "A3-WAREHOUSE-QC-ASSIGNMENT-001",
    "Status:** `APPROVED`",
    "fulfillment_qc_sessions",
    "started_by",
    "completed_by",
    "PENDING",
    "IN_PROGRESS",
    "FAILED",
    "warehouse.qc",
    "Owner approval",
    "20260728143613_a3_warehouse_qc_assignment_boundary.sql",
    "api_deactivate_member",
    "NEXT:** Implement the approved Returns assignment database boundary.",
  ]) {
    assert.ok(contract.includes(required), `${required} missing`);
  }
});

test("implementation status records the implemented QC assignment boundary", () => {
  const status = fs.readFileSync(statusPath, "utf8");
  assert.match(status, /A3 Warehouse QC Assignment Contract Review/);
  assert.match(status, /A3-WAREHOUSE-QC-ASSIGNMENT-001/);
  assert.match(status, /NEXT: Complete the Customer Portal MVP/);
});
