import { runSqlSuite } from "./supabase-validation-runner.mjs";

await runSqlSuite([
  {
    name: "content_publish_usage_boundary",
    file: "supabase/validation/031_content_publish_usage_boundary_test.sql",
    requiredRows: ["content_publish_usage_boundary|pass"],
  },
]);

console.log("content_publish_usage_boundary_suite pass");
