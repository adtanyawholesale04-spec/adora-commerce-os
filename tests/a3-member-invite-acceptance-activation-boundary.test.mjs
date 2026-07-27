import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const files = {
  callbackRoute: join(root, "src", "app", "auth", "callback", "route.ts"),
  acceptanceHelper: join(root, "src", "lib", "auth", "member-invite-acceptance.ts"),
  adminClient: join(root, "src", "lib", "supabase", "admin.ts"),
  lowRiskAction: join(root, "src", "lib", "admin", "actions", "low-risk.ts"),
  contract: join(root, "docs", "api-contracts", "A3_MEMBER_INVITE_ACCEPTANCE_ACTIVATION_BOUNDARY.md"),
  migration: join(
    root,
    "supabase",
    "migrations",
    "20260727181500_member_invite_acceptance_activation_boundary.sql"
  ),
  validation: join(root, "supabase", "validation", "019_member_invite_acceptance_activation_test.sql"),
  workflowSuite: join(root, "supabase", "validation", "supabase-workflows-suite.mjs"),
  status: join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md")
};

describe("A3 member invite acceptance activation boundary", () => {
  it("routes invite callbacks through server-side session exchange and acceptance RPC", () => {
    assert.ok(existsSync(files.acceptanceHelper), "member invite acceptance helper is missing");
    const callbackRoute = readFileSync(files.callbackRoute, "utf8");
    const acceptanceHelper = readFileSync(files.acceptanceHelper, "utf8");

    for (const required of [
      "exchangeCodeForSession",
      "verifyOtp",
      "invitation_id",
      "acceptMemberInvitationFromCallback",
      "api_accept_member_invitation",
      "appendAuthCallbackStatus",
      "server-only"
    ]) {
      assert.match(
        `${callbackRoute}\n${acceptanceHelper}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.doesNotMatch(`${callbackRoute}\n${acceptanceHelper}`, /SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(`${callbackRoute}\n${acceptanceHelper}`, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(`${callbackRoute}\n${acceptanceHelper}`, /inviteUserByEmail/);
  });

  it("adds invitation id to the Auth Admin redirect boundary", () => {
    const adminClient = readFileSync(files.adminClient, "utf8");
    const lowRiskAction = readFileSync(files.lowRiskAction, "utf8");

    assert.match(adminClient, /getSupabaseInviteRedirectUrlForInvitation/);
    assert.match(adminClient, /searchParams\.set\("invitation_id", invitationId\)/);
    assert.match(lowRiskAction, /getSupabaseInviteRedirectUrlForInvitation\(payload\.invitationId\)/);
  });

  it("activates membership only after authenticated email matches the invitation", () => {
    assert.ok(existsSync(files.migration), "acceptance activation migration is missing");
    assert.ok(existsSync(files.validation), "acceptance activation validation SQL is missing");

    const migration = readFileSync(files.migration, "utf8");
    const validation = readFileSync(files.validation, "utf8");

    for (const required of [
      "api_accept_member_invitation",
      "auth.users",
      "auth.uid()",
      "Invitation email does not match authenticated user",
      "organization_memberships",
      "status = 'ACTIVE'",
      "status = 'ACCEPTED'",
      "admin.member.invite.accepted",
      "role_assignment",
      "deferred",
      "revoke execute",
      "grant execute",
      "member_invite_acceptance_activation"
    ]) {
      assert.match(
        `${migration}\n${validation}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.doesNotMatch(migration, /insert\s+into\s+public\.membership_roles/i);
    assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
  });

  it("documents and reconciles the implemented acceptance boundary", () => {
    const contract = readFileSync(files.contract, "utf8");
    const status = readFileSync(files.status, "utf8");
    const workflowSuite = readFileSync(files.workflowSuite, "utf8");

    for (const required of [
      "A3-ACTION-INVITE-ACCEPT-001",
      "membership activation",
      "callback",
      "email match",
      "role assignment remains deferred",
      "NEXT: A3 member role management UI affordance and role assignment submit enablement",
      "019_member_invite_acceptance_activation_test.sql"
    ]) {
      assert.match(
        `${contract}\n${status}\n${workflowSuite}`,
        new RegExp(required.replace(/[.]/g, "\\.")),
        `${required} missing`
      );
    }

    assert.match(status, /A3-ACTION-INVITE-ACCEPT-001[\s\S]*IMPLEMENTED/);
    assert.match(status, /A3 MEMBER INVITE ACCEPTANCE \+ MEMBERSHIP ACTIVATION IMPLEMENTED/);
  });
});
