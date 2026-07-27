import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const usersPage = join(root, "src", "app", "admin", "users", "page.tsx");
const settingsPage = join(root, "src", "app", "admin", "settings", "page.tsx");
const i18n = join(root, "src", "lib", "admin", "i18n.ts");
const contract = join(root, "docs", "api-contracts", "A3_PERMISSION_AWARE_UI_AFFORDANCES.md");
const status = join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");

describe("A3 permission-aware UI affordances", () => {
  it("adds disabled affordances to Users and Settings without enabling writes", () => {
    for (const file of [usersPage, settingsPage, contract]) {
      assert.ok(existsSync(file), `${file} is missing`);
    }

    const users = readFileSync(usersPage, "utf8");
    const settings = readFileSync(settingsPage, "utf8");

    assert.match(users, /MemberInviteAffordance/);
    assert.match(users, /admin\.member\.invite\.request/);
    assert.match(users, /members\.manage/);
    assert.match(users, /disabled/);

    assert.match(settings, /OrganizationProfileAffordance/);
    assert.match(settings, /admin\.organization\.profile\.update\.request/);
    assert.match(settings, /organization\.settings\.edit/);
    assert.match(settings, /disabled/);

    assert.doesNotMatch(`${users}\n${settings}`, /\.insert\s*\(/);
    assert.doesNotMatch(`${users}\n${settings}`, /\.update\s*\(/);
    assert.doesNotMatch(`${users}\n${settings}`, /service_role/i);
  });

  it("adds bilingual copy hooks for skeleton readiness and persistence-disabled state", () => {
    const copy = readFileSync(i18n, "utf8");

    for (const key of [
      "guardedActionReadiness",
      "skeletonReady",
      "permissionRequired",
      "persistenceDisabled",
      "submitDisabled",
      "memberInviteAction",
      "organizationProfileAction"
    ]) {
      assert.match(copy, new RegExp(key), `${key} copy missing`);
    }
  });

  it("reconciles implementation status with the next persistence-contract task", () => {
    const currentStatus = readFileSync(status, "utf8");

    assert.match(currentStatus, /A3-UI-AFFORDANCE-001[\s\S]*IMPLEMENTED/);
    assert.match(currentStatus, /A3 PERMISSION-AWARE UI AFFORDANCES IMPLEMENTED/);
    assert.match(currentStatus, /NEXT: A3 audited persistence contract for admin\.member\.invite\.request/);
  });
});
