import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260729181733_production_advisor_critical_exposure_hardening.sql";
const contractPath =
  "docs/security/ACOS_PRODUCTION_ADVISOR_RECONCILIATION_PART1_CRITICAL_EXPOSURE_HARDENING.md";

test("Part 1 revokes automatic RLS execution from browser-facing roles", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /to_regprocedure\('public\.rls_auto_enable\(\)'\)/);
  assert.match(
    migration,
    /revoke execute on function public\.rls_auto_enable\(\).*from public, anon, authenticated/s,
  );
  assert.doesNotMatch(migration, /drop\s+event\s+trigger/i);
  assert.doesNotMatch(migration, /drop\s+function/i);
});
test("Part 1 fixes helper search paths without replacing function bodies", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(
    migration,
    /alter function public\.set_updated_at\(\)\s+set search_path = pg_catalog/i,
  );
  assert.match(
    migration,
    /alter function public\.prevent_update_delete\(\)\s+set search_path = pg_catalog/i,
  );
  assert.doesNotMatch(migration, /create\s+or\s+replace\s+function/i);
});

test("Part 1 contract keeps guarded RPC and Vercel work out of scope", async () => {
  const contract = await readFile(contractPath, "utf8");

  assert.match(contract, /No function body, trigger binding, table policy/);
  assert.match(contract, /36 authenticated guarded\/helper RPC findings/);
  assert.match(contract, /connect Vercel credentials/);
  assert.match(contract, /After an explicitly approved production push/);
});
