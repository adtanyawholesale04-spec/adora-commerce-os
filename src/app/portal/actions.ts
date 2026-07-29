"use server";

import { revalidatePath } from "next/cache";
import { getAdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };

const consentChannels = new Set(["LINE", "SMS", "EMAIL", "PHONE"]);
const consentPurposes = new Set([
  "ORDER_UPDATE",
  "LIVE_NOTIFICATION",
  "PROMOTION",
  "NEW_PRODUCT",
  "LOYALTY",
  "CONTENT_UPDATE"
]);

export async function createPortalAddressAction(formData: FormData): Promise<ActionResult> {
  return callAddressRpc("api_create_customer_portal_address", {
    p_label: stringValue(formData, "label"),
    p_recipient_name: requiredValue(formData, "recipient_name"),
    p_phone: requiredValue(formData, "phone"),
    p_address_line1: requiredValue(formData, "address_line1"),
    p_address_line2: stringValue(formData, "address_line2"),
    p_subdistrict: stringValue(formData, "subdistrict"),
    p_district: stringValue(formData, "district"),
    p_province: stringValue(formData, "province"),
    p_postal_code: stringValue(formData, "postal_code"),
    p_country_code: stringValue(formData, "country_code") || "TH",
    p_is_default: formData.get("is_default") === "on",
    p_client_request_id: crypto.randomUUID()
  });
}

export async function updatePortalAddressAction(formData: FormData): Promise<ActionResult> {
  return callAddressRpc("api_update_customer_portal_address", {
    p_address_id: requiredValue(formData, "address_id"),
    p_label: stringValue(formData, "label"),
    p_recipient_name: requiredValue(formData, "recipient_name"),
    p_phone: requiredValue(formData, "phone"),
    p_address_line1: requiredValue(formData, "address_line1"),
    p_address_line2: stringValue(formData, "address_line2"),
    p_subdistrict: stringValue(formData, "subdistrict"),
    p_district: stringValue(formData, "district"),
    p_province: stringValue(formData, "province"),
    p_postal_code: stringValue(formData, "postal_code"),
    p_country_code: stringValue(formData, "country_code") || "TH",
    p_is_default: formData.get("is_default") === "on",
    p_client_request_id: crypto.randomUUID()
  });
}

export async function archivePortalAddressAction(formData: FormData): Promise<ActionResult> {
  return callAddressRpc("api_archive_customer_portal_address", {
    p_address_id: requiredValue(formData, "address_id"),
    p_client_request_id: crypto.randomUUID()
  });
}

export async function updatePortalConsentAction(formData: FormData): Promise<ActionResult> {
  try {
    const channel = requiredValue(formData, "channel").toUpperCase();
    const purpose = requiredValue(formData, "purpose").toUpperCase();
    const status = requiredValue(formData, "status").toUpperCase();
    const destination = stringValue(formData, "destination");
    const policyVersion = stringValue(formData, "policy_version");

    if (!consentChannels.has(channel) || !consentPurposes.has(purpose)) {
      return { ok: false, message: "Unsupported consent preference." };
    }
    if (status !== "GRANTED" && status !== "REVOKED") {
      return { ok: false, message: "Unsupported consent status." };
    }
    if ((channel === "EMAIL" || channel === "PHONE") && !destination) {
      return { ok: false, message: "A verified destination is required." };
    }

    const context = await getAdminShellContext();
    if (context.mode !== "configured" || !context.activeOrganizationId) {
      return { ok: false, message: "Active organization membership is required." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("api_update_customer_portal_consent", {
      p_organization_id: context.activeOrganizationId,
      p_channel: channel,
      p_purpose: purpose,
      p_status: status,
      p_destination: destination || null,
      p_policy_version: policyVersion || null,
      p_client_request_id: crypto.randomUUID()
    });
    if (error) {
      return { ok: false, message: "We could not update this preference." };
    }

    revalidatePath("/portal");
    return { ok: true };
  } catch {
    return { ok: false, message: "We could not update this preference." };
  }
}

async function callAddressRpc(functionName: string, params: Record<string, unknown>): Promise<ActionResult> {
  try {
    const context = await getAdminShellContext();
    if (context.mode !== "configured" || !context.activeOrganizationId) {
      return { ok: false, message: "Active organization membership is required." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc(functionName, {
      p_organization_id: context.activeOrganizationId,
      ...params
    });
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/portal");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Address action failed." };
  }
}

function requiredValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
