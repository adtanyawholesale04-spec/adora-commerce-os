import { runSqlSuite, runSupabaseDbLint } from "./supabase-validation-runner.mjs";

runSupabaseDbLint();

runSqlSuite([
  {
    name: "baseline_summary",
    file: "supabase/validation/001_baseline_summary.sql",
    requiredRows: [
      "public_tables_without_rls|0",
      "tenant_tables_without_rls|0",
      "public_security_definer_functions|36",
    ],
  },
  {
    name: "security_definer_exposure",
    file: "supabase/validation/004_security_definer_exposure.sql",
    requiredRows: [
      "security_definer_public_execute|0",
      "security_definer_anon_execute|0",
      "transaction_functions_authenticated_execute|0",
      "carrier_tracking_service_role_execute|0",
      "carrier_webhook_api_wrappers_service_role_execute|1",
    ],
  },
  {
    name: "auth_profile_membership_rls",
    file: "supabase/validation/005_auth_membership_rls_test.sql",
    requiredRows: ["auth_profile_membership_rls|pass"],
  },
  {
    name: "domain_rls_crud",
    file: "supabase/validation/006_domain_rls_crud_test.sql",
    requiredRows: ["domain_rls_crud|pass"],
  },
  {
    name: "permission_layer",
    file: "supabase/validation/007_permission_layer_test.sql",
    requiredRows: ["permission_layer|pass"],
  },
  {
    name: "product_inventory_permission_rls",
    file: "supabase/validation/008_product_inventory_permission_rls_test.sql",
    requiredRows: ["product_inventory_permission_rls|pass"],
  },
  {
    name: "operations_permission_rls",
    file: "supabase/validation/011_operations_permission_rls_test.sql",
    requiredRows: ["operations_permission_rls|pass"],
  },
  {
    name: "role_matrix_validation",
    file: "supabase/validation/012_role_matrix_validation.sql",
    requiredRows: ["role_matrix_validation|pass"],
  },
]);

console.log("supabase_security_suite pass");
