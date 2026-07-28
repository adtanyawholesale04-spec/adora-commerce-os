import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "attribution_record_boundary",
    file: "supabase/validation/029_attribution_record_boundary_test.sql",
    requiredRows: ["attribution_record_boundary|pass"],
  },
]);

console.log("attribution_service_boundary_suite pass");
