import "server-only";

import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";

export type GuardedAdminActionCode =
  | "ok"
  | "missing_env"
  | "anonymous"
  | "missing_active_membership"
  | "organization_not_active"
  | "permission_denied";

export type GuardedAdminActionFailure = {
  ok: false;
  code: Exclude<GuardedAdminActionCode, "ok">;
  message: string;
  actionId: string;
  requiredPermission: string;
  context: AdminShellContext;
};

export type GuardedAdminActionSuccess = {
  ok: true;
  code: "ok";
  actionId: string;
  requiredPermission: string;
  organizationId: string;
  organizationName: string;
  actorEmail: string | null;
  entitlement: "not_plan_gated";
  auditRequired: true;
  context: AdminShellContext;
};

export type GuardedAdminActionContext =
  | GuardedAdminActionSuccess
  | GuardedAdminActionFailure;

export async function requireGuardedAdminAction({
  actionId,
  requiredPermission
}: {
  actionId: string;
  requiredPermission: string;
}): Promise<GuardedAdminActionContext> {
  const context = await getAdminShellContext();

  if (context.mode === "missing_env") {
    return failure(context, "missing_env", actionId, requiredPermission);
  }

  if (context.mode === "anonymous") {
    return failure(context, "anonymous", actionId, requiredPermission);
  }

  if (!context.activeOrganizationId || context.membershipStatus !== "ACTIVE") {
    return failure(context, "missing_active_membership", actionId, requiredPermission);
  }

  if (context.organizationStatus !== "ACTIVE") {
    return failure(context, "organization_not_active", actionId, requiredPermission);
  }

  if (!context.permissions.includes(requiredPermission)) {
    return failure(context, "permission_denied", actionId, requiredPermission);
  }

  return {
    ok: true,
    code: "ok",
    actionId,
    requiredPermission,
    organizationId: context.activeOrganizationId,
    organizationName: context.organizationName ?? context.activeOrganizationId,
    actorEmail: context.userEmail,
    entitlement: "not_plan_gated",
    auditRequired: true,
    context
  };
}

function failure(
  context: AdminShellContext,
  code: Exclude<GuardedAdminActionCode, "ok">,
  actionId: string,
  requiredPermission: string
): GuardedAdminActionFailure {
  return {
    ok: false,
    code,
    message: failureMessages[code],
    actionId,
    requiredPermission,
    context
  };
}

const failureMessages: Record<Exclude<GuardedAdminActionCode, "ok">, string> = {
  missing_env: "Supabase public environment variables are missing.",
  anonymous: "Authentication is required before running this Admin action.",
  missing_active_membership: "An active organization membership is required.",
  organization_not_active: "The active organization is not available for Admin actions.",
  permission_denied: "The active membership does not have the required permission."
};
