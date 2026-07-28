import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  lowRiskAction: join(root, "src", "lib", "admin", "actions", "low-risk.ts"),
  usersAction: join(root, "src", "app", "admin", "users", "actions.ts"),
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_ROLE_ASSIGNMENT_GUARDED_ACTION_BOUNDARY.md"),
  migration: join(root, "supabase", "migrations", "20260727190000_member_role_assignment_boundary.sql"),
  validation: join(root, "supabase", "validation", "020_member_role_assignment_boundary_test.sql"),
  workflowSuite: join(root, "supabase", "validation", "supabase-workflows-suite.mjs"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 member role assignment guarded action boundary", () => {
  it("adds a server-only guarded action and users server action adapter", () => {
    assert.ok(existsSync(files.contract), "role assignment contract is missing");
    assert.ok(existsSync(files.migration), "role assignment migration is missing");
    assert.ok(existsSync(files.validation), "role assignment validation SQL is missing");

    const lowRiskAction = readFileSync(files.lowRiskAction, "utf8");
    const usersAction = readFileSync(files.usersAction, "utf8");

    for (const required of [
      "requestMemberRoleAssignment",
      "admin.member.role.assign.request",
      "members.manage",
      "api_assign_member_role",
      "role_assignment_error",
      "requestMemberRoleAssignmentServerAction"
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

  it("keeps membership_roles writes behind an authenticated permission-checked RPC", () => {
    const migration = readFileSync(files.migration, "utf8");
    const validation = readFileSync(files.validation, "utf8");

    for (const required of [
      "api_assign_member_role",
      "auth.uid()",
      "has_org_permission",
      "members.manage",
      "public.membership_roles",
      "organization_memberships",
      "status <> 'ACTIVE'",
      "Self role assignment is not enabled",
      "System role assignment is not enabled",
      "admin.member.role.assign",
      "admin.member.role.assign.duplicate_reused",
      "revoke execute",
      "grant execute",
      "member_role_assignment_boundary"
    ]) {
      assert.match(
        `${migration}\n${validation}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
    assert.doesNotMatch(migration, /delete\s+from\s+public\.membership_roles/i);
  });

  it("documents non-scope and reconciles implementation status", () => {
    const contract = readFileSync(files.contract, "utf8");
    const status = readFileSync(files.status, "utf8");
    const workflowSuite = readFileSync(files.workflowSuite, "utf8");

    for (const required of [
      "A3-ACTION-ROLE-ASSIGN-001",
      "Role removal is implemented in the separate role removal boundary and UI contracts",
      "No full role replacement",
      "No system-role assignment",
      "No self-role assignment",
      "NEXT: A3 role management end-to-end QA and status reconciliation",
      "020_member_role_assignment_boundary_test.sql"
    ]) {
      assert.match(
        `${contract}\n${status}\n${workflowSuite}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.match(status, /A3-ACTION-ROLE-ASSIGN-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER ROLE ASSIGNMENT GUARDED ACTION BOUNDARY IMPLEMENTED/);
  });
});
