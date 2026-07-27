"use server";

import { revalidatePath } from "next/cache";
import {
  requestMemberInvitation,
  requestMemberRoleAssignment
} from "@/lib/admin/actions/low-risk";
import type {
  LowRiskAdminActionResult,
  MemberRoleAssignmentPayload,
  MemberInviteRequestPayload
} from "@/lib/admin/actions/low-risk";

export type MemberInvitationFormState =
  | LowRiskAdminActionResult<MemberInviteRequestPayload>
  | null;

export type MemberRoleAssignmentFormState =
  | LowRiskAdminActionResult<MemberRoleAssignmentPayload>
  | null;

export async function requestMemberInvitationServerAction(
  _previousState: MemberInvitationFormState,
  formData: FormData
): Promise<MemberInvitationFormState> {
  const roleIds = formData
    .getAll("roleIds")
    .map((roleId) => String(roleId).trim())
    .filter(Boolean);

  const result = await requestMemberInvitation({
    email: String(formData.get("email") ?? ""),
    roleIds,
    clientActionId: String(formData.get("clientActionId") ?? "")
  });

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

export async function requestMemberRoleAssignmentServerAction(
  _previousState: MemberRoleAssignmentFormState,
  formData: FormData
): Promise<MemberRoleAssignmentFormState> {
  const result = await requestMemberRoleAssignment({
    membershipId: String(formData.get("membershipId") ?? ""),
    roleId: String(formData.get("roleId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    clientActionId: String(formData.get("clientActionId") ?? "")
  });

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}
