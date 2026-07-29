import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractPath =
  "docs/security/ACOS_PRODUCTION_ADVISOR_RECONCILIATION_PART2_GUARDED_RPC_CONTRACT_REVIEW.md";
const helperPath = "supabase/migrations/032_rls_helpers.sql";
const remediationPath =
  "supabase/migrations/20260729183433_harden_active_profile_permission_guard.sql";

const reviewedFunctions = [
  "current_profile_id",
  "is_org_member",
  "has_org_permission",
  "api_reserve_inventory",
  "api_release_inventory_reservation",
  "api_convert_reservation_to_allocation",
  "api_post_inventory_movement",
  "api_get_product_variant_cost",
  "api_update_product_variant_cost",
  "api_process_refund",
  "api_override_qc_session",
  "api_create_shipment_label",
  "api_complete_qc_session",
  "api_mark_shipment_ready_for_handoff",
  "api_record_carrier_tracking_event",
  "api_assign_fulfillment",
  "api_assign_qc_session",
  "api_assign_shipment",
  "api_assign_return",
  "api_request_member_invitation",
  "api_prepare_member_invitation_email_send",
  "api_record_member_invitation_email_event",
  "api_accept_member_invitation",
  "api_assign_member_role",
  "api_remove_member_role",
  "api_replace_member_role",
  "api_deactivate_member",
  "api_get_customer_portal_snapshot",
  "api_create_customer_portal_address",
  "api_update_customer_portal_address",
  "api_archive_customer_portal_address",
  "api_update_customer_portal_consent",
  "api_request_customer_contact_change",
  "api_get_customer_portal_notifications",
  "api_request_customer_profile_link",
  "api_revoke_customer_profile_link",
];

test("Part 2 records a disposition for all 36 advisor functions", async () => {
  const contract = await readFile(contractPath, "utf8");

  assert.equal(reviewedFunctions.length, 36);
  for (const functionName of reviewedFunctions) {
    assert.match(contract, new RegExp(`\\b${functionName}\\b`));
  }
  assert.match(contract, /PUBLIC.*anon/s);
  assert.match(contract, /service-only/i);
});

test("Part 2 fails closed on the shared active-profile authorization gap", async () => {
  const [contract, helper, remediation] = await Promise.all([
    readFile(contractPath, "utf8"),
    readFile(helperPath, "utf8"),
    readFile(remediationPath, "utf8"),
  ]);

  const permissionHelper = helper.match(
    /create or replace function public\.has_org_permission[\s\S]*?\$\$;/,
  )?.[0];

  assert.ok(permissionHelper);
  assert.doesNotMatch(permissionHelper, /p\.status\s*=\s*'ACTIVE'/);
  assert.match(contract, /REMEDIATION REQUIRED/);
  assert.match(contract, /PROTECTED AUTHORIZATION CORE/);
  assert.match(contract, /new forward migration/);
  assert.match(contract, /production only after explicit approval/);
  assert.match(remediation, /p\.status\s*=\s*'ACTIVE'/);
  assert.match(remediation, /om\.status\s*=\s*'ACTIVE'/);
  assert.match(remediation, /r\.status\s*=\s*'ACTIVE'/);
  assert.match(remediation, /perm\.code\s*=\s*p_permission_code/);
  assert.match(
    remediation,
    /revoke execute on function public\.has_org_permission\(uuid, text\)[\s\S]*from public, anon/,
  );
  assert.match(
    remediation,
    /grant execute on function public\.has_org_permission\(uuid, text\)[\s\S]*to authenticated/,
  );
});

test("Part 2 keeps production and deployment boundaries closed", async () => {
  const contract = await readFile(contractPath, "utf8");

  assert.match(contract, /did not:[\s\S]*change a function body or grant/i);
  assert.match(contract, /did not:[\s\S]*push a production migration/i);
  assert.match(contract, /\*\*Status:\*\* PRODUCTION VALIDATED/);
  assert.match(contract, /linked migration 20260729183433: APPLIED/);
  assert.match(contract, /anon EXECUTE: DENIED/);
  assert.match(contract, /advisor WARN: 40 EXPECTED/);
  assert.match(contract, /Vercel-to-Supabase credentials.*remain blocked/s);
});
