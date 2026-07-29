import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractPath =
  "docs/security/ACOS_PRODUCTION_ADVISOR_RECONCILIATION_PART3_EXTENSION_RLS_REVIEW.md";
const extensionProofPath =
  "supabase/validation/037_extension_relocation_dry_run.sql";
const rlsProofPath =
  "supabase/validation/038_profiles_rls_initplan_dry_run.sql";
const migrationPath =
  "supabase/migrations/20260729184744_reconcile_extensions_and_profiles_rls_initplan.sql";

test("Part 3 records extension dependencies and rollback proof", async () => {
  const [contract, proof] = await Promise.all([
    readFile(contractPath, "utf8"),
    readFile(extensionProofPath, "utf8"),
  ]);

  assert.match(contract, /products_name_trgm_idx/);
  assert.match(contract, /product_variants_name_trgm_idx/);
  assert.match(contract, /MOVE pg_trgm TO extensions/);
  assert.match(contract, /MOVE unaccent TO extensions/);
  assert.match(proof, /alter extension pg_trgm set schema extensions/);
  assert.match(proof, /alter extension unaccent set schema extensions/);
  assert.match(proof, /rollback;/);
});

test("Part 3 preserves profiles RLS semantics with initplans", async () => {
  const [contract, proof] = await Promise.all([
    readFile(contractPath, "utf8"),
    readFile(rlsProofPath, "utf8"),
  ]);

  assert.match(contract, /auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(contract, /must not add or change table grants/);
  assert.match(proof, /using \(auth_user_id = \(select auth\.uid\(\)\)\)/);
  assert.match(
    proof,
    /with check \(auth_user_id = \(select auth\.uid\(\)\)\)/,
  );
  assert.match(proof, /cross-user update expected 0 rows/);
  assert.match(proof, /rollback;/);
});

test("Part 3 implements the approved migration without widening grants", async () => {
  const [contract, migration] = await Promise.all([
    readFile(contractPath, "utf8"),
    readFile(migrationPath, "utf8"),
  ]);

  assert.match(
    contract,
    /20260729184744_reconcile_extensions_and_profiles_rls_initplan\.sql/,
  );
  assert.match(migration, /alter extension pg_trgm set schema extensions/);
  assert.match(migration, /alter extension unaccent set schema extensions/);
  assert.match(migration, /using \(auth_user_id = \(select auth\.uid\(\)\)\)/);
  assert.match(
    migration,
    /with check \(auth_user_id = \(select auth\.uid\(\)\)\)/,
  );
  assert.doesNotMatch(migration, /\bgrant\b/i);
  assert.match(contract, /explicit production push approval/);
  assert.match(contract, /total WARN: 40 -> 36/);
});

test("Part 3 records the verified production disposition", async () => {
  const contract = await readFile(contractPath, "utf8");

  assert.match(contract, /\*\*Status:\*\* PRODUCTION VALIDATED/);
  assert.match(contract, /linked migration 20260729184744: APPLIED/);
  assert.match(contract, /authenticated profiles UPDATE grant: DENIED/);
  assert.match(contract, /extension_in_public: 0/);
  assert.match(contract, /auth_rls_initplan: 0/);
  assert.match(contract, /total WARN: 36/);
});
