import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_read_snapshot_boundary",
    file: "supabase/validation/038_customer_portal_read_snapshot_boundary_test.sql",
    requiredRows: ["customer_portal_read_snapshot_boundary|pass"],
  },
]);

console.log("customer_portal_read_snapshot_suite pass");
