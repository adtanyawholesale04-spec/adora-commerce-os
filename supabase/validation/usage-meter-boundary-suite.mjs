import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "usage_meter_boundary",
    file: "supabase/validation/030_usage_meter_boundary_test.sql",
    requiredRows: ["usage_meter_boundary|pass"],
  },
]);

console.log("usage_meter_boundary_suite pass");
