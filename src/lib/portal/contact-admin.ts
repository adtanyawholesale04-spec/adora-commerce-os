import "server-only";

import { createSupabaseAuthAdminClient, SupabaseAuthAdminConfigError } from "@/lib/supabase/admin";

type ContactChangeRequest = {
  id: string;
  organization_id: string;
  profile_id: string;
  contact_type: "EMAIL" | "PHONE";
  normalized_value: string;
  status: "PENDING" | "VERIFIED" | "APPLIED" | "EXPIRED" | "REJECTED";
};

type Profile = { auth_user_id: string };

type ApplyRpcRow = {
  request_id: string;
  status: "APPLIED";
  contact_type: "EMAIL" | "PHONE";
  auth_user_id: string;
  already_applied: boolean;
};

export type CustomerContactCrmSyncResult =
  | "synced"
  | "already_matching"
  | "contact_request_not_applied"
  | "customer_link_not_active"
  | "customer_not_active"
  | "crm_contact_conflict"
  | "crm_duplicate_contact_conflict"
  | "persistence_error";

type CrmSyncRpcRow = {
  request_id: string;
  sync_result: Exclude<CustomerContactCrmSyncResult, "persistence_error">;
  reused_existing: boolean;
};

export type CustomerContactApplyResult =
  | {
      ok: true;
      requestId: string;
      status: "APPLIED";
      alreadyApplied: boolean;
      crmSyncResult: CustomerContactCrmSyncResult;
      crmSyncRetryable: boolean;
    }
  | {
      ok: false;
      code:
        | "auth_admin_not_configured"
        | "contact_request_not_found"
        | "contact_request_not_verified"
        | "auth_admin_apply_failed"
        | "auth_admin_audit_error";
    };

/**
 * Applies a service-verified contact to Auth. This module is server-only and
 * intentionally has no browser action or customer-facing RPC entry point.
 */
export async function applyVerifiedCustomerContactChange(
  organizationId: string,
  requestId: string,
  clientRequestId = crypto.randomUUID()
): Promise<CustomerContactApplyResult> {
  let adminClient: ReturnType<typeof createSupabaseAuthAdminClient>;

  try {
    adminClient = createSupabaseAuthAdminClient();
  } catch (error) {
    if (error instanceof SupabaseAuthAdminConfigError) {
      return { ok: false, code: "auth_admin_not_configured" };
    }
    return { ok: false, code: "auth_admin_not_configured" };
  }

  const { data: request, error: requestError } = await adminClient
    .from("customer_contact_change_requests")
    .select("id, organization_id, profile_id, contact_type, normalized_value, status")
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .maybeSingle<ContactChangeRequest>();

  if (requestError || !request) {
    return { ok: false, code: "contact_request_not_found" };
  }
  if (request.status === "APPLIED") {
    return completeCrmSync(adminClient, organizationId, requestId, clientRequestId, true);
  }
  if (request.status !== "VERIFIED") {
    return { ok: false, code: "contact_request_not_verified" };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("auth_user_id")
    .eq("id", request.profile_id)
    .maybeSingle<Profile>();

  if (profileError || !profile?.auth_user_id) {
    return { ok: false, code: "contact_request_not_found" };
  }

  const currentUser = await adminClient.auth.admin.getUserById(profile.auth_user_id);
  if (currentUser.error) {
    await recordApplyFailure(adminClient, organizationId, requestId, profile.auth_user_id, "auth_admin_lookup_failed", clientRequestId);
    return { ok: false, code: "auth_admin_apply_failed" };
  }

  const currentValue = request.contact_type === "EMAIL" ? currentUser.data.user.email : currentUser.data.user.phone;
  const alreadyMatches = normalizeContactValue(request.contact_type, currentValue) === request.normalized_value;

  if (!alreadyMatches) {
    const attributes = request.contact_type === "EMAIL"
      ? { email: request.normalized_value, email_confirm: true }
      : { phone: request.normalized_value, phone_confirm: true };
    const { error: updateError } = await adminClient.auth.admin.updateUserById(profile.auth_user_id, attributes);
    if (updateError) {
      await recordApplyFailure(adminClient, organizationId, requestId, profile.auth_user_id, "auth_admin_update_failed", clientRequestId);
      return { ok: false, code: "auth_admin_apply_failed" };
    }
  }

  const { data: appliedRows, error: applyError } = await adminClient.rpc(
    "api_apply_customer_contact_change",
    {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_auth_user_id: profile.auth_user_id,
      p_client_request_id: clientRequestId
    }
  );
  const applied = Array.isArray(appliedRows) ? (appliedRows[0] as ApplyRpcRow | undefined) : undefined;

  if (applyError || !applied) {
    return { ok: false, code: "auth_admin_audit_error" };
  }

  return completeCrmSync(
    adminClient,
    organizationId,
    applied.request_id,
    clientRequestId,
    applied.already_applied
  );
}

async function completeCrmSync(
  adminClient: ReturnType<typeof createSupabaseAuthAdminClient>,
  organizationId: string,
  requestId: string,
  clientRequestId: string,
  alreadyApplied: boolean
): Promise<CustomerContactApplyResult> {
  const { data: syncRows, error: syncError } = await adminClient.rpc(
    "api_sync_applied_customer_contact_to_crm",
    {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_client_request_id: clientRequestId
    }
  );
  const synced = Array.isArray(syncRows) ? (syncRows[0] as CrmSyncRpcRow | undefined) : undefined;

  if (syncError || !synced) {
    return {
      ok: true,
      requestId,
      status: "APPLIED",
      alreadyApplied,
      crmSyncResult: "persistence_error",
      crmSyncRetryable: true
    };
  }

  return {
    ok: true,
    requestId: synced.request_id,
    status: "APPLIED",
    alreadyApplied,
    crmSyncResult: synced.sync_result,
    crmSyncRetryable: isRetryableCrmResult(synced.sync_result)
  };
}

function isRetryableCrmResult(result: CrmSyncRpcRow["sync_result"]) {
  return result === "contact_request_not_applied";
}

async function recordApplyFailure(
  adminClient: ReturnType<typeof createSupabaseAuthAdminClient>,
  organizationId: string,
  requestId: string,
  authUserId: string,
  errorCode: string,
  clientRequestId: string
) {
  await adminClient.rpc("api_record_customer_contact_change_apply_failure", {
    p_organization_id: organizationId,
    p_request_id: requestId,
    p_auth_user_id: authUserId,
    p_error_code: errorCode,
    p_client_request_id: clientRequestId
  });
}

function normalizeContactValue(type: ContactChangeRequest["contact_type"], value: string | null | undefined) {
  if (!value) return null;
  return type === "EMAIL" ? value.trim().toLowerCase() : value.trim().replace(/[^0-9+]/g, "");
}
