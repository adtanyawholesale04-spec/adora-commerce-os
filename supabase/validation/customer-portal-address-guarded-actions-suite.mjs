import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_address_guarded_actions",
    file: "supabase/validation/039_customer_portal_address_guarded_actions_test.sql",
    requiredRows: ["customer_portal_address_guarded_actions|pass"],
  },
]);

console.log("customer_portal_address_guarded_actions_suite pass");
