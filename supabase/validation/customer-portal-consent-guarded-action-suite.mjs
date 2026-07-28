import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_consent_guarded_action",
    file: "supabase/validation/040_customer_portal_consent_guarded_action_test.sql",
    requiredRows: ["customer_portal_consent_guarded_action|pass"],
  },
]);

console.log("customer_portal_consent_guarded_action_suite pass");
