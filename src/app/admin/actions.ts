"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  getAdminShellContext
} from "@/lib/admin/context";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_THEME_COOKIE,
  parseLocale,
  parseTheme,
  safeAdminReturnPath
} from "@/lib/admin/preferences";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const adminPath = "/admin";

export async function signInWithEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  if (!supabaseUrl || !supabasePublishableKey) {
    redirect(`${adminPath}?auth=missing_env`);
  }

  if (!email) {
    redirect(`${adminPath}?auth=missing_email`);
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${adminPath}`
    }
  });

  if (error) {
    redirect(`${adminPath}?auth=sign_in_error`);
  }

  redirect(`${adminPath}?auth=check_email`);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORGANIZATION_COOKIE);

  revalidatePath(adminPath);
  redirect(`${adminPath}?auth=signed_out`);
}

export async function switchOrganizationAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const context = await getAdminShellContext();
  const allowedOrganization = context.memberships.find(
    (membership) => membership.organizationId === organizationId
  );

  if (!allowedOrganization) {
    redirect(`${adminPath}?organization=denied`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90
  });

  revalidatePath(adminPath);
  redirect(`${adminPath}?organization=switched`);
}

export async function setAdminPreferencesAction(formData: FormData) {
  const theme = formData.get("theme");
  const locale = formData.get("locale");
  const returnPath = safeAdminReturnPath(String(formData.get("returnPath") ?? ""));
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  };

  if (theme !== null) {
    cookieStore.set(ADMIN_THEME_COOKIE, parseTheme(String(theme)), options);
  }

  if (locale !== null) {
    cookieStore.set(ADMIN_LOCALE_COOKIE, parseLocale(String(locale)), options);
  }

  revalidatePath("/admin");
  redirect(returnPath);
}
