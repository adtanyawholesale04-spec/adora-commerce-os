import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_contact_workflow_e2e",
    file: "supabase/validation/044_customer_portal_contact_workflow_e2e_test.sql",
    requiredRows: ["customer_portal_contact_workflow_e2e|pass"],
  },
]);

console.log("customer_portal_contact_workflow_e2e_suite pass");
