import { cookies } from "next/headers";

export const ADMIN_LOCALE_COOKIE = "acos_admin_locale";
export const ADMIN_THEME_COOKIE = "acos_admin_theme";

export type AdminLocale = "th" | "en";
export type AdminTheme = "light" | "dark";

export type AdminPreferences = {
  locale: AdminLocale;
  theme: AdminTheme;
};

export async function getAdminPreferences(): Promise<AdminPreferences> {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(ADMIN_LOCALE_COOKIE)?.value);
  const theme = parseTheme(cookieStore.get(ADMIN_THEME_COOKIE)?.value);

  return { locale, theme };
}

export function parseLocale(value: string | null | undefined): AdminLocale {
  return value === "en" ? "en" : "th";
}

export function parseTheme(value: string | null | undefined): AdminTheme {
  return value === "dark" ? "dark" : "light";
}

export function safeAdminReturnPath(value: string | null | undefined) {
  if (
    !value ||
    (!value.startsWith("/admin") && value !== "/login" && !value.startsWith("/login/"))
  ) {
    return "/admin";
  }

  return value;
}
