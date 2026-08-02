import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/portal/page.tsx", "utf8");
const readModel = fs.readFileSync("src/lib/portal/customer.ts", "utf8");
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_PART4_ORDER_DETAIL_READONLY.md",
  "utf8"
);

test("order detail stays within the existing portal snapshot", () => {
  assert.match(readModel, /rpc\("api_get_customer_portal_snapshot"/);
  assert.match(page, /<details key=\{order\.id\}/);
  assert.match(page, /<summary className=/);
  assert.match(page, /order\.payment_status/);
  assert.match(page, /order\.fulfillment_status/);
  assert.match(page, /item\.product_name/);
  assert.match(page, /item\.line_total/);
  assert.doesNotMatch(page, /supabase/);
  assert.doesNotMatch(page, /\.from\(/);
});

test("order detail preserves accessibility and bilingual formatting", () => {
  assert.match(page, /focus-visible:ring-2 focus-visible:ring-brand/);
  assert.match(page, /orderDetails: "ดูรายละเอียด"/);
  assert.match(page, /orderDetails: "View details"/);
  assert.match(page, /formatDate\(order\.created_at, locale\)/);
  assert.match(page, /formatMoney\(Number\(item\.line_total\), order\.currency_code, locale\)/);
  assert.match(contract, /No new RPC, table, view, migration, grant, RLS policy/);
});

