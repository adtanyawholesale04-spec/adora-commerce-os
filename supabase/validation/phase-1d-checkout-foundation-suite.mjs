import {
  runSqlSuite,
  runSupabaseDbLint,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1d_checkout_foundation",
    file: "supabase/validation/048_phase_1d_checkout_foundation_test.sql",
    requiredRows: ["phase_1d_checkout_foundation|pass"],
  },
]);

runSupabaseDbLint();

console.log("phase_1d_checkout_foundation_suite pass");
