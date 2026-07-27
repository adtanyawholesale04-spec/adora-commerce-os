import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const dockerBin = process.env.DOCKER_BIN ??
  "C:\\Users\\Tanya\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";
export const dbContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_adora_commerce_os";
export const dockerPath = `${process.env.LOCALAPPDATA ?? "C:\\Users\\Tanya\\AppData\\Local"}\\Programs\\DockerDesktop\\resources\\bin`;

export const npmCli = process.platform === "win32"
  ? {
    command: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
    argsPrefix: ["/d", "/s", "/c", "npm.cmd"],
  }
  : {
    command: "npm",
    argsPrefix: [],
  };

export const supabaseCli = process.platform === "win32"
  ? {
    command: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
    argsPrefix: ["/d", "/s", "/c", "npx.cmd"],
  }
  : {
    command: "npx",
    argsPrefix: [],
  };

export function assertDockerAvailable() {
  runCommand(dockerBin, ["version"], { silent: true });
}

export function runSqlSuite(sqlTests) {
  assertDockerAvailable();

  for (const sqlTest of sqlTests) {
    const output = runPsql(readFileSync(sqlTest.file, "utf8")).trim();

    for (const row of sqlTest.requiredRows) {
      if (!output.includes(row)) {
        throw new Error(`${sqlTest.name} did not report expected row: ${row}\n${output}`);
      }
    }

    console.log(`${sqlTest.name} pass`);
  }
}

export function runPsql(sql) {
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

export function runNpmScript(scriptName) {
  runCommand(npmCli.command, [...npmCli.argsPrefix, "run", scriptName], {
    env: {
      ...process.env,
      PATH: `${dockerPath};${process.env.PATH}`,
    },
  });
}

export function runSupabaseDbLint() {
  runCommand(supabaseCli.command, [...supabaseCli.argsPrefix, "supabase", "db", "lint", "--local"], {
    env: {
      ...process.env,
      PATH: `${dockerPath};${process.env.PATH}`,
    },
    silent: true,
  });

  console.log("supabase_db_lint pass");
}

export function runCommand(command, args, options = {}) {
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
