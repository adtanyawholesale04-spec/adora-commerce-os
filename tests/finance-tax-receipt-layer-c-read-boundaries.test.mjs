import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260802200637_phase_1e_receipt_read_boundaries.sql",
  "utf8",
);
const validation = fs.readFileSync(
  "supabase/validation/061_phase_1e_receipt_read_boundaries_test.sql",
  "utf8",
);
const suite = fs.readFileSync(
  "supabase/validation/phase-1e-receipt-read-boundaries-suite.mjs",
  "utf8",
);
const packageJson = fs.readFileSync("package.json", "utf8");
const report = fs.readFileSync(
  "docs/migrations/MIGRATION_071_PHASE_1E_RECEIPT_READ_BOUNDARIES_VALIDATION_2026-08-03.md",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Receipt Layer C exposes only the four frozen authenticated read signatures", () => {
  assert.match(migration, /create function public\.api_list_receipt_documents\([\s\S]*?p_limit integer default 25[\s\S]*?\)\s*returns jsonb/);
  assert.match(migration, /create function public\.api_get_receipt_document\(\s*p_organization_id uuid,\s*p_document_id uuid\s*\)/s);
  assert.match(migration, /create function public\.api_list_customer_portal_receipts\([\s\S]*?p_limit integer default 20[\s\S]*?\)\s*returns jsonb/);
  assert.match(migration, /create function public\.api_get_customer_portal_receipt\(\s*p_organization_id uuid,\s*p_document_id uuid\s*\)/s);
  assert.equal(migration.match(/security definer\s*set search_path = ''/g)?.length, 4);
  assert.equal(migration.match(/grant execute on function public\.api_(?:list|get)_(?:customer_portal_)?receipt/g)?.length, 4);
  assert.doesNotMatch(migration, /grant execute[\s\S]{0,180}to (?:anon|service_role)/);
  assert.doesNotMatch(migration, /(?:create|alter) table|insert into public\.permissions|insert into public\.role_permissions/i);
});

test("Receipt Layer C enforces permission, active ownership, privacy and sanitized detail audit", () => {
  assert.match(migration, /finance\.document\.view/);
  assert.match(migration, /link\.link_status = 'ACTIVE'/);
  assert.match(migration, /document\.customer_id = v_customer_id/);
  assert.match(migration, /p_limit < 1 or p_limit > 100/g);
  assert.match(migration, /\(document\.issued_at, document\.id\) < \(p_before_issued_at, p_before_id\)/g);
  assert.equal(migration.match(/'RECEIPT_VIEWED'/g)?.length, 2);
  assert.doesNotMatch(migration, /jsonb_build_object\([\s\S]{0,100}'payment_transaction_id'/);
  assert.match(validation, /Staff without finance\.document\.view listed Receipts/);
  assert.match(validation, /Portal Receipt detail ownership, privacy, or unavailable shape differs/);
  assert.match(validation, /Receipt reads changed business state or audit cardinality differs/);
  assert.match(suite, /supabase[\s\S]*db[\s\S]*reset[\s\S]*--local/);
  assert.match(suite, /runSupabaseDbLint/);
  assert.match(packageJson, /validate:phase-1e-receipt-read-boundaries/);
  assert.match(report, /LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/);
  assert.match(report, /zero remote-only drift/);
  assert.match(status, /Migration 071 Phase 1E Receipt Read Boundaries Validation/);
  assert.match(status, /CURRENT SUBSTEP: PHASE 1E RECEIPT ROLE MAPPING OWNER DECISION REQUIRED \/ RM01-RM24 PREPARED/);
  assert.match(status, /NEXT SUBSTEP: OWNER APPROVAL OR AMENDMENT FOR RECEIPT ROLE MAPPING RM01-RM24/);
});
