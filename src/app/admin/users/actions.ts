"use server";

import { revalidatePath } from "next/cache";
import { requestMemberInvitation } from "@/lib/admin/actions/low-risk";
import type {
  LowRiskAdminActionResult,
  MemberInviteRequestPayload
} from "@/lib/admin/actions/low-risk";

export type MemberInvitationFormState =
  | LowRiskAdminActionResult<MemberInviteRequestPayload>
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
