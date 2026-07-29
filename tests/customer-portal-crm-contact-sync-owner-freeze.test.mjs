import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const freezePath = new URL(
  "../docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_CRM_CONTACT_SYNC_OWNER_DECISION_FREEZE.md",
  import.meta.url
);

test("CRM contact sync Owner freeze preserves every protected decision", async () => {
  const freeze = await readFile(freezePath, "utf8");

  for (const required of [
    "OWNER APPROVED / FROZEN",
    "Explicit server-only sync",
    "Never overwrite automatically",
    "Allow guarded fill",
    "idempotent success",
    "Block and require same-organization identity/merge review",
    "Update the selected raw and normalized pair atomically",
    "Allow only `ACTIVE`",
    "Do not copy, grant, revoke, or retarget consent",
    "Do not clear or migrate suppression",
    "Do not create or rewrite identity rows",
    "never raw contact values",
    "Service-role-only",
    "Keep Auth apply intact"
  ]) {
    assert.ok(freeze.includes(required), `${required} missing from frozen decisions`);
  }

  assert.match(freeze, /Part 2 Status:\*\* IMPLEMENTED \/ VALIDATED/);
  assert.match(freeze, /No CRM contact write is enabled|does not itself\s+enable a database write/);
});
