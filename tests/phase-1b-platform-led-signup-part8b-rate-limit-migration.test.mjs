import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260729150650_phase_1b_signup_durable_rate_limit_boundary.sql",
  "utf8",
);
const validation = fs.readFileSync(
  "supabase/validation/046_phase_1b_signup_rate_limit_boundary_test.sql",
  "utf8",
);
const status = fs.readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 8B stores only bounded HMAC digest buckets", () => {
  assert.match(migration, /create table public\.platform_signup_rate_limit_buckets/);
  assert.match(migration, /scope in \('IP', 'DESTINATION', 'GLOBAL'\)/);
  assert.match(migration, /identity_digest ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(migration, /key_version between 1 and 32767/);
  assert.doesNotMatch(migration, /\b(email|phone|ip_address)\b/i);
});

test("Part 8B consume is atomic, bounded and counts denial", () => {
  assert.match(migration, /api_consume_platform_signup_rate_limit/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /clock_timestamp\(\)/);
  assert.match(migration, /attempt_count \+ 1/);
  assert.match(migration, /p_window_seconds not between 60 and 86400/);
  assert.match(migration, /p_attempt_limit not between 1 and 10000/);
  assert.match(validation, /denied attempt was not counted/);
});

test("Part 8B denies direct access and exposes guarded cleanup only", () => {
  assert.match(migration, /enable row level security/);
  assert.match(
    migration,
    /revoke all on table public\.platform_signup_rate_limit_buckets\s+from public, anon, authenticated, service_role/,
  );
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /api_cleanup_platform_signup_rate_limits/);
  assert.doesNotMatch(migration, /cron\.schedule|pg_cron/i);
  assert.match(validation, /direct table access was granted/);
});

test("Part 8B reconciles status to server provider adapters", () => {
  assert.match(
    status,
    /PHASE 1B PART 8B DURABLE RATE-LIMIT BOUNDARY IMPLEMENTED \/ VALIDATED/,
  );
  assert.match(
    status,
    /NEXT: Part 8F External Values And Evidence Collection/,
  );
});
