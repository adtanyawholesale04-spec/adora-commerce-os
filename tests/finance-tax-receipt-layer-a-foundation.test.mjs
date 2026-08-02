import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260802182034_phase_1e_receipt_foundation.sql",
  "utf8",
);
const validation = fs.readFileSync(
  "supabase/validation/059_phase_1e_receipt_foundation_test.sql",
  "utf8",
);
const report = fs.readFileSync(
  "docs/migrations/MIGRATION_069_PHASE_1E_RECEIPT_FOUNDATION_VALIDATION_2026-08-03.md",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Receipt Layer A creates only the frozen immutable foundation", () => {
  assert.match(migration, /create table public\.finance_documents\s*\(/);
  assert.match(migration, /create table public\.finance_document_lines\s*\(/);
  assert.match(migration, /finance_documents_number_format_check/);
  assert.match(migration, /finance_documents_lifecycle_check/);
  assert.match(migration, /finance_documents_root_payment_uidx/);
  assert.match(migration, /finance_documents_protect/);
  assert.match(migration, /finance_document_lines_protect/);
  assert.doesNotMatch(migration, /api_create_receipt_document\s*\(/);
  assert.doesNotMatch(migration, /api_list_receipt_documents\s*\(/);
  assert.doesNotMatch(migration, /insert into public\.role_permissions/i);
});

test("Receipt Layer A remains closed to direct API-role access", () => {
  assert.match(migration, /alter table public\.finance_documents enable row level security/);
  assert.match(migration, /alter table public\.finance_document_lines enable row level security/);
  assert.match(migration, /revoke all on table public\.finance_documents[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(migration, /security invoker[\s\S]*set search_path = ''/);
  assert.match(migration, /next_document_number[\s\S]*security definer[\s\S]*set search_path = ''/);
  assert.match(validation, /Authenticated direct Receipt insert unexpectedly succeeded/);
  assert.match(validation, /Receipt snapshot update unexpectedly succeeded/);
  assert.match(validation, /Cross-tenant Receipt source unexpectedly succeeded/);
});

test("Receipt Layer A evidence keeps runtime and Production gated", () => {
  assert.match(report, /LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/);
  assert.match(report, /creates no Receipt row/);
  assert.match(report, /Layer B guarded Receipt create\/void\/reverse actions/);
  assert.match(status, /Migration 069 Phase 1E Receipt Foundation Validation/);
  assert.match(status, /NEXT SUBSTEP: OWNER APPROVAL FOR LAYER C STAFF AND CUSTOMER PORTAL RECEIPT READ BOUNDARIES/);
  assert.match(status, /Production apply remains unauthorized/);
});
