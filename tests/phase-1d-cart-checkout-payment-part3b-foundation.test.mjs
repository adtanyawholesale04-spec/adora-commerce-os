import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationName = readdirSync("supabase/migrations").find((name) =>
  /^\d{14}_phase_1d_checkout_foundation\.sql$/.test(name),
);

assert.ok(migrationName, "Supabase CLI-generated Phase 1D migration is missing");

const migration = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);
const report = readFileSync(
  "docs/migrations/MIGRATION_062_PHASE_1D_CHECKOUT_FOUNDATION_VALIDATION_2026-08-01.md",
  "utf8",
);

test("Part 3B uses one CLI timestamped additive foundation migration", () => {
  assert.equal(
    readdirSync("supabase/migrations").filter((name) =>
      /phase_1d_checkout_foundation/i.test(name),
    ).length,
    1,
  );
  assert.match(migration, /create table public\.organization_checkout_settings/);
  assert.match(migration, /create table public\.commerce_idempotency_keys/);
  assert.match(migration, /alter table public\.orders\s+add column source_cart_id uuid/);
  assert.match(migration, /alter table public\.inventory_reservations\s+add column order_item_id uuid/);
  assert.doesNotMatch(migration, /create table public\.(customers|products|orders|payments|carts)\b/i);
});

test("Part 3B stops on unsafe existing data before DDL", () => {
  assert.match(migration, /duplicate active Storefront carts/);
  assert.match(migration, /duplicate cart variants/);
  assert.match(migration, /one cart is linked to multiple orders/);
  assert.match(migration, /mismatched cart\/order item tenant or variant/);
  assert.match(migration, /duplicate active manual payment references/);
  assert.match(migration, /conflicting storefront\.checkout feature/);
  assert.match(migration, /target tables already exist/);
  assert.match(migration, /target columns already exist/);
});

test("Part 3B installs exact concurrency constraints and indexes", () => {
  for (const name of [
    "carts_one_active_storefront_customer_uidx",
    "cart_items_one_variant_per_cart_uidx",
    "orders_one_per_source_cart_uidx",
    "payment_transactions_active_manual_reference_uidx",
    "commerce_idempotency_customer_started_idx",
    "commerce_idempotency_state_expiry_idx",
  ]) {
    assert.match(migration, new RegExp(`\\b${name}\\b`));
  }
  assert.match(migration, /unique \(organization_id, operation, request_id\)/);
  assert.match(migration, /octet_length\(request_hash\) = 32/);
});

test("Part 3B protects idempotency state and private table access", () => {
  assert.match(migration, /create or replace function public\.protect_commerce_idempotency_key/);
  assert.match(migration, /Terminal commerce idempotency evidence is immutable/);
  assert.match(migration, /Commerce idempotency evidence is protected from deletion/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /revoke all on table public\.organization_checkout_settings[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /revoke all on table public\.commerce_idempotency_keys[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant delete/i);
});

test("Part 3B seeds capability only and leaves runtime closed", () => {
  assert.match(migration, /'storefront\.checkout'/);
  assert.match(migration, /on conflict \(code\) do nothing/);
  assert.doesNotMatch(migration, /insert into public\.organization_entitlements/i);
  assert.doesNotMatch(migration, /create (or replace )?function public\.api_/i);
  assert.doesNotMatch(migration, /provider[_-](intent|adapter|webhook)/i);
});

test("Part 3B status and validation evidence preserve the production gate", () => {
  assert.match(
    status,
    /PHASE 1D PART 3B FOUNDATION MIGRATION IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4C STAFF REVIEW FORWARD-ONLY MIGRATION CONTRACT REVIEW REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4C migration contract review, Staff Review SQL, guarded actions,[\s\S]*P16 remains mandatory for Production/,
  );
  assert.match(report, /LOCAL VALIDATED \/ PRODUCTION NOT APPLIED/);
  assert.match(report, new RegExp(migrationName.replace(".", "\\.")));
});
