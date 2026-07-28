import { runSqlSuite } from "./supabase-validation-runner.mjs";

await runSqlSuite([
  {
    name: "message_delivery_attempt_boundary",
    file: "supabase/validation/035_message_delivery_attempt_boundary_test.sql",
    requiredRows: ["message_delivery_attempt_boundary|pass"],
  },
]);

console.log("message_delivery_attempt_boundary_suite pass");
