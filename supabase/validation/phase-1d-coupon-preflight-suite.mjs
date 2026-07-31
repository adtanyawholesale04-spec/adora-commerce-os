import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1d_coupon_non_destructive_preflight",
    file: "supabase/validation/051_phase_1d_coupon_non_destructive_preflight.sql",
    requiredRows: [
      "active_redemption_cart_duplicates|0",
      "active_redemption_order_duplicates|0",
      "automatic_coupon_version_overlap|0",
      "invalid_active_coupon_campaign_links|0",
      "invalid_usage_limits|0",
      "normalized_code_duplicates|0",
      "redemption_tenant_or_lifecycle_violations|0",
      "unsafe_active_codes|0",
      "coupon_preflight|pass",
    ],
  },
]);

console.log("phase_1d_coupon_preflight_suite pass");
