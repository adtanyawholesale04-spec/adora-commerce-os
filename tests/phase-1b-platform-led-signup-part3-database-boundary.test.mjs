import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "supabase/migrations/20260729133840_phase_1b_platform_signup_schema.sql",
  "utf8",
);
const functions = fs.readFileSync(
  "supabase/migrations/20260729133843_phase_1b_platform_signup_guarded_functions.sql",
  "utf8",
);
const status = fs.readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1B Part 3 keeps signup private and service-role guarded", () => {
  for (const table of [
    "platform_account_onboarding",
    "platform_account_acquisitions",
    "platform_account_events",
    "platform_interest_topics",
    "profile_platform_interests",
    "platform_terms_versions",
    "profile_terms_events",
    "public_profile_drafts",
  ]) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(schema, /from public, anon, authenticated/);
  assert.doesNotMatch(schema, /organization_id/);
  assert.match(functions, /current_setting\('request\.jwt\.claim\.role', true\) <> 'service_role'/);
  assert.match(functions, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(functions, /grant execute[\s\S]*to authenticated/);
  assert.match(status, /PHASE 1B PART 3 GUARDED DATABASE BOUNDARY IMPLEMENTED \/ VALIDATED/);
});
