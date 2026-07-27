import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  acceptMemberInvitationFromCallback,
  appendAuthCallbackStatus
} from "@/lib/auth/member-invite-acceptance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const invitationId = requestUrl.searchParams.get("invitation_id");
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const inviteStatus = await acceptMemberInvitationFromCallback(supabase, invitationId);
      return NextResponse.redirect(`${origin}${appendAuthCallbackStatus(next, inviteStatus)}`);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType
    });

    if (!error) {
      const inviteStatus = await acceptMemberInvitationFromCallback(supabase, invitationId);
      return NextResponse.redirect(`${origin}${appendAuthCallbackStatus(next, inviteStatus)}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin?auth=callback_error`);
}

function sanitizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/admin";
  }

  return next;
}
