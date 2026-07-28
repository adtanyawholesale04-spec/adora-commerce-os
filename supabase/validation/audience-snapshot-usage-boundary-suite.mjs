import { runSqlSuite } from "./supabase-validation-runner.mjs";

await runSqlSuite([
  {
    name: "audience_snapshot_usage_boundary",
    file: "supabase/validation/032_audience_snapshot_usage_boundary_test.sql",
    requiredRows: ["audience_snapshot_usage_boundary|pass"],
  },
]);

console.log("audience_snapshot_usage_boundary_suite pass");
