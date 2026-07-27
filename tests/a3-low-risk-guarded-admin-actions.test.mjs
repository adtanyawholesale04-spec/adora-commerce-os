import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  guard: join(root, "src", "lib", "admin", "actions", "guarded.ts"),
  lowRisk: join(root, "src", "lib", "admin", "actions", "low-risk.ts"),
  userAction: join(root, "src", "app", "admin", "users", "actions.ts"),
  settingAction: join(root, "src", "app", "admin", "settings", "actions.ts"),
  contract: join(root, "docs", "api-contracts", "A3_LOW_RISK_GUARDED_ADMIN_ACTION_SKELETONS.md"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 low-risk guarded Admin action skeletons", () => {
  it("adds server-only guarded action modules and app action adapters", () => {
    for (const [name, file] of Object.entries(files)) {
      assert.ok(existsSync(file), `${name} file is missing`);
    }

    assert.match(readFileSync(files.guard, "utf8"), /import "server-only"/);
    assert.match(readFileSync(files.lowRisk, "utf8"), /import "server-only"/);
    assert.match(readFileSync(files.userAction, "utf8"), /"use server"/);
    assert.match(readFileSync(files.settingAction, "utf8"), /"use server"/);
  });

  it("keeps both skeleton actions guarded by exact permissions and controlled errors", () => {
    const guard = readFileSync(files.guard, "utf8");
    const lowRisk = readFileSync(files.lowRisk, "utf8");

    for (const required of [
      "admin.member.invite.request",
      "members.manage",
      "admin.organization.profile.update.request",
      "organization.settings.edit",
      "missing_env",
      "anonymous",
      "missing_active_membership",
      "organization_not_active",
      "permission_denied",
      "validation_error",
      "not_implemented",
      "persisted",
      "duplicate_reused",
      "role_assignment_not_supported"
    ]) {
      assert.match(`${guard}\n${lowRisk}`, new RegExp(required.replace(/[.]/g, "\\.")), `${required} missing`);
    }
  });

  it("keeps persistence behind RPC and avoids service-role behavior in server actions", () => {
    const combined = [
      readFileSync(files.guard, "utf8"),
      readFileSync(files.lowRisk, "utf8"),
      readFileSync(files.userAction, "utf8"),
      readFileSync(files.settingAction, "utf8")
    ].join("\n");

    assert.doesNotMatch(combined, /\.insert\s*\(/);
    assert.doesNotMatch(combined, /\.update\s*\(/);
    assert.doesNotMatch(combined, /\.delete\s*\(/);
    assert.match(combined, /api_request_member_invitation/);
    assert.doesNotMatch(combined, /service_role/i);
    assert.doesNotMatch(combined, /SUPABASE_SERVICE/i);
  });

  it("reconciles the status file with the next A3 task", () => {
    const status = readFileSync(files.status, "utf8");

    assert.match(status, /A3-ACTION-SKELETON-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 LOW-RISK GUARDED ADMIN ACTION SKELETONS IMPLEMENTED/);
    assert.match(status, /A3 PERMISSION-AWARE UI AFFORDANCES IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE AUDITED PERSISTENCE CONTRACT IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE DB-ONLY PERSISTENCE IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE UI VALIDATION \+ SUBMIT ENABLEMENT IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE AUTH ADMIN EMAIL-SEND BOUNDARY IMPLEMENTED/);
  });
});
