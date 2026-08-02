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

test("receipt/bill Portal work records the missing canonical dependency", () => {
  assert.match(contract, /BLOCKED \/ DEPENDENCY REQUIRED/);
  assert.match(contract, /does not currently contain a canonical `receipts`/);
  assert.match(contract, /No migration, RPC, view, grant, RLS policy/);
  assert.match(contract, /Finance & Tax MVP business rules/);
});

test("receipt/bill review does not invent a financial source or UI", () => {
  assert.doesNotMatch(migrations, /create table if not exists public\.(receipts|bills|tax_invoices)/i);
  assert.doesNotMatch(page, /receiptStatus|billStatus|invoiceNumber/i);
});
