import { runSqlSuite } from "./supabase-validation-runner.mjs";

await runSqlSuite([
  {
    name: "messaging_usage_reservation_boundary",
    file: "supabase/validation/034_messaging_usage_reservation_boundary_test.sql",
    requiredRows: ["messaging_usage_reservation_boundary|pass"],
  },
]);

console.log("messaging_usage_reservation_boundary_suite pass");
