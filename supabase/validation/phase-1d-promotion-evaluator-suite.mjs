import {
  runSqlSuite,
  runSupabaseDbLint,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1d_promotion_evaluator",
    file: "supabase/validation/049_phase_1d_promotion_evaluator_test.sql",
    requiredRows: ["phase_1d_promotion_evaluator|pass"],
  },
]);

runSupabaseDbLint();

console.log("phase_1d_promotion_evaluator_suite pass");
