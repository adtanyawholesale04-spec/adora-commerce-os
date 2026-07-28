import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_profile_link_guarded_actions",
    file: "supabase/validation/037_customer_profile_link_guarded_actions_test.sql",
    requiredRows: ["customer_profile_link_guarded_actions|pass"],
  },
]);

console.log("customer_profile_link_guarded_actions_suite pass");
