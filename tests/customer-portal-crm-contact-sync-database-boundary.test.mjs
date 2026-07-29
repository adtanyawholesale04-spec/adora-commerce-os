import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("CRM contact sync database boundary follows the frozen decisions", async () => {
  const [migration, validation, status, packageJson] = await Promise.all([
    read("supabase/migrations/20260729123502_customer_portal_crm_contact_sync_boundary.sql"),
    read("supabase/validation/043_customer_portal_crm_contact_sync_boundary_test.sql"),
    read("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md"),
    read("package.json")
  ]);

  assert.match(migration, /api_sync_applied_customer_contact_to_crm/);
  assert.match(migration, /current_setting\('request\.jwt\.claim\.role'.*service_role/);
  assert.match(migration, /status <> 'APPLIED'/);
  assert.match(migration, /customer_profile_links/);
  assert.match(migration, /crm_contact_conflict/);
  assert.match(migration, /crm_duplicate_contact_conflict/);
  assert.match(migration, /CUSTOMER_CONTACT_CRM_SYNC/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(migration, /insert into public\.(customer_consents|customer_suppressions|customer_identities)/);

  for (const evidence of [
    "already_matching",
    "crm_contact_conflict",
    "crm_duplicate_contact_conflict",
    "customer_not_active",
    "customer_link_not_active",
    "contact_request_not_applied",
    "raw contact leaked into audit",
    "consent changed during CRM sync",
    "suppression changed during CRM sync",
    "customer identity changed during CRM sync",
    "authenticated execution unexpectedly succeeded",
    "anonymous execution unexpectedly succeeded"
  ]) {
    assert.ok(validation.includes(evidence), `${evidence} validation missing`);
  }

  assert.match(status, /PART 2 CRM CONTACT SYNC DATABASE BOUNDARY IMPLEMENTED \/ VALIDATED/);
  assert.match(packageJson, /validate:customer-portal-crm-contact-sync/);
});
