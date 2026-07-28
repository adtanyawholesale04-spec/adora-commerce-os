import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const pageSource = fs.readFileSync(path.join(root, "src", "app", "portal", "page.tsx"), "utf8");
const adapterSource = fs.readFileSync(path.join(root, "src", "lib", "portal", "customer.ts"), "utf8");

test("Customer Portal remains read-only and server-bound", () => {
  assert.match(adapterSource, /rpc\("api_get_customer_portal_snapshot"/);
  assert.doesNotMatch(pageSource, /\.from\(/);
  assert.doesNotMatch(pageSource, /\.insert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(adapterSource, /\.from\(/);
  assert.doesNotMatch(adapterSource, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(pageSource, /readOnly:/);
  assert.match(pageSource, /notLinked:/);
});
