"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/admin/context";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const portalPath = "/portal";
const portalLoginPath = "/portal/login";

export async function signInToCustomerPortalAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const captchaToken = String(
    formData.get("cf-turnstile-response") ?? "",
  ).trim();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  if (!supabaseUrl || !supabasePublishableKey) {
    redirect(`${portalLoginPath}?auth=missing_env`);
  }
  if (!email) {
    redirect(`${portalLoginPath}?auth=missing_email`);
  }
  if (!captchaToken || captchaToken.length > 2048) {
    redirect(`${portalLoginPath}?auth=sign_in_error`);
  }

  const requestHeaders = await headers();
  const origin = safeRequestOrigin(
    requestHeaders.get("origin") ?? "http://localhost:3000",
  );
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", portalPath);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      captchaToken,
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect(`${portalLoginPath}?auth=sign_in_error`);
  }

  redirect(`${portalLoginPath}?auth=check_email`);
}

export async function signOutFromCustomerPortalAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORGANIZATION_COOKIE);

  revalidatePath(portalPath);
  redirect(`${portalLoginPath}?auth=signed_out`);
}

function safeRequestOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}
