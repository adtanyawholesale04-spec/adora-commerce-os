"use server";

import { requestOrganizationProfileUpdate } from "@/lib/admin/actions/low-risk";

export async function requestOrganizationProfileUpdateServerAction(formData: FormData) {
  return requestOrganizationProfileUpdate({
    name: String(formData.get("name") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    currencyCode: String(formData.get("currencyCode") ?? ""),
    clientActionId: String(formData.get("clientActionId") ?? "")
  });
}
