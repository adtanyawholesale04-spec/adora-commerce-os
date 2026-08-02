import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const localEnvPath = path.join(projectRoot, ".env.local");
const fixturePath = path.join(projectRoot, "scripts", "local", "seed-admin-qa.sql");
const localEmail = "ceoacos@example.com";

function readLocalEnv() {
  const contents = readFileSync(localEnvPath, "utf8");
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function requireLocalEnv(env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(supabaseUrl ?? "")) {
    throw new Error("Local QA seed requires NEXT_PUBLIC_SUPABASE_URL to point to local Supabase");
  }
  if (!secretKey) {
    throw new Error("Local QA seed requires SUPABASE_SECRET_KEY in .env.local");
  }

  return { supabaseUrl, secretKey };
}

function dockerPath() {
  return process.env.DOCKER_BIN ?? path.join(
    process.env.LOCALAPPDATA ?? "C:\\Users\\Public\\AppData\\Local",
    "Programs",
    "DockerDesktop",
    "resources",
    "bin",
    "docker.exe",
  );
}

async function ensureAuthUser(supabase) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(`Local Auth user lookup failed: ${listError.message}`);

  const existing = listed.users.find((user) => user.email?.toLowerCase() === localEmail);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      user_metadata: { display_name: "ACOS Local QA Admin" },
    });
    if (error) throw new Error(`Local Auth user update failed: ${error.message}`);
    return existing.id;
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: localEmail,
    email_confirm: true,
    password: randomBytes(24).toString("base64url"),
    user_metadata: { display_name: "ACOS Local QA Admin" },
  });
  if (error || !created.user) {
    throw new Error(`Local Auth user creation failed: ${error?.message ?? "missing user"}`);
  }
  return created.user.id;
}

function applySqlFixture() {
  const result = spawnSync(
    dockerPath(),
    [
      "exec",
      "-i",
      process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_adora_commerce_os",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-f",
      "-",
    ],
    {
      encoding: "utf8",
      input: readFileSync(fixturePath, "utf8"),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "Local SQL fixture failed");
  }
}

async function main() {
  const env = readLocalEnv();
  const { supabaseUrl, secretKey } = requireLocalEnv(env);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await ensureAuthUser(supabase);
  applySqlFixture();
  console.log(`Local Admin QA fixture ready for ${localEmail}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Local QA seed failed");
  process.exitCode = 1;
});
