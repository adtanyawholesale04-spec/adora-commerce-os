import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const evidencePath =
  "docs/security/ACOS_PRODUCTION_ADVISOR_RECONCILIATION_PART0_EVIDENCE_FREEZE.md";

test("Part 0 freezes the complete production advisor classification", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  assert.match(evidence, /WARN: 44/);
  assert.match(evidence, /Anonymous SECURITY DEFINER executable \| 1/);
  assert.match(evidence, /Authenticated SECURITY DEFINER executable \| 37/);
  assert.match(evidence, /Mutable function search path \| 2/);
  assert.match(evidence, /Extension in `public` \| 2/);
  assert.match(evidence, /RLS initplan performance \| 2/);
});
test("Part 0 enumerates all authenticated advisor functions once", async () => {
  const evidence = await readFile(evidencePath, "utf8");
  const groups = [
    [
      "current_profile_id",
      "is_org_member",
      "has_org_permission",
    ],
    [
      "api_reserve_inventory",
      "api_release_inventory_reservation",
      "api_convert_reservation_to_allocation",
      "api_post_inventory_movement",
      "api_get_product_variant_cost",
      "api_update_product_variant_cost",
    ],
    [
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
    ],
    [
      "api_request_member_invitation",
      "api_prepare_member_invitation_email_send",
      "api_record_member_invitation_email_event",
      "api_accept_member_invitation",
      "api_assign_member_role",
      "api_remove_member_role",
      "api_replace_member_role",
      "api_deactivate_member",
    ],
    [
      "api_get_customer_portal_snapshot",
      "api_create_customer_portal_address",
      "api_update_customer_portal_address",
      "api_archive_customer_portal_address",
      "api_update_customer_portal_consent",
      "api_request_customer_contact_change",
      "api_get_customer_portal_notifications",
      "api_request_customer_profile_link",
      "api_revoke_customer_profile_link",
    ],
  ];

  assert.equal(groups.flat().length, 36);
  for (const functionName of groups.flat()) {
    assert.match(evidence, new RegExp(`\\b${functionName}\\b`));
  }
  assert.match(evidence, /public\.rls_auto_enable\(\)/);
});

test("Part 0 remains evidence-only and blocks premature Vercel connection", async () => {
  const evidence = await readFile(evidencePath, "utf8");

  assert.match(evidence, /did not:/);
  assert.match(evidence, /change grants/);
  assert.match(evidence, /push a new migration/);
  assert.match(evidence, /Vercel-to-Supabase credentials remain blocked/);
});
