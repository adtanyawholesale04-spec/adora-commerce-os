import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1b_platform_signup_boundary",
    file: "supabase/validation/045_phase_1b_platform_signup_boundary_test.sql",
    requiredRows: ["phase_1b_platform_signup_boundary|pass"],
  },
]);

console.log("phase_1b_platform_signup_boundary_suite pass");
