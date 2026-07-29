import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/lib/portal/contact-admin.ts", import.meta.url),
  "utf8"
);
const status = await readFile(
  new URL("../docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", import.meta.url),
  "utf8"
);

test("Auth Admin apply integrates CRM sync without widening the server boundary", () => {
  assert.match(source, /import "server-only"/);
  assert.match(source, /api_apply_customer_contact_change/);
  assert.match(source, /api_sync_applied_customer_contact_to_crm/);
  assert.match(source, /request\.status === "APPLIED"[\s\S]*completeCrmSync/);
  assert.match(source, /crmSyncResult: "persistence_error"/);
  assert.match(source, /crmSyncRetryable: true/);
  assert.doesNotMatch(source, /use server|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|console\.(log|error)/);
  assert.match(status, /PART 3 CRM CONTACT SYNC SERVER INTEGRATION IMPLEMENTED \/ VALIDATED/);
  assert.match(status, /PART 4 CUSTOMER PORTAL CONTACT WORKFLOW VALIDATED/);
  assert.match(status, /NEXT: Platform-Led Signup contract review under Phase 1B/);
});
