import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const files = [
  join(root, "supabase", "validation", "020_member_role_assignment_boundary_test.sql"),
  join(root, "supabase", "validation", "021_member_role_removal_boundary_test.sql"),
  join(root, "supabase", "validation", "022_member_role_management_e2e_test.sql"),
  join(root, "supabase", "validation", "member-role-management-suite.mjs"),
  join(root, "docs", "testing", "A3_ROLE_MANAGEMENT_E2E_QA_REPORT.md"),
  join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
];

describe("A3 role management end-to-end QA", () => {
  it("keeps the focused lifecycle gate wired", () => {
    for (const file of files) assert.ok(existsSync(file), `${file} is missing`);

    const content = files.map((file) => readFileSync(file, "utf8")).join("\n");
    for (const required of [
      "api_assign_member_role",
      "api_remove_member_role",
      "role-derived product permission",
      "removed role-derived product permission still present",
      "member_role_management_e2e|pass",
      "member_role_management_suite pass",
      "A3-ROLE-MANAGEMENT-E2E-QA-001",
      "A3 role replacement/deactivation contract review"
    ]) {
      assert.match(content, new RegExp(escapeRegExp(required)), `${required} missing`);
    }
  });
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
