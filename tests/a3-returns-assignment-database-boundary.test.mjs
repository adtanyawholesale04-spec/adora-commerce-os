import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const statusPath = path.join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");
const boundaryPath = path.join(root, "docs", "api-contracts", "A3_RETURNS_ASSIGNMENT_DATABASE_BOUNDARY.md");
const migrationPath = path.join(root, "supabase", "migrations", "20260728152602_a3_returns_assignment_boundary.sql");
const validationPath = path.join(root, "supabase", "validation", "028_returns_assignment_boundary_test.sql");

test("Returns assignment database boundary is wired to the approved migration and validation", () => {
  const status = fs.readFileSync(statusPath, "utf8");
  const boundary = fs.readFileSync(boundaryPath, "utf8");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const validation = fs.readFileSync(validationPath, "utf8");
  assert.match(status, /A3-RETURNS-ASSIGNMENT-002.*VALIDATED/);
  assert.match(boundary, /api_assign_return/);
  assert.match(migration, /returns_assignee_membership_fk/);
  assert.match(migration, /return\.manage/);
  assert.match(migration, /v_coverage_gaps text\[\] := '\{\}'::text\[\]/);
  assert.match(validation, /select 'returns_assignment_boundary' as check_name, 'pass' as result/);
});
