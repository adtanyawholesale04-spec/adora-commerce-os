import { Languages, Moon, Sun } from "lucide-react";
import { cloneElement, type ReactElement } from "react";
import { setAdminPreferencesAction } from "@/app/admin/actions";
import type { AdminPreferences } from "@/lib/admin/preferences";
import { adminCopy } from "@/lib/admin/i18n";

export function AdminPreferenceSwitcher({
  preferences,
  returnPath
}: {
  preferences: AdminPreferences;
  returnPath: string;
}) {
  const copy = adminCopy[preferences.locale].common;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PreferenceButton
        name="theme"
        value={preferences.theme === "dark" ? "light" : "dark"}
        returnPath={returnPath}
        label={preferences.theme === "dark" ? copy.light : copy.dark}
        icon={preferences.theme === "dark" ? <Sun /> : <Moon />}
      />
      <PreferenceButton
        name="locale"
        value={preferences.locale === "th" ? "en" : "th"}
        returnPath={returnPath}
        label={preferences.locale === "th" ? copy.english : copy.thai}
        icon={<Languages />}
      />
    </div>
  );
}

function PreferenceButton({
  name,
  value,
  returnPath,
  label,
  icon
}: {
  name: "theme" | "locale";
  value: string;
  returnPath: string;
  label: string;
  icon: ReactElement<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <form action={setAdminPreferencesAction}>
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panel px-3 text-xs font-semibold text-ink shadow-sm hover:bg-panel-strong"
      >
        {clonePreferenceIcon(icon)}
        {label}
      </button>
    </form>
  );
}

function clonePreferenceIcon(
  icon: ReactElement<{ className?: string; "aria-hidden"?: boolean }>
) {
  return cloneElement(icon, {
    "aria-hidden": true,
    className: "h-4 w-4"
  });
}
