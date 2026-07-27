import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  adminClient: join(root, "src", "lib", "supabase", "admin.ts"),
  lowRiskAction: join(root, "src", "lib", "admin", "actions", "low-risk.ts"),
  formComponent: join(root, "src", "app", "admin", "users", "member-invite-form.tsx"),
  usersAction: join(root, "src", "app", "admin", "users", "actions.ts"),
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_INVITE_AUTH_ADMIN_EMAIL_BOUNDARY.md"),
  migration: join(root, "supabase", "migrations", "20260727172407_member_invite_auth_admin_email_boundary.sql"),
  validation: join(root, "supabase", "validation", "018_member_invite_auth_admin_email_boundary_test.sql"),
  envExample: join(root, ".env.example"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 member invite Auth Admin email-send boundary", () => {
  it("uses a dedicated server-only Supabase Auth Admin client", () => {
    assert.ok(existsSync(files.adminClient), "server-only admin client is missing");
    const adminClient = readFileSync(files.adminClient, "utf8");
    const envExample = readFileSync(files.envExample, "utf8");

    assert.match(adminClient, /import "server-only"/);
    assert.match(adminClient, /createClient/);
    assert.match(adminClient, /SUPABASE_SECRET_KEY/);
    assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(adminClient, /SUPABASE_INVITE_REDIRECT_URL/);
    assert.match(adminClient, /autoRefreshToken:\s*false/);
    assert.match(adminClient, /persistSession:\s*false/);
    assert.match(adminClient, /detectSessionInUrl:\s*false/);
    assert.match(envExample, /SUPABASE_SECRET_KEY=/);
    assert.match(envExample, /SUPABASE_INVITE_REDIRECT_URL=/);
  });

  it("keeps Auth Admin email send out of browser and server action adapters", () => {
    const form = readFileSync(files.formComponent, "utf8");
    const usersAction = readFileSync(files.usersAction, "utf8");

    for (const clientOrAdapter of [form, usersAction]) {
      assert.doesNotMatch(clientOrAdapter, /SUPABASE_SECRET_KEY/);
      assert.doesNotMatch(clientOrAdapter, /SUPABASE_SERVICE_ROLE_KEY/);
      assert.doesNotMatch(clientOrAdapter, /service_role/i);
      assert.doesNotMatch(clientOrAdapter, /inviteUserByEmail/);
    }

    assert.doesNotMatch(form, /createSupabase/i);
    assert.doesNotMatch(form, /\.rpc\s*\(/);
  });

  it("persists invite first, then sends and audits Auth Admin email events", () => {
    const lowRiskAction = readFileSync(files.lowRiskAction, "utf8");

    for (const required of [
      "api_request_member_invitation",
      "api_prepare_member_invitation_email_send",
      "api_record_member_invitation_email_event",
      "inviteUserByEmail",
      "auth_admin_not_configured",
      "auth_admin_redirect_not_configured",
      "auth_admin_invite_failed",
      "auth_admin_audit_error",
      "server_only_auth_admin_secret",
      "authAdminEmailSent",
      "authAdminEmailSkippedReason"
    ]) {
      assert.match(lowRiskAction, new RegExp(required.replace(/[.]/g, "\\.")), `${required} missing`);
    }

    assert.doesNotMatch(lowRiskAction, /\.insert\s*\(/);
    assert.doesNotMatch(lowRiskAction, /\.update\s*\(/);
    assert.doesNotMatch(lowRiskAction, /\.delete\s*\(/);
  });

  it("adds RPCs for idempotent prepare and append-only audit recording", () => {
    assert.ok(existsSync(files.migration), "Auth Admin email boundary migration is missing");
    assert.ok(existsSync(files.validation), "Auth Admin email boundary validation SQL is missing");

    const migration = readFileSync(files.migration, "utf8");
    const validation = readFileSync(files.validation, "utf8");

    for (const required of [
      "api_prepare_member_invitation_email_send",
      "api_record_member_invitation_email_event",
      "admin.member.invite.email_sent",
      "admin.member.invite.email_failed",
      "has_org_permission",
      "members.manage",
      "auth.uid()",
      "revoke execute",
      "grant execute",
      "already_sent",
      "should_send"
    ]) {
      assert.match(
        `${migration}\n${validation}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
  });

  it("documents and reconciles the implemented boundary", () => {
    const contract = readFileSync(files.contract, "utf8");
    const status = readFileSync(files.status, "utf8");

    for (const required of [
      "A3-ACTION-AUTH-ADMIN-001",
      "server-only",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_INVITE_REDIRECT_URL",
      "redirect allow-list",
      "idempotency",
      "audit",
      "NEXT: A3 member role management UI affordance and role assignment submit enablement"
    ]) {
      assert.match(
        `${contract}\n${status}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.match(status, /A3-ACTION-AUTH-ADMIN-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE AUTH ADMIN EMAIL-SEND BOUNDARY IMPLEMENTED/);
  });
});
