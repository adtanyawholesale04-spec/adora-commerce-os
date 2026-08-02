import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/portal/page.tsx", "utf8");
const readModel = fs.readFileSync("src/lib/portal/customer.ts", "utf8");
const actions = fs.readFileSync("src/app/portal/actions.ts", "utf8");
const contract = fs.readFileSync(
  "docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_PART3_DASHBOARD_EXPERIENCE.md",
  "utf8"
);

test("portal dashboard exposes stable responsive navigation", () => {
  assert.match(page, /function MobilePortalNavigation/);
  assert.match(page, /fixed inset-x-0 bottom-0/);
  assert.match(page, /md:hidden/);
  assert.match(page, /href: "#portal-home"/);
  assert.match(page, /href: "#portal-orders"/);
  assert.match(page, /href: "#portal-notifications"/);
  assert.match(page, /href: "#portal-account"/);
  assert.match(page, /grid grid-cols-2 gap-3 lg:grid-cols-4/);
});

test("portal order presentation respects locale and visible statuses", () => {
  assert.match(page, /function OrderStatusBadge/);
  assert.match(page, /formatDate\(order\.created_at, locale\)/);
  assert.match(page, /formatMoney\(Number\(order\.grand_total\), order\.currency_code, locale\)/);
  assert.match(page, /locale === "th" \? "th-TH" : "en-US"/);
  assert.match(page, /Number\(order\.amount_due\) > 0 \? text\.due : text\.paid/);
});

test("Part 3 preserves existing ownership-scoped read and guarded write boundaries", () => {
  assert.match(readModel, /rpc\("api_get_customer_portal_snapshot"/);
  assert.match(readModel, /rpc\("api_get_customer_portal_notifications"/);
  assert.match(actions, /api_create_customer_portal_address/);
  assert.match(actions, /api_update_customer_portal_consent/);
  assert.match(contract, /No migration, schema, RLS, permission, entitlement, event, audit, or ledger change/);
  assert.doesNotMatch(page, /\.from\(/);
});
