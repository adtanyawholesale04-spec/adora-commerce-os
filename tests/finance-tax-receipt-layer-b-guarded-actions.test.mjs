import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260802191541_phase_1e_receipt_guarded_actions.sql",
  "utf8",
);
const validation = fs.readFileSync(
  "supabase/validation/060_phase_1e_receipt_guarded_actions_test.sql",
  "utf8",
);
const raceSuite = fs.readFileSync(
  "supabase/validation/phase-1e-receipt-guarded-actions-suite.mjs",
  "utf8",
);
const packageJson = fs.readFileSync("package.json", "utf8");
const report = fs.readFileSync(
  "docs/migrations/MIGRATION_070_PHASE_1E_RECEIPT_GUARDED_ACTIONS_VALIDATION_2026-08-03.md",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Receipt Layer B exposes only the frozen authenticated mutation signatures", () => {
  assert.match(migration, /create function public\.api_create_receipt_document\(\s*p_organization_id uuid,\s*p_payment_id uuid,\s*p_request_id uuid,\s*p_replaces_document_id uuid default null\s*\)/s);
  assert.match(migration, /create function public\.api_void_receipt_document\(\s*p_organization_id uuid,\s*p_document_id uuid,\s*p_reason text,\s*p_request_id uuid\s*\)/s);
  assert.match(migration, /create function public\.api_reverse_receipt_document\(\s*p_organization_id uuid,\s*p_document_id uuid,\s*p_reason text,\s*p_request_id uuid,\s*p_refund_id uuid default null,\s*p_reversal_payment_transaction_id uuid default null\s*\)/s);
  assert.equal(migration.match(/security definer\s*set search_path = ''/g)?.length, 3);
  assert.equal(migration.match(/grant execute on function public\.api_(?:create|void|reverse)_receipt_document/g)?.length, 3);
  assert.doesNotMatch(migration, /grant execute[\s\S]{0,180}to (?:anon|service_role)/);
  assert.doesNotMatch(migration, /api_(?:list|get)_(?:customer_portal_)?receipt/);
  assert.doesNotMatch(migration, /insert into public\.role_permissions/i);
});

test("Receipt Layer B derives snapshots from locked canonical sources without mutating money masters", () => {
  assert.match(migration, /finance\.document\.create/);
  assert.match(migration, /finance\.document\.void/);
  assert.match(migration, /finance\.document\.reverse/);
  assert.match(migration, /from public\.payments[\s\S]*for update/);
  assert.match(migration, /from public\.orders[\s\S]*for update/);
  assert.match(migration, /from public\.payment_transactions[\s\S]*for update/);
  assert.match(migration, /from public\.order_items[\s\S]*for share/);
  assert.match(migration, /public\.next_document_number/);
  assert.match(migration, /insert into public\.audit_logs/g);
  assert.doesNotMatch(migration, /(?:insert into|update|delete from) public\.(?:orders|payments|payment_transactions|refunds|refund_transactions|customers)/i);
});

test("Receipt Layer B keeps idempotency, lifecycle races, tenant security and source immutability under validation", () => {
  assert.match(validation, /Anonymous actor unexpectedly created a Receipt/);
  assert.match(validation, /View-only actor unexpectedly created a Receipt/);
  assert.match(validation, /Cross-tenant actor unexpectedly reached a Receipt/);
  assert.match(validation, /Changed Receipt create intent unexpectedly reused request/);
  assert.match(validation, /Receipt boundary changed a canonical money source/);
  assert.match(raceSuite, /Same-request Receipt race failed/);
  assert.match(raceSuite, /Different-request Receipt race failed/);
  assert.match(raceSuite, /Receipt lifecycle race failed/);
  assert.match(raceSuite, /state = 'IN_PROGRESS'/);
  assert.match(packageJson, /validate:phase-1e-receipt-guarded-actions/);
  assert.match(report, /LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/);
  assert.match(report, /zero remote-only drift/);
  assert.match(status, /Migration 070 Phase 1E Receipt Guarded Actions Validation/);
  assert.match(status, /NEXT SUBSTEP: OWNER DECISION FOR RECEIPT PERMISSION ROLE MAPPING AND READ SERVICE\/UI INTEGRATION/);
});
