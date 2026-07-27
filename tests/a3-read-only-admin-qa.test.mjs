import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const modules = [
  ["CORE-UI-001", "admin", "context.ts", "CORE_UI_001_ADMIN_APP_SHELL_RBAC_NAVIGATION.md"],
  ["CORE-UI-002", "admin/products", "products.ts", "CORE_UI_002_PRODUCTS_READ_ONLY_SCREEN.md"],
  ["CORE-UI-003", "admin/inventory", "inventory.ts", "CORE_UI_003_INVENTORY_READ_ONLY_SCREEN.md"],
  ["CORE-UI-004", "admin/customers", "customers.ts", "CORE_UI_004_CUSTOMERS_READ_ONLY_SCREEN.md"],
  ["CORE-UI-005", "admin/orders", "orders.ts", "CORE_UI_005_ORDERS_READ_ONLY_SCREEN.md"],
  ["CORE-UI-006", "admin/payments", "payments.ts", "CORE_UI_006_PAYMENTS_READ_ONLY_SCREEN.md"],
  ["CORE-UI-007", "admin/fulfillment", "fulfillment.ts", "CORE_UI_007_FULFILLMENT_READ_ONLY_SCREEN.md"],
  ["CORE-UI-008", "admin/qc", "qc.ts", "CORE_UI_008_WAREHOUSE_QC_READ_ONLY_SCREEN.md"],
  ["CORE-UI-009", "admin/shipping", "shipping.ts", "CORE_UI_009_SHIPPING_READ_ONLY_SCREEN.md"],
  ["CORE-UI-010", "admin/returns", "returns.ts", "CORE_UI_010_RETURNS_READ_ONLY_SCREEN.md"],
  ["CORE-UI-011", "admin/promotions", "promotions.ts", "CORE_UI_011_PROMOTIONS_READ_ONLY_SCREEN.md"],
  ["CORE-UI-012", "admin/users", "users.ts", "CORE_UI_012_USERS_ROLES_READ_ONLY_SCREEN.md"],
  ["CORE-UI-013", "admin/settings", "settings.ts", "CORE_UI_013_SETTINGS_READ_ONLY_SCREEN.md"]
];

describe("A3 read-only Admin QA", () => {
  it("keeps every implemented Admin read-only module wired to a route, read model, and contract", () => {
    for (const [taskId, route, readModel, contract] of modules) {
      assert.ok(
        existsSync(join(root, "src", "app", ...route.split("/"), "page.tsx")),
        `${taskId} route is missing`
      );
      assert.ok(
        existsSync(join(root, "src", "lib", "admin", readModel)),
        `${taskId} read model is missing`
      );
      assert.ok(
        existsSync(join(root, "docs", "api-contracts", contract)),
        `${taskId} contract is missing`
      );
    }
  });

  it("marks Dashboard as read-ready after reconciliation", () => {
    const navigation = readFileSync(join(root, "src", "lib", "admin", "navigation.ts"), "utf8");

    assert.match(navigation, /id: "dashboard"[\s\S]*status: "READY_FOR_READ"/);
  });

  it("records CORE-UI-001 through CORE-UI-013 as implemented in the status file", () => {
    const status = readFileSync(
      join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md"),
      "utf8"
    );

    for (let id = 1; id <= 13; id += 1) {
      const taskId = `CORE-UI-${String(id).padStart(3, "0")}`;
      assert.match(status, new RegExp(`${taskId}[\\s\\S]*IMPLEMENTED`), `${taskId} status missing`);
    }
  });
});
