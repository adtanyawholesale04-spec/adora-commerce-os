import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_profile_ownership_boundary",
    file: "supabase/validation/036_customer_profile_ownership_boundary_test.sql",
    requiredRows: ["customer_profile_ownership_boundary|pass"],
  },
]);

console.log("customer_profile_ownership_boundary_suite pass");
