import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const checkout = readFileSync("src/lib/storefront/checkout.ts", "utf8");
const attribution = readFileSync(
  "src/lib/storefront/checkout-attribution.ts",
  "utf8",
);
const actions = readFileSync("src/app/store/actions.ts", "utf8");
const environment = readFileSync(".env.example", "utf8");
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_PART3E_SERVER_APPLICATION_RUNTIME_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("R01-R24 are Owner-frozen for local-only runtime", () => {
  assert.match(contract, /OWNER FROZEN \/ R01-R24 APPROVED \/ IMPLEMENTED LOCALLY/);
  assert.match(contract, /Project Owner approved the recommended values for R01-R24/);
  assert.match(contract, /did[\s\S]*not authorize manual payment, a provider, public activation/);
});

test("customer checkout uses the cookie session and fails closed", () => {
  assert.match(checkout, /import "server-only"/);
  assert.match(checkout, /createSupabaseServerClient/);
  assert.match(checkout, /client\.auth\.getUser\(\)/);
  assert.match(checkout, /api_resolve_storefront_cart/);
  assert.match(checkout, /api_set_storefront_cart_item/);
  assert.match(checkout, /api_remove_storefront_cart_item/);
  assert.match(checkout, /api_start_storefront_checkout/);
  assert.match(checkout, /api_submit_storefront_checkout/);
  assert.doesNotMatch(checkout, /createSupabaseAuthAdminClient|SUPABASE_(SECRET|SERVICE_ROLE)/);
});

test("flags default disabled and the kill switch wins", () => {
  assert.match(environment, /ACOS_STOREFRONT_CHECKOUT_ENABLED=false/);
  assert.match(environment, /ACOS_STOREFRONT_CHECKOUT_KILL_SWITCH=true/);
  assert.match(checkout, /ACOS_STOREFRONT_CHECKOUT_ENABLED === "true"/);
  assert.match(checkout, /ACOS_STOREFRONT_CHECKOUT_KILL_SWITCH !== "true"/);
});

test("checkout exposes bounded results and preserves retry intent", () => {
  assert.match(checkout, /CHECKOUT_REPRICE_REQUIRED/);
  assert.match(checkout, /REQUEST_IN_PROGRESS/);
  assert.match(checkout, /IDEMPOTENCY_CONFLICT/);
  assert.match(checkout, /parseCheckoutSuccess/);
  assert.doesNotMatch(checkout, /console\.(log|error)|window\.|localStorage/);
  assert.match(actions, /requestId: String\(formData\.get\("requestId"\)/);
  assert.doesNotMatch(actions, /\.rpc\(|SUPABASE_(SECRET|SERVICE_ROLE)/);
});

test("post-commit attribution is canonical, deterministic and independently retryable", () => {
  assert.match(attribution, /import "server-only"/);
  assert.match(attribution, /createSupabaseAuthAdminClient/);
  assert.match(attribution, /\.from\("orders"\)/);
  assert.match(attribution, /api_record_attribution_event/);
  assert.match(attribution, /ORDER_PLACED/);
  assert.match(attribution, /deriveOrderPlacedRequestId/);
  assert.match(attribution, /createHash\("sha1"\)/);
  assert.match(attribution, /reconcileOrderPlacedAttribution/);
  assert.match(attribution, /failedReconciliation/);
  assert.match(attribution, /ok: false, attempted: 0/);
  assert.doesNotMatch(attribution, /api_compensate_storefront_checkout|address|phone|email|coupon/);
});

test("status records local completion and preserves protected gates", () => {
  assert.match(status, /PHASE 1D PART 3E OWNER DECISION FREEZE COMPLETE/);
  assert.match(status, /PHASE 1D PART 3E SERVER APPLICATION RUNTIME IMPLEMENTED \/ LOCAL VALIDATED/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B STAFF REVIEW SERVICE CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE FOR RV01-RV24 REQUIRES OWNER APPROVAL/,
  );
  assert.match(status, /P16 remains mandatory for Production/);
});
