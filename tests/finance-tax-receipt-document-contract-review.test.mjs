import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_A_FINANCE_TAX_RECEIPT_DOCUMENT_CONTRACT_REVIEW.md",
  "utf8"
);
const migrations = fs
  .readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .map((file) => fs.readFileSync(`supabase/migrations/${file}`, "utf8"))
  .join("\n");

test("Finance & Tax receipt contract is blocked until rules and ER are frozen", () => {
  assert.match(contract, /BLOCKED \/ OWNER DECISIONS REQUIRED/);
  assert.match(contract, /no frozen Finance & Tax Phase 1E Business Rules/);
  assert.match(contract, /decision\s+table/i);
  assert.equal(
    fs.existsSync("docs/business-rules/BUSINESS_RULES_PHASE_1E_FINANCE_TAX_MVP.md"),
    false
  );
  assert.equal(
    fs.existsSync("docs/er/ER_ADDENDUM_PHASE_1E_FINANCE_TAX_MVP.md"),
    false
  );
});

test("review does not create a financial document source", () => {
  assert.doesNotMatch(
    migrations,
    /create table if not exists public\.(receipts|bills|tax_invoices|credit_notes|debit_notes)/i
  );
  assert.match(contract, /No new `receipts`, `bills`, `tax_invoices`/);
  assert.match(contract, /No direct writes to `orders`, `payments`/);
});
