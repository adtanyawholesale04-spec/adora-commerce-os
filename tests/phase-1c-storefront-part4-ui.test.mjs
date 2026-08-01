import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("src/lib/storefront/service.ts", "utf8");
const storePage = readFileSync(
  "src/app/store/[organizationSlug]/page.tsx",
  "utf8",
);
const productPage = readFileSync(
  "src/app/store/[organizationSlug]/products/[productHandle]/page.tsx",
  "utf8",
);
const actions = readFileSync("src/app/store/actions.ts", "utf8");
const i18n = readFileSync("src/lib/storefront/i18n.ts", "utf8");
const network = readFileSync(
  "src/app/store/_components/storefront-network-status.tsx",
  "utf8",
);
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1C_STOREFRONT_PART4_READ_ONLY_UI.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 4 keeps every public read behind the server-only Storefront RPC adapter", () => {
  assert.match(service, /^import "server-only";/);
  assert.match(service, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.match(service, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(service, /NEXT_PUBLIC_SUPABASE_SECRET/);
  assert.doesNotMatch(service, /\.from\(/);

  for (const rpc of [
    "api_get_public_storefront",
    "api_list_public_storefront_products",
    "api_get_public_storefront_product",
    "api_list_public_storefront_product_variants",
  ]) {
    assert.match(service, new RegExp(`\\.rpc\\("${rpc}"`));
  }
});

test("Part 4 implements canonical read-only list and detail routes", () => {
  assert.match(storePage, /robots: \{ index: false, follow: false \}/);
  assert.match(productPage, /robots: \{ index: false, follow: false \}/);
  assert.match(storePage, /permanentRedirect\(/);
  assert.match(productPage, /permanentRedirect\(/);
  assert.match(storePage, /notFound\(\)/);
  assert.match(productPage, /notFound\(\)/);
  assert.match(storePage, /generateMetadata[\s\S]*?model\.state === "unavailable"[\s\S]*?notFound\(\)/);
  assert.match(productPage, /generateMetadata[\s\S]*?model\.state === "unavailable"[\s\S]*?notFound\(\)/);
  assert.match(storePage, /product-placeholder\.png/);
  assert.match(productPage, /product-placeholder\.png/);
  assert.ok(
    existsSync("public/storefront/product-placeholder.png"),
    "controlled product placeholder must exist",
  );
});

test("Part 4 remains read-only and keeps deferred conversion actions disabled", () => {
  assert.match(storePage, /<DisabledAction/);
  assert.match(storePage, /disabled/);
  assert.match(productPage, /type="button"\s+disabled/);
  assert.doesNotMatch(storePage, /signup|checkout|payment/i);
  assert.doesNotMatch(productPage, /href=.*(?:checkout|payment|signup)/i);
  assert.doesNotMatch(actions, /supabase|\.rpc\(|\.from\(/i);
});

test("Part 4 supports Thai, English, light, dark, loading, offline and retry states", () => {
  assert.match(i18n, /th: \{/);
  assert.match(i18n, /en: \{/);
  assert.match(i18n, /สินค้าทั้งหมด/);
  assert.match(i18n, /All products/);
  assert.match(actions, /ADMIN_THEME_COOKIE/);
  assert.match(actions, /ADMIN_LOCALE_COOKIE/);
  assert.match(network, /window\.addEventListener\("offline"/);
  assert.ok(
    existsSync("src/app/store/[organizationSlug]/loading.tsx"),
    "Storefront loading state must exist",
  );
  assert.ok(
    existsSync("src/app/store/[organizationSlug]/not-found.tsx"),
    "Storefront not-found state must exist",
  );
});

test("Part 4 keeps browser preference redirects inside normalized Storefront routes", () => {
  assert.match(actions, /safeStorefrontReturnPath/);
  assert.match(actions, /\^\\\/store\\\//);
  assert.match(actions, /redirect\(returnPath\)/);
});

test("Part 4 records local completion without opening production", () => {
  assert.match(contract, /\*\*Status:\*\* IMPLEMENTED \/ LOCAL VALIDATED/);
  assert.match(contract, /\*\*Production:\*\* NOT ACTIVATED \/ BLOCKED BY P16/);
  assert.match(
    status,
    /PHASE 1C PART 5 RESPONSIVE, ACCESSIBILITY AND CONTROLLED-PREVIEW QA VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4C OWNER DECISION FREEZE FOR RM01-RM30 REQUIRES OWNER APPROVAL/,
  );
});
