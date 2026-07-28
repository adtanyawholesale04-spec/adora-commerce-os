import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("carrier webhook local runtime boundary", () => {
  it("keeps host-published Supabase API reachable from the Edge Runtime container", () => {
    const functionSource = readFileSync(
      join(root, "supabase", "functions", "carrier-webhook", "index.ts"),
      "utf8"
    );
    const e2eSource = readFileSync(
      join(root, "supabase", "validation", "carrier-webhook-e2e.mjs"),
      "utf8"
    );

    for (const required of [
      "normalizeSupabaseUrl",
      "host.docker.internal",
      "containerReachableUrl",
      "CARRIER_WEBHOOK_SUPABASE_URL"
    ]) {
      assert.match(`${functionSource}\n${e2eSource}`, new RegExp(escapeRegExp(required)));
    }

    assert.match(functionSource, /webhook_log_insert_failed/);
    assert.doesNotMatch(functionSource, /SUPABASE_SERVICE_ROLE_KEY.*jsonResponse/i);
  });
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
