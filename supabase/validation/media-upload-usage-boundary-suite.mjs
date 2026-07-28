import { runSqlSuite } from "./supabase-validation-runner.mjs";

await runSqlSuite([
  {
    name: "media_upload_usage_boundary",
    file: "supabase/validation/033_media_upload_usage_boundary_test.sql",
    requiredRows: ["media_upload_usage_boundary|pass"],
  },
]);

console.log("media_upload_usage_boundary_suite pass");
