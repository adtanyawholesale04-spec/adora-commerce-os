import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "authenticated_permission_metadata_grants",
    file: "supabase/validation/058_authenticated_permission_metadata_grants_test.sql",
    requiredRows: ["authenticated_permission_metadata_grants|pass"],
  },
]);

console.log("authenticated_permission_metadata_grants_suite pass");
