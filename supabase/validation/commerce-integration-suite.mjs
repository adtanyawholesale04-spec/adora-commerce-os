import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "commerce_integration_a2",
    file: "supabase/validation/016_commerce_integration_a2_test.sql",
    requiredRows: ["commerce_integration_a2|pass"],
  },
]);

console.log("commerce_integration_suite pass");
