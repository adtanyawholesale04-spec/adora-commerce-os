import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const boundarySource = fs.readFileSync("src/lib/portal/contact-admin.ts", "utf8");
const migrationSource = fs.readFileSync(
  "supabase/migrations/20260728205449_customer_portal_auth_admin_apply_boundary.sql",
  "utf8",
);

test("customer contact Auth Admin apply stays server-only and retry-safe", () => {
  assert.match(boundarySource, /import ["']server-only["']/);
  assert.match(boundarySource, /createSupabaseAuthAdminClient/);
  assert.match(boundarySource, /auth\.admin\.getUserById/);
  assert.match(boundarySource, /auth\.admin\.updateUserById/);
  assert.match(boundarySource, /api_apply_customer_contact_change/);
  assert.match(boundarySource, /api_sync_applied_customer_contact_to_crm/);
  assert.match(boundarySource, /crmSyncResult/);
  assert.doesNotMatch(boundarySource, /use server/);
  assert.match(migrationSource, /status = 'APPLIED'/);
  assert.match(migrationSource, /api_record_customer_contact_change_apply_failure/);
  assert.match(migrationSource, /revoke all on function public\.api_apply_customer_contact_change/);
});
