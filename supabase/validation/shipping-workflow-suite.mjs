import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const dockerBin = process.env.DOCKER_BIN ??
  "C:\\Users\\Tanya\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";
const dbContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_adora_commerce_os";
const dockerPath = `${process.env.LOCALAPPDATA ?? "C:\\Users\\Tanya\\AppData\\Local"}\\Programs\\DockerDesktop\\resources\\bin`;
const npmCli = process.platform === "win32"
  ? {
    command: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
    argsPrefix: ["/d", "/s", "/c", "npm.cmd"],
  }
  : {
    command: "npm",
    argsPrefix: [],
  };
const suiteSqlFiles = [
  {
    name: "security_definer_exposure",
    file: "supabase/validation/004_security_definer_exposure.sql",
    requiredRows: [
      "security_definer_public_execute|0",
      "security_definer_anon_execute|0",
      "carrier_tracking_service_role_execute|0",
      "carrier_webhook_api_wrappers_service_role_execute|1",
      "shipping_workflow_api_wrappers_authenticated_execute|3",
    ],
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
];

assertDockerAvailable();

for (const sqlTest of suiteSqlFiles) {
  const output = runPsql(readFileSync(sqlTest.file, "utf8")).trim();

  for (const row of sqlTest.requiredRows) {
    if (!output.includes(row)) {
      throw new Error(`${sqlTest.name} did not report expected row: ${row}\n${output}`);
    }
  }

  console.log(`${sqlTest.name} pass`);
}

runCommand(npmCli.command, [...npmCli.argsPrefix, "run", "validate:carrier-webhook-e2e"], {
  env: {
    ...process.env,
    PATH: `${dockerPath};${process.env.PATH}`,
  },
});

console.log("shipping_workflow_suite pass");

function assertDockerAvailable() {
  runCommand(dockerBin, ["version"], { silent: true });
}

function runPsql(sql) {
  return runCommand(
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
    { input: sql, silent: true },
  );
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
    stdio: options.input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.stdout && !options.silent) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr && !options.silent) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    if (result.stdout && options.silent) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr && options.silent) {
      process.stderr.write(result.stderr);
    }

    throw new Error(`${command} ${args.join(" ")} failed`);
  }

  return result.stdout ?? "";
}
