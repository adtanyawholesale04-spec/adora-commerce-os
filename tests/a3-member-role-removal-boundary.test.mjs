import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  lowRiskAction: join(root, "src", "lib", "admin", "actions", "low-risk.ts"),
  usersAction: join(root, "src", "app", "admin", "users", "actions.ts"),
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_ROLE_REMOVAL_GUARDED_ACTION_BOUNDARY.md"),
  migration: join(root, "supabase", "migrations", "20260727193000_member_role_removal_boundary.sql"),
  validation: join(root, "supabase", "validation", "021_member_role_removal_boundary_test.sql"),
  workflowSuite: join(root, "supabase", "validation", "supabase-workflows-suite.mjs"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 member role removal guarded action boundary", () => {
  it("adds a server-only guarded action and users server action adapter", () => {
    assert.ok(existsSync(files.contract), "role removal contract is missing");
    assert.ok(existsSync(files.migration), "role removal migration is missing");
    assert.ok(existsSync(files.validation), "role removal validation SQL is missing");

    const lowRiskAction = readFileSync(files.lowRiskAction, "utf8");
    const usersAction = readFileSync(files.usersAction, "utf8");

    for (const required of [
      "requestMemberRoleRemoval",
      "admin.member.role.remove.request",
      "members.manage",
      "api_remove_member_role",
      "role_removal_error",
      "requestMemberRoleRemovalServerAction"
    ]) {
      assert.match(
        `${lowRiskAction}\n${usersAction}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.match(usersAction, /revalidatePath\(\s*"\/admin\/users"\s*\)/);
    assert.doesNotMatch(usersAction, /\.insert\s*\(/);
    assert.doesNotMatch(usersAction, /\.update\s*\(/);
    assert.doesNotMatch(usersAction, /\.delete\s*\(/);
    assert.doesNotMatch(`${lowRiskAction}\n${usersAction}`, /SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("keeps membership_roles removal behind an authenticated permission-checked RPC", () => {
    const migration = readFileSync(files.migration, "utf8");
    const validation = readFileSync(files.validation, "utf8");

    for (const required of [
      "api_remove_member_role",
      "auth.uid()",
      "has_org_permission",
      "members.manage",
      "delete from public.membership_roles",
      "organization_memberships",
      "status <> 'ACTIVE'",
      "Self role removal is not enabled",
      "System role removal is not enabled",
      "Cannot remove the last member role",
      "admin.member.role.remove",
      "admin.member.role.remove.already_removed",
      "revoke execute",
      "grant execute",
      "member_role_removal_boundary"
    ]) {
      assert.match(
        `${migration}\n${validation}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
    assert.doesNotMatch(migration, /SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("documents non-scope and reconciles implementation status", () => {
    const contract = readFileSync(files.contract, "utf8");
    const status = readFileSync(files.status, "utf8");
    const workflowSuite = readFileSync(files.workflowSuite, "utf8");

    for (const required of [
      "A3-ACTION-ROLE-REMOVE-001",
      "No full role replacement",
      "No member deactivation",
      "No system-role removal",
      "No self-role removal",
      "No last-role removal",
      "NEXT: A3 role replacement/deactivation contract review",
      "021_member_role_removal_boundary_test.sql"
    ]) {
      assert.match(
        `${contract}\n${status}\n${workflowSuite}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.match(status, /A3-ACTION-ROLE-REMOVE-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER ROLE REMOVAL GUARDED ACTION BOUNDARY IMPLEMENTED/);
  });
});
