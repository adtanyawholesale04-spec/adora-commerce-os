import "server-only";

import { createClient } from "@supabase/supabase-js";

export type SupabaseAuthAdminConfigErrorCode =
  | "auth_admin_not_configured"
  | "auth_admin_redirect_not_configured";

export class SupabaseAuthAdminConfigError extends Error {
  code: SupabaseAuthAdminConfigErrorCode;

  constructor(code: SupabaseAuthAdminConfigErrorCode) {
    super(code);
    this.name = "SupabaseAuthAdminConfigError";
    this.code = code;
  }
}

export function createSupabaseAuthAdminClient() {
  const supabaseUrl = requiredSupabaseUrl();
  const secretKey = supabaseSecretKey();

  if (!secretKey) {
    throw new SupabaseAuthAdminConfigError("auth_admin_not_configured");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export function getSupabaseInviteRedirectUrl() {
  const redirectTo = String(process.env.SUPABASE_INVITE_REDIRECT_URL ?? "").trim();

  if (!isAbsoluteHttpUrl(redirectTo)) {
    throw new SupabaseAuthAdminConfigError("auth_admin_redirect_not_configured");
  }

  return redirectTo;
}

export function getSupabaseInviteRedirectUrlForInvitation(invitationId: string) {
  const redirectUrl = new URL(getSupabaseInviteRedirectUrl());
  redirectUrl.searchParams.set("invitation_id", invitationId);
  return redirectUrl.toString();
}

function requiredSupabaseUrl() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

  if (!isAbsoluteHttpUrl(supabaseUrl)) {
    throw new SupabaseAuthAdminConfigError("auth_admin_not_configured");
  }

  return supabaseUrl;
}

function supabaseSecretKey() {
  return (
    String(process.env.SUPABASE_SECRET_KEY ?? "").trim() ||
    String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()
  );
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
