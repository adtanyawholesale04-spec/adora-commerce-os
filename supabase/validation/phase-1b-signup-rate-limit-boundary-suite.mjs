import { spawn } from "node:child_process";
import {
  dbContainer,
  dockerBin,
  runPsql,
  runSqlSuite,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1b_signup_rate_limit_boundary",
    file: "supabase/validation/046_phase_1b_signup_rate_limit_boundary_test.sql",
    requiredRows: ["phase_1b_signup_rate_limit_boundary|pass"],
  },
]);

const concurrencyDigest = "c".repeat(64);
runPsql(`
  delete from public.platform_signup_rate_limit_buckets
  where scope = 'GLOBAL'
    and identity_digest = '${concurrencyDigest}'
    and key_version = 1;
`);

const calls = await Promise.all(
  Array.from({ length: 20 }, () =>
    runConcurrentPsql(`
      select set_config('request.jwt.claim.role', 'service_role', false);
      select (
        public.api_consume_platform_signup_rate_limit(
          'GLOBAL', '${concurrencyDigest}', 1, 900, 5
        ) ->> 'allowed'
      );
    `),
  ),
);

const allowedCount = calls.filter((output) => output.trim().endsWith("true")).length;
const attemptCount = Number(
  runPsql(`
    select attempt_count
    from public.platform_signup_rate_limit_buckets
    where scope = 'GLOBAL'
      and identity_digest = '${concurrencyDigest}'
      and key_version = 1;
  `).trim(),
);

runPsql(`
  delete from public.platform_signup_rate_limit_buckets
  where scope = 'GLOBAL'
    and identity_digest = '${concurrencyDigest}'
    and key_version = 1;
`);

if (allowedCount !== 5 || attemptCount !== 20) {
  throw new Error(
    `concurrency gate failed: allowed=${allowedCount}, attempts=${attemptCount}`,
  );
}

console.log("phase_1b_signup_rate_limit_concurrency pass");
console.log("phase_1b_signup_rate_limit_boundary_suite pass");

function runConcurrentPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      dockerBin,
      [
        "exec",
        "-i",
        dbContainer,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-t",
        "-A",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`concurrent psql failed (${code}): ${stderr}`));
      }
    });
    child.stdin.end(sql);
  });
}
