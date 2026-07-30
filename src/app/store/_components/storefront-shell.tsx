import Link from "next/link";
import { Languages, Moon, ShoppingBag, Sun } from "lucide-react";
import { setStorefrontPreferencesAction } from "@/app/store/actions";
import { StorefrontNetworkStatus } from "@/app/store/_components/storefront-network-status";
import type { AdminPreferences } from "@/lib/admin/preferences";
import type { StorefrontText } from "@/lib/storefront/i18n";

export function StorefrontShell({
  preferences,
  text,
  returnPath,
  storeName,
  storePath,
  children,
}: {
  preferences: AdminPreferences;
  text: StorefrontText;
  returnPath: string;
  storeName: string;
  storePath: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <a
        href="#storefront-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-lg focus:translate-y-0"
      >
        {text.skipToContent}
      </a>
      <StorefrontNetworkStatus message={text.offline} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <Link
            href={storePath}
            className="flex min-w-0 items-center gap-3"
            aria-label={storeName}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar text-white">
              <ShoppingBag aria-hidden className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{storeName}</span>
              <span className="block text-xs font-medium text-brand">ACOS Storefront</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <PreferenceButton
              name="theme"
              value={preferences.theme === "dark" ? "light" : "dark"}
              returnPath={returnPath}
              label={preferences.theme === "dark" ? text.light : text.dark}
              icon={
                preferences.theme === "dark" ? (
                  <Sun aria-hidden className="h-4 w-4" />
                ) : (
                  <Moon aria-hidden className="h-4 w-4" />
                )
              }
            />
            <PreferenceButton
              name="locale"
              value={preferences.locale === "th" ? "en" : "th"}
              returnPath={returnPath}
              label={preferences.locale === "th" ? text.english : text.thai}
              icon={<Languages aria-hidden className="h-4 w-4" />}
            />
          </div>
        </div>
      </header>
      <div id="storefront-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>{text.footer}</p>
          <span className="font-medium text-brand">{text.localPreview}</span>
        </div>
      </footer>
    </main>
  );
}

function PreferenceButton({
  name,
  value,
  returnPath,
  label,
  icon,
}: {
  name: "theme" | "locale";
  value: string;
  returnPath: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <form action={setStorefrontPreferencesAction}>
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panel px-3 text-xs font-semibold shadow-sm hover:bg-panel-strong"
        title={label}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
    </form>
  );
}
