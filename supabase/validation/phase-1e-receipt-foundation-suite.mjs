import {
  runSqlSuite,
  runSupabaseDbLint,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1e_receipt_foundation",
    file: "supabase/validation/059_phase_1e_receipt_foundation_test.sql",
    requiredRows: ["phase_1e_receipt_foundation|pass"],
  },
]);

runSupabaseDbLint();

console.log("phase_1e_receipt_foundation_suite pass");
