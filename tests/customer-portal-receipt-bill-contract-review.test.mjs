import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_PART5_RECEIPT_BILL_READONLY_CONTRACT_REVIEW.md",
  "utf8"
);
const page = fs.readFileSync("src/app/portal/page.tsx", "utf8");
const migrations = fs
  .readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .map((file) => fs.readFileSync(`supabase/migrations/${file}`, "utf8"))
  .join("\n");

test("receipt/bill Portal work records the validated read dependency and remaining UI gate", () => {
  assert.match(contract, /READ BOUNDARY LOCAL VALIDATED \/ PORTAL UI GATED/);
  assert.match(contract, /canonical immutable Receipt sources/);
  assert.match(contract, /Layer C active-customer-owned read RPCs/);
  assert.match(contract, /No new migration, RPC, view, grant, RLS policy/);
  assert.match(contract, /server-only read-service integration/);
});

test("receipt/bill review does not invent a financial source or UI", () => {
  assert.doesNotMatch(migrations, /create table if not exists public\.(receipts|bills|tax_invoices)/i);
  assert.doesNotMatch(page, /receiptStatus|billStatus|invoiceNumber/i);
});
