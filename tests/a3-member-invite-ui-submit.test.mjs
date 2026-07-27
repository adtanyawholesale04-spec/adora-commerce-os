import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

const formComponent = join(root, "src", "app", "admin", "users", "member-invite-form.tsx");
const usersPage = join(root, "src", "app", "admin", "users", "page.tsx");
const usersAction = join(root, "src", "app", "admin", "users", "actions.ts");
const contract = join(root, "docs", "api-contracts", "A3_MEMBER_INVITE_UI_SUBMIT_ENABLEMENT.md");
const status = join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");

describe("A3 member invite UI submit enablement", () => {
  it("adds a guarded client form without browser-side database writes", () => {
    for (const file of [formComponent, usersPage, usersAction, contract]) {
      assert.ok(existsSync(file), `${file} is missing`);
    }

    const form = readFileSync(formComponent, "utf8");
    const page = readFileSync(usersPage, "utf8");

    assert.match(form, /"use client"/);
    assert.match(form, /requestMemberInvitationServerAction/);
    assert.match(form, /useActionState/);
    assert.match(form, /type="email"/);
    assert.match(form, /required/);
    assert.match(form, /maxLength=\{320\}/);
    assert.match(form, /clientActionId/);
    assert.match(page, /MemberInviteForm/);
    assert.match(page, /canRequestInvitation/);

    assert.doesNotMatch(form, /createSupabase/i);
    assert.doesNotMatch(form, /\.insert\s*\(/);
    assert.doesNotMatch(form, /\.update\s*\(/);
    assert.doesNotMatch(form, /\.delete\s*\(/);
    assert.doesNotMatch(form, /\.rpc\s*\(/);
    assert.doesNotMatch(form, /service_role/i);
    assert.doesNotMatch(form, /inviteUserByEmail/i);
  });

  it("keeps persistence and revalidation server-side", () => {
    const action = readFileSync(usersAction, "utf8");

    assert.match(action, /"use server"/);
    assert.match(action, /requestMemberInvitation\(/);
    assert.match(action, /revalidatePath\("\/admin\/users"\)/);
    assert.doesNotMatch(action, /service_role/i);
    assert.doesNotMatch(action, /inviteUserByEmail/i);
  });

  it("documents DB-only submit scope and implemented Auth Admin follow-up boundary", () => {
    const doc = readFileSync(contract, "utf8");
    const currentStatus = readFileSync(status, "utf8");

    assert.match(doc, /DB-only invite flow/);
    assert.match(doc, /No invite email is sent/);
    assert.match(doc, /No role assignment is persisted/);
    assert.match(doc, /Supabase Auth Admin invite email-send boundary/);

    assert.match(currentStatus, /A3-ACTION-UI-SUBMIT-001[\s\S]*IMPLEMENTED/);
    assert.match(currentStatus, /A3 MEMBER INVITE UI VALIDATION \+ SUBMIT ENABLEMENT IMPLEMENTED/);
    assert.match(currentStatus, /A3 MEMBER INVITE AUTH ADMIN EMAIL-SEND BOUNDARY IMPLEMENTED/);
  });
});
