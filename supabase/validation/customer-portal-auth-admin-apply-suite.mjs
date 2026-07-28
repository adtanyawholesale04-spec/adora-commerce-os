import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_auth_admin_apply",
    file: "supabase/validation/042_customer_portal_auth_admin_apply_boundary_test.sql",
    requiredRows: ["customer_portal_auth_admin_apply|pass"],
  },
]);

console.log("customer_portal_auth_admin_apply_suite pass");
