import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(
  "supabase/migrations/20260730194013_phase_1c_storefront_boundary.sql",
  "utf8",
);
const functions = readFileSync(
  "supabase/migrations/20260730194153_phase_1c_storefront_guarded_functions.sql",
  "utf8",
);
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1C_STOREFRONT_PART3_DATABASE_BOUNDARY.md",
  "utf8",
);

test("Part 3 adds only the approved Storefront entities and default-deny feature", () => {
  for (const table of [
    "organization_storefronts",
    "storefront_product_listings",
    "storefront_slug_history",
  ]) {
    assert.match(schema, new RegExp(`create table public\\.${table}`));
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(schema, /publication_status varchar\(20\) not null default 'PRIVATE'/);
  assert.match(schema, /visibility varchar\(20\) not null default 'HIDDEN'/);
  assert.match(schema, /'storefront',\s+'Storefront'/);
  assert.doesNotMatch(schema, /insert into public\.plan_features/i);
});

test("Part 3 keeps mutations guarded and public reads server-only", () => {
  for (const action of [
    "api_upsert_storefront_settings",
    "api_set_storefront_product_listing",
    "api_set_storefront_publication",
    "api_change_storefront_slug",
  ]) {
    assert.match(
      functions,
      new RegExp(`create or replace function public\\.${action}[\\s\\S]*?security definer`),
    );
  }
  for (const read of [
    "api_get_public_storefront",
    "api_list_public_storefront_products",
    "api_get_public_storefront_product",
    "api_list_public_storefront_product_variants",
  ]) {
    assert.match(
      functions,
      new RegExp(`create or replace function public\\.${read}[\\s\\S]*?security invoker`),
    );
  }
  assert.match(functions, /grant execute on function public\.api_get_public_storefront\(text\)\s+to service_role/);
  assert.match(contract, /PRODUCTION NOT APPLIED/);
  assert.match(contract, /no public Storefront route enabled/);
  assert.match(contract, /P16 remains a production activation blocker/);
});
