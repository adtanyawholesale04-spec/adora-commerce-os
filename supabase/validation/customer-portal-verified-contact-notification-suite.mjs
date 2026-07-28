import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "customer_portal_verified_contact_notification",
    file: "supabase/validation/041_customer_portal_verified_contact_notification_test.sql",
    requiredRows: ["customer_portal_verified_contact_notification|pass"],
  },
]);

console.log("customer_portal_verified_contact_notification_suite pass");
