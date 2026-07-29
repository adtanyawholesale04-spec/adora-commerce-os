import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_crm_contact_sync_boundary",
    file: "supabase/validation/043_customer_portal_crm_contact_sync_boundary_test.sql",
    requiredRows: ["customer_portal_crm_contact_sync_boundary|pass"],
  },
]);

console.log("customer_portal_crm_contact_sync_boundary_suite pass");
