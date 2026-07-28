import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const files = {
  form: join(root, "src", "app", "admin", "users", "member-role-removal-form.tsx"),
  page: join(root, "src", "app", "admin", "users", "page.tsx"),
  usersAction: join(root, "src", "app", "admin", "users", "actions.ts"),
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_ROLE_REMOVAL_UI_SUBMIT_ENABLEMENT.md"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 member role removal UI submit enablement", () => {
  it("connects a permission-aware destructive form to the guarded server action", () => {
    for (const file of Object.values(files)) assert.ok(existsSync(file), `${file} is missing`);
    const form = readFileSync(files.form, "utf8");
    const page = readFileSync(files.page, "utf8");
    const usersAction = readFileSync(files.usersAction, "utf8");

    for (const required of [
      '"use client"',
      "requestMemberRoleRemovalServerAction",
      "useActionState",
      'name="membershipId"',
      'name="roleId"',
      'name="reason"',
      "clientActionId",
      "members.manage",
      'membershipStatus === "ACTIVE"',
      'profileStatus === "ACTIVE"',
      "!role.isSystemRole",
      "selectedMember.roleIds.includes(role.id)",
      "lastRoleRemovalBlocked",
      "window.confirm",
      "MemberRoleRemovalForm",
      "canRemoveRole"
    ]) {
      assert.match(`${form}\n${page}\n${usersAction}`, new RegExp(escapeRegExp(required)), `${required} missing`);
    }

    assert.doesNotMatch(form, /createSupabase|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.rpc\s*\(|service_role/i);
  });

  it("reconciles the removal UI contract and next status", () => {
    const contract = readFileSync(files.contract, "utf8");
    const status = readFileSync(files.status, "utf8");
    for (const required of [
      "A3-ACTION-ROLE-REMOVE-UI-001",
      "No self-role removal",
      "No system-role removal",
      "No last-role removal",
      "Member role removal UI affordance and submit enablement",
      "A3 role management end-to-end QA and status reconciliation"
    ]) {
      assert.match(`${contract}\n${status}`, new RegExp(escapeRegExp(required)), `${required} missing`);
    }
    assert.match(status, /A3-ACTION-ROLE-REMOVE-UI-001[\s\S]*IMPLEMENTED/);
  });
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
