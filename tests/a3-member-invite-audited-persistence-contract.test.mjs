import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_INVITE_AUDITED_PERSISTENCE_CONTRACT.md"),
  skeletonContract: join(root, "docs", "api-contracts", "A3_LOW_RISK_GUARDED_ADMIN_ACTION_SKELETONS.md"),
  uiAffordanceContract: join(root, "docs", "api-contracts", "A3_PERMISSION_AWARE_UI_AFFORDANCES.md"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md"),
  lowRiskAction: join(root, "src", "lib", "admin", "actions", "low-risk.ts"),
  adminClient: join(root, "src", "lib", "supabase", "admin.ts"),
  implementation: join(root, "docs", "api-contracts", "A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION.md"),
  migration: join(root, "supabase", "migrations", "20260727120000_member_invite_request_rpc.sql")
};

describe("A3 member invite audited persistence contract", () => {
  it("documents the guarded action identity, permission, and source tables", () => {
    assert.ok(existsSync(files.contract), "member invite persistence contract is missing");

    const contract = readFileSync(files.contract, "utf8");

    for (const required of [
      "A3-ACTION-PERSISTENCE-CONTRACT-001",
      "admin.member.invite.request",
      "members.manage",
      "organization_invitations",
      "audit_logs",
      "organization_memberships",
      "membership_roles",
      "BR-131",
      "server-only",
      "tenant scope"
    ]) {
      assert.match(contract, new RegExp(required.replace(/[.]/g, "\\."), "i"), `${required} missing`);
    }
  });

  it("keeps invite persistence constrained until role assignment and expiry are approved", () => {
    const contract = readFileSync(files.contract, "utf8");

    for (const required of [
      "role_assignment_not_supported",
      "Non-empty roleIds must return role_assignment_not_supported",
      "Expiry Behavior",
      "ACOS invitation TTL = 7 days",
      "unique active-invite constraint",
      "request trace and retry hint"
    ]) {
      assert.match(contract, new RegExp(required.replace(/[.]/g, "\\."), "i"), `${required} missing`);
    }
  });

  it("records Auth Admin and service-role boundaries as server-only follow-up scope", () => {
    const contract = readFileSync(files.contract, "utf8");
    const lowRiskAction = readFileSync(files.lowRiskAction, "utf8");
    const adminClient = readFileSync(files.adminClient, "utf8");

    for (const required of [
      "inviteUserByEmail",
      "Do not call Supabase Auth Admin from the browser",
      "Do not expose sb_secret",
      "Do not create passwords",
      "database-only",
      "auth_admin_not_enabled"
    ]) {
      assert.match(contract, new RegExp(required.replace(/[.]/g, "\\."), "i"), `${required} missing`);
    }

    assert.doesNotMatch(lowRiskAction, /\.insert\s*\(/);
    assert.doesNotMatch(lowRiskAction, /\.update\s*\(/);
    assert.match(lowRiskAction, /api_request_member_invitation/);
    assert.match(lowRiskAction, /inviteUserByEmail/);
    assert.match(adminClient, /import "server-only"/);
    assert.match(adminClient, /SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(lowRiskAction, /sb_secret/i);
  });

  it("implements DB-only RPC persistence with 7-day TTL, duplicate reuse, and audit", () => {
    assert.ok(existsSync(files.implementation), "member invite persistence implementation doc is missing");
    assert.ok(existsSync(files.migration), "member invite persistence RPC migration is missing");

    const implementation = readFileSync(files.implementation, "utf8");
    const migration = readFileSync(files.migration, "utf8");

    for (const required of [
      "A3-ACTION-PERSISTENCE-001",
      "api_request_member_invitation",
      "ACOS invitation TTL of 7 days",
      "organization_invitations",
      "audit_logs",
      "members.manage",
      "pg_advisory_xact_lock",
      "admin.member.invite.request.duplicate_reused",
      "auth_admin_email_sent",
      "grant execute"
    ]) {
      assert.match(`${implementation}\n${migration}`, new RegExp(required.replace(/[.]/g, "\\."), "i"), `${required} missing`);
    }

    assert.doesNotMatch(migration, /service_role/);
  });

  it("reconciles follow-up docs and implementation status", () => {
    const skeleton = readFileSync(files.skeletonContract, "utf8");
    const uiAffordance = readFileSync(files.uiAffordanceContract, "utf8");
    const status = readFileSync(files.status, "utf8");

    for (const doc of [skeleton, uiAffordance, status]) {
      assert.match(doc, /A3_MEMBER_INVITE_AUDITED_PERSISTENCE_CONTRACT\.md/);
      assert.match(doc, /A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION\.md/);
    }

    assert.match(status, /A3-ACTION-PERSISTENCE-CONTRACT-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE AUDITED PERSISTENCE CONTRACT IMPLEMENTED/);
    assert.match(status, /A3-ACTION-PERSISTENCE-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE DB-ONLY PERSISTENCE IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE UI VALIDATION \+ SUBMIT ENABLEMENT IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE AUTH ADMIN EMAIL-SEND BOUNDARY IMPLEMENTED/);
  });
});
