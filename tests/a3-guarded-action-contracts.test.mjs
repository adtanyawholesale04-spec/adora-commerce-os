import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const contractPath = join(
  root,
  "docs",
  "api-contracts",
  "ACOS_A3_GUARDED_ACTION_SERVICE_CONTRACT_HARDENING.md"
);
const mapPath = join(root, "docs", "api-contracts", "ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md");
const statusPath = join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");

describe("A3 guarded action service contracts", () => {
  it("records the guarded action hardening artifact", () => {
    assert.ok(existsSync(contractPath), "guarded action contract hardening doc is missing");

    const contract = readFileSync(contractPath, "utf8");

    for (const required of [
      "Authentication",
      "Active Membership",
      "Tenant Scope",
      "Permission",
      "Entitlement",
      "Input Validation",
      "Idempotency",
      "Audit",
      "Service Role Boundary",
      "cross-tenant",
      "no service role or secret key exposure"
    ]) {
      assert.match(contract, new RegExp(required, "i"), `${required} guard is missing`);
    }
  });

  it("keeps the first action candidates explicit and tiered", () => {
    const contract = readFileSync(contractPath, "utf8");

    for (const actionId of [
      "admin.member.invite.request",
      "admin.organization.profile.update.request",
      "inventory.adjustment.request",
      "product.cost.update.request",
      "payment.refund.process",
      "warehouse.qc.complete",
      "warehouse.qc.override",
      "shipping.label.create",
      "shipping.handoff.mark_ready",
      "shipping.tracking.record",
      "shipping.carrier_webhook.ingest",
      "return.inspection.record"
    ]) {
      assert.match(contract, new RegExp(actionId.replace(/[.]/g, "\\.")), `${actionId} missing`);
    }
  });

  it("updates the service contract map away from stale read-only next steps", () => {
    const map = readFileSync(mapPath, "utf8");

    assert.match(map, /HARDENED_IN_REVIEW/);
    assert.match(map, /ACOS_A3_GUARDED_ACTION_SERVICE_CONTRACT_HARDENING\.md/);
    assert.match(map, /admin\.member\.invite\.request/);
    assert.doesNotMatch(map, /Proceed with `CORE-UI-003`/);
  });

  it("reconciles implementation status with the next A3 task", () => {
    const status = readFileSync(statusPath, "utf8");

    assert.match(status, /A3-ACTION-CONTRACT-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 GUARDED ACTION SERVICE CONTRACT HARDENING IMPLEMENTED/);
    assert.match(status, /A3 LOW-RISK GUARDED ADMIN ACTION SKELETONS IMPLEMENTED/);
    assert.match(status, /A3 PERMISSION-AWARE UI AFFORDANCES IMPLEMENTED/);
    assert.match(status, /NEXT: A3 audited persistence contract for admin\.member\.invite\.request/);
  });
});
