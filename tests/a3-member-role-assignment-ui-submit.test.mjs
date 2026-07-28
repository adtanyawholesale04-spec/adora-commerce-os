import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  form: join(root, "src", "app", "admin", "users", "member-role-assignment-form.tsx"),
  page: join(root, "src", "app", "admin", "users", "page.tsx"),
  usersAction: join(root, "src", "app", "admin", "users", "actions.ts"),
  usersReadModel: join(root, "src", "lib", "admin", "users.ts"),
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_ROLE_ASSIGNMENT_UI_SUBMIT_ENABLEMENT.md"),
  boundaryContract: join(root, "docs", "api-contracts", "A3_MEMBER_ROLE_ASSIGNMENT_GUARDED_ACTION_BOUNDARY.md"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 member role assignment UI submit enablement", () => {
  it("adds a permission-aware client form without browser-side database writes", () => {
    for (const file of [files.form, files.page, files.usersAction, files.contract]) {
      assert.ok(existsSync(file), `${file} is missing`);
    }

    const form = readFileSync(files.form, "utf8");
    const page = readFileSync(files.page, "utf8");

    for (const required of [
      '"use client"',
      "requestMemberRoleAssignmentServerAction",
      "useActionState",
      'name="membershipId"',
      'name="roleId"',
      'name="reason"',
      "clientActionId",
      "members.manage",
      "membershipStatus === \"ACTIVE\"",
      "profileStatus === \"ACTIVE\"",
      "!role.isSystemRole",
      "!selectedMember.roleIds.includes(role.id)"
    ]) {
      assert.match(`${form}\n${page}`, new RegExp(escapeRegExp(required)), `${required} missing`);
    }

    assert.doesNotMatch(form, /createSupabase/i);
    assert.doesNotMatch(form, /\.insert\s*\(/);
    assert.doesNotMatch(form, /\.update\s*\(/);
    assert.doesNotMatch(form, /\.delete\s*\(/);
    assert.doesNotMatch(form, /\.rpc\s*\(/);
    assert.doesNotMatch(form, /service_role/i);
  });

  it("wires the users page to the existing guarded role assignment server action", () => {
    const page = readFileSync(files.page, "utf8");
    const usersAction = readFileSync(files.usersAction, "utf8");
    const readModel = readFileSync(files.usersReadModel, "utf8");

    for (const required of [
      "MemberRoleAssignmentForm",
      "canAssignRole",
      "model.manageVisible",
      "currentProfileId={model.context.profileId}",
      "requestMemberRoleAssignment(",
      'revalidatePath("/admin/users")',
      "roleIds: string[]",
      "roleIds,"
    ]) {
      assert.match(
        `${page}\n${usersAction}\n${readModel}`,
        new RegExp(escapeRegExp(required)),
        `${required} missing`
      );
    }
  });

  it("documents submit scope and reconciles next status", () => {
    const contract = readFileSync(files.contract, "utf8");
    const boundaryContract = readFileSync(files.boundaryContract, "utf8");
    const status = readFileSync(files.status, "utf8");

    for (const required of [
      "A3-ACTION-ROLE-ASSIGN-UI-001",
      "Role removal is implemented in the separate role removal UI contract",
      "No full role replacement",
      "No system-role assignment",
      "No self-role assignment",
      "NEXT: A3 role management end-to-end QA and status reconciliation"
    ]) {
      assert.match(
        `${contract}\n${boundaryContract}\n${status}`,
        new RegExp(escapeRegExp(required)),
        `${required} missing`
      );
    }

    assert.match(status, /A3-ACTION-ROLE-ASSIGN-UI-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER ROLE ASSIGNMENT UI SUBMIT ENABLEMENT IMPLEMENTED/);
  });
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
