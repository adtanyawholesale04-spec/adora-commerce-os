import { runNpmScript, runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "inventory_transaction_wrappers",
    file: "supabase/validation/009_inventory_transaction_wrappers_test.sql",
    requiredRows: ["inventory_transaction_wrappers|pass"],
  },
  {
    name: "product_cost_wrappers",
    file: "supabase/validation/010_product_cost_wrappers_test.sql",
    requiredRows: ["product_cost_wrappers|pass"],
  },
  {
    name: "guarded_operations_wrappers",
    file: "supabase/validation/013_guarded_operations_wrappers_test.sql",
    requiredRows: ["guarded_operations_wrappers|pass"],
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

console.log("supabase_workflows_suite pass");
