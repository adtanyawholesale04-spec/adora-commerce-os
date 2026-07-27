"use server";

import { requestMemberInvitation } from "@/lib/admin/actions/low-risk";

export async function requestMemberInvitationServerAction(formData: FormData) {
  const roleIds = formData
    .getAll("roleIds")
    .map((roleId) => String(roleId).trim())
    .filter(Boolean);

  return requestMemberInvitation({
    email: String(formData.get("email") ?? ""),
    roleIds,
    clientActionId: String(formData.get("clientActionId") ?? "")
  });
}
