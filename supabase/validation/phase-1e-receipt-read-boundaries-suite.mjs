import {
  dockerPath,
  runCommand,
  runSqlSuite,
  runSupabaseDbLint,
  supabaseCli,
} from "./supabase-validation-runner.mjs";

runCommand(
  supabaseCli.command,
  [...supabaseCli.argsPrefix, "supabase", "db", "reset", "--local", "--yes"],
  {
    env: {
      ...process.env,
      PATH: `${dockerPath};${process.env.PATH}`,
    },
    silent: true,
  },
);

runSqlSuite([
  {
    name: "phase_1e_receipt_read_boundaries",
    file: "supabase/validation/061_phase_1e_receipt_read_boundaries_test.sql",
    requiredRows: ["phase_1e_receipt_read_boundaries|pass"],
  },
]);

runSupabaseDbLint();

console.log("phase_1e_receipt_read_boundaries_suite pass");
