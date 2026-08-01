import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260801054812_phase_1d_manual_payment_guarded_payment_snapshot.sql",
  "utf8",
);
const validation = readFileSync(
  "supabase/validation/055_phase_1d_manual_payment_guarded_payment_snapshot_test.sql",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3D-A3 exposes only the frozen authenticated read RPC", () => {
  assert.match(
    migration,
    /api_get_storefront_order_payment_snapshot\(\s*p_organization_id uuid,\s*p_order_id uuid/s,
  );
  assert.match(migration, /language plpgsql\s+stable\s+security definer\s+set search_path = ''/i);
  assert.match(
    migration,
    /revoke all on function public\.api_get_storefront_order_payment_snapshot[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.api_get_storefront_order_payment_snapshot[\s\S]*to authenticated/i,
  );
  assert.doesNotMatch(migration, /grant execute[\s\S]*to (anon|service_role)/i);
});

test("Part 3D-A3 enforces identity, ownership and canonical payment consistency", () => {
  for (const source of [
    "public.profiles",
    "public.organization_memberships",
    "public.customer_profile_links",
    "public.customers",
    "public.orders",
    "public.payments",
  ]) {
    assert.match(migration, new RegExp(source.replace(".", "\\.")));
  }
  assert.match(migration, /o\.customer_id = v_customer_id/);
  assert.match(migration, /o\.source = 'STOREFRONT'/);
  assert.match(migration, /return jsonb_build_object\('available', false\)/);
  assert.match(migration, /PAYMENT_STATE_INCONSISTENT/);
});

test("Part 3D-A3 returns the exact privacy-bounded shape without writes", () => {
  for (const key of [
    "order_number",
    "order_status",
    "payment_status",
    "fulfillment_status",
    "currency_code",
    "grand_total",
    "amount_due",
    "payment_due_at",
    "pending_attempt",
    "proof_status",
  ]) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.doesNotMatch(migration, /\b(insert into|update|delete from)\b/i);
  assert.match(validation, /SECRET-REFERENCE-001/);
  assert.match(validation, /guarded read mutated evidence tables/);
  assert.match(validation, /non-enumerating unavailable contract failed/);
});

test("Part 3D-A3 status records local validation and preserves Production gate", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B STAFF REVIEW SERVICE CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE FOR RV01-RV24 REQUIRES OWNER APPROVAL/,
  );
  assert.match(status, /P16 remains mandatory for Production/);
});
