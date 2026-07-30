"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_THEME_COOKIE,
  parseLocale,
  parseTheme,
} from "@/lib/admin/preferences";

export async function setStorefrontPreferencesAction(formData: FormData) {
  const theme = formData.get("theme");
  const locale = formData.get("locale");
  const returnPath = safeStorefrontReturnPath(
    String(formData.get("returnPath") ?? ""),
  );
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };

  if (theme !== null) {
    cookieStore.set(ADMIN_THEME_COOKIE, parseTheme(String(theme)), options);
  }
  if (locale !== null) {
    cookieStore.set(ADMIN_LOCALE_COOKIE, parseLocale(String(locale)), options);
  }

  revalidatePath(returnPath);
  redirect(returnPath);
}

function safeStorefrontReturnPath(value: string) {
  return /^\/store\/[a-z0-9][a-z0-9-]{1,61}[a-z0-9](?:\/products\/[a-z0-9][a-z0-9-]{1,61}[a-z0-9])?$/.test(
    value,
  )
    ? value
    : "/";
}
