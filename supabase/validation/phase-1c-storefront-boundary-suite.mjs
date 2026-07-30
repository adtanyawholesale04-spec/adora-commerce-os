import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1c_storefront_boundary",
    file: "supabase/validation/047_phase_1c_storefront_boundary_test.sql",
    requiredRows: ["phase_1c_storefront_boundary|pass"],
  },
]);

console.log("phase_1c_storefront_boundary_suite pass");
