import { runNpmScript, runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "security_definer_exposure",
    file: "supabase/validation/004_security_definer_exposure.sql",
    requiredRows: [
      "security_definer_public_execute|0",
      "security_definer_anon_execute|0",
      "carrier_tracking_service_role_execute|0",
      "carrier_webhook_api_wrappers_service_role_execute|1",
      "shipping_workflow_api_wrappers_authenticated_execute|3",
    ],
  },
  {
    name: "shipping_workflow_wrappers",
    file: "supabase/validation/014_shipping_workflow_wrappers_test.sql",
    requiredRows: ["shipping_workflow_wrappers|pass"],
  },
  {
    name: "carrier_webhook_boundary",
    file: "supabase/validation/015_carrier_webhook_boundary_test.sql",
    requiredRows: ["carrier_webhook_boundary|pass"],
  },
]);

runNpmScript("validate:carrier-webhook-e2e");

console.log("shipping_workflow_suite pass");
