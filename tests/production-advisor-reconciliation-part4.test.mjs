import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const closurePath =
  "docs/security/ACOS_PRODUCTION_ADVISOR_RECONCILIATION_PART4_CLOSURE.md";
const statusPath = "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md";

test("Part 4 closes only the production database advisor gate", async () => {
  const closure = await readFile(closurePath, "utf8");

  assert.match(closure, /PRODUCTION VALIDATED \/ DATABASE GATE CLOSED/);
  assert.match(closure, /unexpected ERROR findings: 0/);
  assert.match(closure, /unexpected WARN findings: 0/);
  assert.match(closure, /accepted contract-backed WARN findings: 36/);
  assert.match(closure, /advisor WARN before reconciliation: 44/);
  assert.match(closure, /advisor WARN after reconciliation: 36/);
});

test("Part 4 freezes the critical production invariants", async () => {
  const closure = await readFile(closurePath, "utf8");

  for (const evidence of [
    "automatic RLS function denied to API roles: PASS",
    "ensure_rls event trigger active and postgres-owned: PASS",
    "has_org_permission active-profile guard: PASS",
    "pg_trgm and unaccent in extensions schema: PASS",
    "product trigram indexes present: PASS",
    "profiles RLS USING initplans present: PASS",
    "profiles direct UPDATE denied to anon/authenticated: PASS",
  ]) {
    assert.match(closure, new RegExp(evidence));
  }
});

test("Part 4 preserves the independent Phase 1B deployment blocker", async () => {
  const [closure, status] = await Promise.all([
    readFile(closurePath, "utf8"),
    readFile(statusPath, "utf8"),
  ]);

  assert.match(closure, /Vercel credential connection: BLOCKED BY PART 8F STATUS/);
  assert.match(closure, /production signup enablement: BLOCKED BY PART 8F STATUS/);
  assert.match(closure, /No secret\s+belongs in Git/);
  assert.match(status, /Phase 1B Platform-Led Signup Part 8F Production Readiness.*BLOCKED \/ OWNER INPUTS REQUIRED/);
});
