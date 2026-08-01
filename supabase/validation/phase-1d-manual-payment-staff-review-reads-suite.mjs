import {
  runSqlSuite,
  runSupabaseDbLint,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1d_manual_payment_staff_review_reads",
    file: "supabase/validation/056_phase_1d_manual_payment_staff_review_reads_test.sql",
    requiredRows: ["phase_1d_manual_payment_staff_review_reads|pass"],
  },
]);

runSupabaseDbLint();

console.log("phase_1d_manual_payment_staff_review_reads_suite pass");
