import "server-only";

import {
  requireGuardedAdminAction,
  type GuardedAdminActionFailure,
  type GuardedAdminActionSuccess
} from "@/lib/admin/actions/guarded";

export type LowRiskAdminActionCode =
  | GuardedAdminActionFailure["code"]
  | "validation_error"
  | "not_implemented";

export type LowRiskAdminActionResult<TPayload> =
  | {
      ok: false;
      code: LowRiskAdminActionCode;
      actionId: string;
      message: string;
      fieldErrors?: Record<string, string>;
    }
  | {
      ok: true;
      code: "not_implemented";
      actionId: string;
      message: string;
      permission: string;
      organizationId: string;
      actorEmail: string | null;
      tenantScoped: true;
      auditRequired: true;
      serviceRoleBoundary: "server_only_not_used_in_skeleton";
      payload: TPayload;
    };

export type MemberInviteRequestInput = {
  email: string;
  roleIds?: string[];
  clientActionId?: string;
};

export type MemberInviteRequestPayload = {
  email: string;
  roleIds: string[];
  clientActionId: string | null;
};

export type OrganizationProfileUpdateRequestInput = {
  name: string;
  timezone: string;
  currencyCode: string;
  clientActionId?: string;
};

export type OrganizationProfileUpdateRequestPayload = {
  name: string;
  timezone: string;
  currencyCode: string;
  clientActionId: string | null;
};

export async function requestMemberInvitation(
  input: MemberInviteRequestInput
): Promise<LowRiskAdminActionResult<MemberInviteRequestPayload>> {
  const guard = await requireGuardedAdminAction({
    actionId: "admin.member.invite.request",
    requiredPermission: "members.manage"
  });

  if (!guard.ok) {
    return denied(guard);
  }

  const validation = validateMemberInviteInput(input);

  if (!validation.ok) {
    return validation;
  }

  return skeletonAccepted(guard, validation.payload);
}

export async function requestOrganizationProfileUpdate(
  input: OrganizationProfileUpdateRequestInput
): Promise<LowRiskAdminActionResult<OrganizationProfileUpdateRequestPayload>> {
  const guard = await requireGuardedAdminAction({
    actionId: "admin.organization.profile.update.request",
    requiredPermission: "organization.settings.edit"
  });

  if (!guard.ok) {
    return denied(guard);
  }

  const validation = validateOrganizationProfileInput(input);

  if (!validation.ok) {
    return validation;
  }

  return skeletonAccepted(guard, validation.payload);
}

function validateMemberInviteInput(
  input: MemberInviteRequestInput
): LowRiskAdminActionResult<MemberInviteRequestPayload> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const roleIds = Array.from(new Set(input.roleIds ?? [])).map((roleId) => roleId.trim());
  const fieldErrors: Record<string, string> = {};

  if (!isValidEmail(email)) {
    fieldErrors.email = "A valid email address is required.";
  }

  for (const roleId of roleIds) {
    if (!isUuid(roleId)) {
      fieldErrors.roleIds = "Role IDs must be UUIDs.";
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError("admin.member.invite.request", fieldErrors);
  }

  return {
    ok: true,
    code: "not_implemented",
    actionId: "admin.member.invite.request",
    message: "Member invitation skeleton passed guard and validation; database write is intentionally not enabled yet.",
    permission: "members.manage",
    organizationId: "",
    actorEmail: null,
    tenantScoped: true,
    auditRequired: true,
    serviceRoleBoundary: "server_only_not_used_in_skeleton",
    payload: {
      email,
      roleIds,
      clientActionId: normalizeOptionalTrace(input.clientActionId)
    }
  };
}

function validateOrganizationProfileInput(
  input: OrganizationProfileUpdateRequestInput
): LowRiskAdminActionResult<OrganizationProfileUpdateRequestPayload> {
  const name = String(input.name ?? "").trim();
  const timezone = String(input.timezone ?? "").trim();
  const currencyCode = String(input.currencyCode ?? "").trim().toUpperCase();
  const fieldErrors: Record<string, string> = {};

  if (name.length < 1 || name.length > 200) {
    fieldErrors.name = "Organization name must be 1-200 characters.";
  }

  if (!/^[A-Za-z0-9_+\-/]+(?:\/[A-Za-z0-9_+\-]+)*$/.test(timezone) || timezone.length > 80) {
    fieldErrors.timezone = "Timezone must be a valid IANA-style identifier.";
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    fieldErrors.currencyCode = "Currency code must be a 3-letter ISO-style code.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError("admin.organization.profile.update.request", fieldErrors);
  }

  return {
    ok: true,
    code: "not_implemented",
    actionId: "admin.organization.profile.update.request",
    message:
      "Organization profile update skeleton passed guard and validation; database write is intentionally not enabled yet.",
    permission: "organization.settings.edit",
    organizationId: "",
    actorEmail: null,
    tenantScoped: true,
    auditRequired: true,
    serviceRoleBoundary: "server_only_not_used_in_skeleton",
    payload: {
      name,
      timezone,
      currencyCode,
      clientActionId: normalizeOptionalTrace(input.clientActionId)
    }
  };
}

function skeletonAccepted<TPayload>(
  guard: GuardedAdminActionSuccess,
  payload: TPayload
): LowRiskAdminActionResult<TPayload> {
  return {
    ok: true,
    code: "not_implemented",
    actionId: guard.actionId,
    message: "Guarded action skeleton passed. Persistence is intentionally disabled until the action contract is approved for writes.",
    permission: guard.requiredPermission,
    organizationId: guard.organizationId,
    actorEmail: guard.actorEmail,
    tenantScoped: true,
    auditRequired: guard.auditRequired,
    serviceRoleBoundary: "server_only_not_used_in_skeleton",
    payload
  };
}

function denied<TPayload>(
  guard: GuardedAdminActionFailure
): LowRiskAdminActionResult<TPayload> {
  return {
    ok: false,
    code: guard.code,
    actionId: guard.actionId,
    message: guard.message
  };
}

function validationError<TPayload>(
  actionId: string,
  fieldErrors: Record<string, string>
): LowRiskAdminActionResult<TPayload> {
  return {
    ok: false,
    code: "validation_error",
    actionId,
    message: "Input validation failed.",
    fieldErrors
  };
}

function isValidEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeOptionalTrace(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 && normalized.length <= 120 ? normalized : null;
}
