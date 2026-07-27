import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberInviteAcceptanceStatus = "accepted" | "skipped" | "error";

type MemberInviteAcceptanceRpcRow = {
  invitation_id: string;
  organization_id: string;
  profile_id: string;
  membership_id: string;
  invitation_status: "ACCEPTED";
  membership_status: "ACTIVE";
  created_profile: boolean;
  activated_membership: boolean;
  reused_existing: boolean;
};

export async function acceptMemberInvitationFromCallback(
  supabase: SupabaseClient,
  invitationId: string | null
): Promise<MemberInviteAcceptanceStatus> {
  if (!invitationId) {
    return "skipped";
  }

  if (!isUuid(invitationId)) {
    return "error";
  }

  const { data, error } = await supabase.rpc("api_accept_member_invitation", {
    p_invitation_id: invitationId
  });

  if (error) {
    return "error";
  }

  const row = Array.isArray(data) ? (data[0] as MemberInviteAcceptanceRpcRow | undefined) : undefined;

  if (row?.invitation_status !== "ACCEPTED" || row.membership_status !== "ACTIVE") {
    return "error";
  }

  return "accepted";
}

export function appendAuthCallbackStatus(nextPath: string, status: MemberInviteAcceptanceStatus) {
  if (status === "skipped") {
    return nextPath;
  }

  const url = new URL(nextPath, "http://acos.local");
  url.searchParams.set("invite", status);
  return `${url.pathname}${url.search}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value
  );
}
