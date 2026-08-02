import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminPage = readFileSync("src/app/admin/page.tsx", "utf8");
const paymentsPage = readFileSync("src/app/admin/payments/page.tsx", "utf8");
const i18n = readFileSync("src/lib/admin/i18n.ts", "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Local RC keeps Admin navigation permission-aware and localized", () => {
  assert.match(adminPage, /if \(!item\.allowed\)/);
  assert.match(adminPage, /aria-disabled="true"/);
  assert.match(adminPage, /sticky top-0 z-30/);
  assert.match(i18n, /navigation: \{/);
  assert.match(i18n, /dashboard: \{ label: "ภาพรวม"/);
  assert.match(i18n, /dashboard: \{ label: "Dashboard"/);
});

test("Payments tables expose consistent read-only empty states", () => {
  assert.match(paymentsPage, /function EmptyTableState/);
  assert.match(paymentsPage, /role="status"/);
  assert.match(paymentsPage, /message=\{copy\.noPayments\}/);
  assert.match(paymentsPage, /message=\{copy\.noTransactions\}/);
  assert.match(paymentsPage, /message=\{copy\.noRefunds\}/);
});

test("Local RC status keeps Production closed", () => {
  assert.match(status, /Local Release Candidate UI\/UX Pass 2026-08-02/);
  assert.match(status, /VALIDATED LOCALLY \/ PRODUCTION NOT APPLIED/);
  assert.match(status, /no schema, migration, payment mutation or provider change/);
});
