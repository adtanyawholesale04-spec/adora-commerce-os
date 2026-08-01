import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260801103336_phase_1d_manual_payment_staff_review_reads.sql",
  "utf8",
);
const sqlValidation = readFileSync(
  "supabase/validation/056_phase_1d_manual_payment_staff_review_reads_test.sql",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4D Layer A creates only the frozen private read signatures", () => {
  assert.match(
    migration,
    /create function public\.api_list_storefront_payment_reviews\([\s\S]*returns jsonb/,
  );
  assert.match(
    migration,
    /create function public\.api_get_storefront_payment_review\([\s\S]*returns jsonb/,
  );
  assert.doesNotMatch(migration, /create function public\.api_(verify|reject)_storefront_payment/);
  assert.doesNotMatch(migration, /\b(insert into|update|delete from) public\.(payments|payment_transactions|payment_proofs|orders|audit_logs|commerce_idempotency_keys)\b/i);
});

test("both reads are hardened and expose only exact authenticated execution", () => {
  assert.equal((migration.match(/stable\s+security definer\s+set search_path = ''/g) ?? []).length, 2);
  assert.match(
    migration,
    /revoke all on function public\.api_list_storefront_payment_reviews[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    migration,
    /revoke all on function public\.api_get_storefront_payment_review[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.equal((migration.match(/\) to authenticated;/g) ?? []).length, 2);
});

test("queue is reference-free, bounded and keyset ordered", () => {
  assert.match(migration, /least\(50, greatest\(1, coalesce\(p_limit, 25\)\)\)/);
  assert.match(migration, /order by pp\.submitted_at, pt\.id/);
  assert.match(migration, /'next_cursor'/);
  const queueBody = migration.split("create function public.api_get_storefront_payment_review")[0];
  assert.doesNotMatch(queueBody, /'payment_reference'/);
  assert.match(sqlValidation, /First keyset page or self-review affordance failed/);
  assert.match(sqlValidation, /View-only queue contract failed/);
});

test("detail is non-enumerating and returns only the approved private allowlist", () => {
  assert.match(migration, /not public\.has_org_permission\(p_organization_id, 'payment\.view'\)/);
  assert.match(migration, /not public\.has_org_permission\(p_organization_id, 'payment\.verify'\)/);
  assert.match(migration, /return jsonb_build_object\('available', false\)/);
  assert.match(migration, /'payment_reference', upper\(btrim\(pt\.external_reference\)\)/);
  assert.match(sqlValidation, /Cross-tenant or missing detail enumerated data/);
  assert.match(sqlValidation, /Private detail allowlist\/eligibility failed/);
});

test("Layer A validation proves no business write and advances status only to Layer B review", () => {
  assert.match(sqlValidation, /Staff Review reads mutated evidence/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-C PRIVATE REVIEW DETAIL UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-C private detail UI,[\s\S]*P16 remains mandatory for Production/,
  );
});
