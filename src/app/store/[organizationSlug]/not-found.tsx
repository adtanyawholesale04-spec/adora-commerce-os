import { getAdminPreferences } from "@/lib/admin/preferences";
import { storefrontCopy } from "@/lib/storefront/i18n";
import { StorefrontState } from "@/app/store/_components/storefront-state";

export default async function StorefrontNotFound() {
  const preferences = await getAdminPreferences();
  return (
    <StorefrontState
      kind="not_found"
      text={storefrontCopy[preferences.locale]}
    />
  );
}
