import "server-only";

import {
  requireGuardedAdminAction,
  type GuardedAdminActionFailure,
  type GuardedAdminActionSuccess
} from "@/lib/admin/actions/guarded";
import {
  createSupabaseAuthAdminClient,
  getSupabaseInviteRedirectUrlForInvitation,
  SupabaseAuthAdminConfigError
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LowRiskAdminActionCode =
  | GuardedAdminActionFailure["code"]
  | "validation_error"
  | "role_assignment_not_supported"
  | "email_already_invited_or_member"
  | "auth_admin_not_configured"
  | "auth_admin_redirect_not_configured"
  | "auth_admin_invite_failed"
  | "auth_admin_audit_error"
  | "persistence_error"
  | "role_assignment_error"
  | "role_removal_error"
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
      code: "not_implemented" | "persisted" | "duplicate_reused";
      actionId: string;
      message: string;
      permission: string;
      organizationId: string;
      actorProfileId: string | null;
      actorEmail: string | null;
      tenantScoped: true;
      auditRequired: true;
      serviceRoleBoundary:
        | "server_only_not_used_in_skeleton"
        | "server_only_not_used"
        | "server_only_auth_admin_secret";
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
  invitationId?: string;
  status?: "PENDING";
  expiresAt?: string;
  reusedExisting?: boolean;
  ttlDays?: 7;
  authAdminEmailSent?: boolean;
  authAdminUserId?: string | null;
  authAdminEmailSentAt?: string;
  authAdminEmailSkippedReason?: "already_sent";
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

export type MemberRoleAssignmentInput = {
  membershipId: string;
  roleId: string;
  reason?: string;
  clientActionId?: string;
};

export type MemberRoleAssignmentPayload = {
  membershipId: string;
  roleId: string;
  reason: string | null;
  clientActionId: string | null;
  roleAssigned?: boolean;
  alreadyAssigned?: boolean;
  auditLogId?: string;
};

export type MemberRoleRemovalInput = {
  membershipId: string;
  roleId: string;
  reason?: string;
  clientActionId?: string;
};

export type MemberRoleRemovalPayload = {
  membershipId: string;
  roleId: string;
  reason: string | null;
  clientActionId: string | null;
  roleRemoved?: boolean;
  alreadyRemoved?: boolean;
  remainingRoleCount?: number;
  auditLogId?: string;
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

  if (validation.payload.roleIds.length > 0) {
    return actionError("admin.member.invite.request", "role_assignment_not_supported", {
      roleIds:
        "Invitation role assignment is not supported until the invitation-role persistence contract is implemented."
    });
  }

  return persistMemberInvitation(guard, validation.payload);
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

export async function requestMemberRoleAssignment(
  input: MemberRoleAssignmentInput
): Promise<LowRiskAdminActionResult<MemberRoleAssignmentPayload>> {
  const guard = await requireGuardedAdminAction({
    actionId: "admin.member.role.assign.request",
    requiredPermission: "members.manage"
  });

  if (!guard.ok) {
    return denied(guard);
  }

  const validation = validateMemberRoleAssignmentInput(input);

  if (!validation.ok) {
    return validation;
  }

  return assignMemberRole(guard, validation.payload);
}

export async function requestMemberRoleRemoval(
  input: MemberRoleRemovalInput
): Promise<LowRiskAdminActionResult<MemberRoleRemovalPayload>> {
  const guard = await requireGuardedAdminAction({
    actionId: "admin.member.role.remove.request",
    requiredPermission: "members.manage"
  });

  if (!guard.ok) {
    return denied(guard);
  }

  const validation = validateMemberRoleRemovalInput(input);

  if (!validation.ok) {
    return validation;
  }

  return removeMemberRole(guard, validation.payload);
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
    actorProfileId: null,
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
    actorProfileId: null,
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

function validateMemberRoleAssignmentInput(
  input: MemberRoleAssignmentInput
): LowRiskAdminActionResult<MemberRoleAssignmentPayload> {
  const membershipId = String(input.membershipId ?? "").trim();
  const roleId = String(input.roleId ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  if (!isUuid(membershipId)) {
    fieldErrors.membershipId = "Membership ID must be a UUID.";
  }

  if (!isUuid(roleId)) {
    fieldErrors.roleId = "Role ID must be a UUID.";
  }

  if (reason.length > 500) {
    fieldErrors.reason = "Reason must be 500 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError("admin.member.role.assign.request", fieldErrors);
  }

  return {
    ok: true,
    code: "not_implemented",
    actionId: "admin.member.role.assign.request",
    message: "Member role assignment passed validation.",
    permission: "members.manage",
    organizationId: "",
    actorProfileId: null,
    actorEmail: null,
    tenantScoped: true,
    auditRequired: true,
    serviceRoleBoundary: "server_only_not_used",
    payload: {
      membershipId,
      roleId,
      reason: reason || null,
      clientActionId: normalizeOptionalTrace(input.clientActionId)
    }
  };
}

function validateMemberRoleRemovalInput(
  input: MemberRoleRemovalInput
): LowRiskAdminActionResult<MemberRoleRemovalPayload> {
  const membershipId = String(input.membershipId ?? "").trim();
  const roleId = String(input.roleId ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  if (!isUuid(membershipId)) {
    fieldErrors.membershipId = "Membership ID must be a UUID.";
  }

  if (!isUuid(roleId)) {
    fieldErrors.roleId = "Role ID must be a UUID.";
  }

  if (reason.length > 500) {
    fieldErrors.reason = "Reason must be 500 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError("admin.member.role.remove.request", fieldErrors);
  }

  return {
    ok: true,
    code: "not_implemented",
    actionId: "admin.member.role.remove.request",
    message: "Member role removal passed validation.",
    permission: "members.manage",
    organizationId: "",
    actorProfileId: null,
    actorEmail: null,
    tenantScoped: true,
    auditRequired: true,
    serviceRoleBoundary: "server_only_not_used",
    payload: {
      membershipId,
      roleId,
      reason: reason || null,
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
    actorProfileId: guard.actorProfileId,
    actorEmail: guard.actorEmail,
    tenantScoped: true,
    auditRequired: guard.auditRequired,
    serviceRoleBoundary: "server_only_not_used_in_skeleton",
    payload
  };
}

type MemberInvitationRpcRow = {
  invitation_id: string;
  invitation_status: "PENDING";
  expires_at: string;
  reused_existing: boolean;
};

async function persistMemberInvitation(
  guard: GuardedAdminActionSuccess,
  payload: MemberInviteRequestPayload
): Promise<LowRiskAdminActionResult<MemberInviteRequestPayload>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("api_request_member_invitation", {
    p_organization_id: guard.organizationId,
    p_email: payload.email,
    p_client_request_id: uuidOrNull(payload.clientActionId)
  });

  if (error) {
    return mapPersistenceError(error.message);
  }

  const row = Array.isArray(data) ? (data[0] as MemberInvitationRpcRow | undefined) : undefined;

  if (!row) {
    return actionError("admin.member.invite.request", "persistence_error");
  }

  const persistedPayload: MemberInviteRequestPayload = {
    ...payload,
    invitationId: row.invitation_id,
    status: row.invitation_status,
    expiresAt: row.expires_at,
    reusedExisting: row.reused_existing,
    ttlDays: 7
  };
  const emailSend = await sendMemberInvitationEmail(guard, supabase, persistedPayload);

  if (!emailSend.ok) {
    return emailSend;
  }

  return {
    ok: true,
    code: row.reused_existing ? "duplicate_reused" : "persisted",
    actionId: guard.actionId,
    message: row.reused_existing
      ? "Existing pending member invitation reused; Auth invite email boundary completed."
      : "Member invitation persisted; Auth invite email boundary completed.",
    permission: guard.requiredPermission,
    organizationId: guard.organizationId,
    actorProfileId: guard.actorProfileId,
    actorEmail: guard.actorEmail,
    tenantScoped: true,
    auditRequired: guard.auditRequired,
    serviceRoleBoundary: "server_only_auth_admin_secret",
    payload: emailSend.payload
  };
}

type SupabaseRpcClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type MemberRoleAssignmentRpcRow = {
  membership_id: string;
  role_id: string;
  role_assigned: boolean;
  already_assigned: boolean;
  audit_log_id: string;
};

type MemberRoleRemovalRpcRow = {
  membership_id: string;
  role_id: string;
  role_removed: boolean;
  already_removed: boolean;
  remaining_role_count: number;
  audit_log_id: string;
};

async function assignMemberRole(
  guard: GuardedAdminActionSuccess,
  payload: MemberRoleAssignmentPayload
): Promise<LowRiskAdminActionResult<MemberRoleAssignmentPayload>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("api_assign_member_role", {
    p_organization_id: guard.organizationId,
    p_membership_id: payload.membershipId,
    p_role_id: payload.roleId,
    p_client_request_id: uuidOrNull(payload.clientActionId),
    p_reason: payload.reason
  });

  if (error) {
    return actionError("admin.member.role.assign.request", "role_assignment_error");
  }

  const row = Array.isArray(data) ? (data[0] as MemberRoleAssignmentRpcRow | undefined) : undefined;

  if (!row) {
    return actionError("admin.member.role.assign.request", "role_assignment_error");
  }

  return {
    ok: true,
    code: row.already_assigned ? "duplicate_reused" : "persisted",
    actionId: guard.actionId,
    message: row.already_assigned
      ? "Member already has this role; duplicate assignment was audited."
      : "Member role assignment was persisted and audited.",
    permission: guard.requiredPermission,
    organizationId: guard.organizationId,
    actorProfileId: guard.actorProfileId,
    actorEmail: guard.actorEmail,
    tenantScoped: true,
    auditRequired: guard.auditRequired,
    serviceRoleBoundary: "server_only_not_used",
    payload: {
      ...payload,
      membershipId: row.membership_id,
      roleId: row.role_id,
      roleAssigned: row.role_assigned,
      alreadyAssigned: row.already_assigned,
      auditLogId: row.audit_log_id
    }
  };
}

async function removeMemberRole(
  guard: GuardedAdminActionSuccess,
  payload: MemberRoleRemovalPayload
): Promise<LowRiskAdminActionResult<MemberRoleRemovalPayload>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("api_remove_member_role", {
    p_organization_id: guard.organizationId,
    p_membership_id: payload.membershipId,
    p_role_id: payload.roleId,
    p_client_request_id: uuidOrNull(payload.clientActionId),
    p_reason: payload.reason
  });

  if (error) {
    return actionError("admin.member.role.remove.request", "role_removal_error");
  }

  const row = Array.isArray(data) ? (data[0] as MemberRoleRemovalRpcRow | undefined) : undefined;

  if (!row) {
    return actionError("admin.member.role.remove.request", "role_removal_error");
  }

  return {
    ok: true,
    code: row.already_removed ? "duplicate_reused" : "persisted",
    actionId: guard.actionId,
    message: row.already_removed
      ? "Member already does not have this role; duplicate removal was audited."
      : "Member role removal was persisted and audited.",
    permission: guard.requiredPermission,
    organizationId: guard.organizationId,
    actorProfileId: guard.actorProfileId,
    actorEmail: guard.actorEmail,
    tenantScoped: true,
    auditRequired: guard.auditRequired,
    serviceRoleBoundary: "server_only_not_used",
    payload: {
      ...payload,
      membershipId: row.membership_id,
      roleId: row.role_id,
      roleRemoved: row.role_removed,
      alreadyRemoved: row.already_removed,
      remainingRoleCount: row.remaining_role_count,
      auditLogId: row.audit_log_id
    }
  };
}

type MemberInvitationEmailPreparationRpcRow = {
  invitation_id: string;
  invite_email: string;
  should_send: boolean;
  already_sent: boolean;
};

async function sendMemberInvitationEmail(
  guard: GuardedAdminActionSuccess,
  supabase: SupabaseRpcClient,
  payload: MemberInviteRequestPayload
): Promise<LowRiskAdminActionResult<MemberInviteRequestPayload>> {
  if (!payload.invitationId) {
    return actionError("admin.member.invite.request", "persistence_error");
  }

  const { data, error } = await supabase.rpc("api_prepare_member_invitation_email_send", {
    p_organization_id: guard.organizationId,
    p_invitation_id: payload.invitationId
  });

  if (error) {
    return actionError("admin.member.invite.request", "auth_admin_audit_error");
  }

  const preparation = Array.isArray(data)
    ? (data[0] as MemberInvitationEmailPreparationRpcRow | undefined)
    : undefined;

  if (!preparation) {
    return actionError("admin.member.invite.request", "auth_admin_audit_error");
  }

  if (!preparation.should_send || preparation.already_sent) {
    return {
      ok: true,
      code: "persisted",
      actionId: guard.actionId,
      message: "Member invitation email was already sent for this pending invite.",
      permission: guard.requiredPermission,
      organizationId: guard.organizationId,
      actorProfileId: guard.actorProfileId,
      actorEmail: guard.actorEmail,
      tenantScoped: true,
      auditRequired: guard.auditRequired,
      serviceRoleBoundary: "server_only_auth_admin_secret",
      payload: {
        ...payload,
        email: preparation.invite_email,
        authAdminEmailSent: false,
        authAdminEmailSkippedReason: "already_sent"
      }
    };
  }

  let redirectTo: string;
  let adminClient: ReturnType<typeof createSupabaseAuthAdminClient>;

  try {
    redirectTo = getSupabaseInviteRedirectUrlForInvitation(payload.invitationId);
    adminClient = createSupabaseAuthAdminClient();
  } catch (error) {
    if (error instanceof SupabaseAuthAdminConfigError) {
      await recordMemberInvitationEmailEvent(supabase, guard, payload, "FAILED", null, error.code);
      return actionError("admin.member.invite.request", error.code);
    }

    await recordMemberInvitationEmailEvent(
      supabase,
      guard,
      payload,
      "FAILED",
      null,
      "auth_admin_not_configured"
    );
    return actionError("admin.member.invite.request", "auth_admin_not_configured");
  }

  const invitedAt = new Date().toISOString();
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(preparation.invite_email, {
      redirectTo,
      data: {
        organization_id: guard.organizationId,
        invitation_id: payload.invitationId
      }
    });

  if (inviteError) {
    await recordMemberInvitationEmailEvent(
      supabase,
      guard,
      payload,
      "FAILED",
      null,
      "auth_admin_invite_failed"
    );
    return actionError("admin.member.invite.request", "auth_admin_invite_failed");
  }

  const authUserId = inviteData.user?.id ?? null;
  const audit = await recordMemberInvitationEmailEvent(
    supabase,
    guard,
    payload,
    "SENT",
    authUserId,
    null
  );

  if (!audit.ok) {
    return actionError("admin.member.invite.request", "auth_admin_audit_error");
  }

  return {
    ok: true,
    code: "persisted",
    actionId: guard.actionId,
    message: "Member invitation email sent through Supabase Auth Admin.",
    permission: guard.requiredPermission,
    organizationId: guard.organizationId,
    actorProfileId: guard.actorProfileId,
    actorEmail: guard.actorEmail,
    tenantScoped: true,
    auditRequired: guard.auditRequired,
    serviceRoleBoundary: "server_only_auth_admin_secret",
    payload: {
      ...payload,
      email: preparation.invite_email,
      authAdminEmailSent: true,
      authAdminUserId: authUserId,
      authAdminEmailSentAt: invitedAt
    }
  };
}

async function recordMemberInvitationEmailEvent(
  supabase: SupabaseRpcClient,
  guard: GuardedAdminActionSuccess,
  payload: MemberInviteRequestPayload,
  deliveryStatus: "SENT" | "FAILED",
  authUserId: string | null,
  errorCode: string | null
) {
  const { error } = await supabase.rpc("api_record_member_invitation_email_event", {
    p_organization_id: guard.organizationId,
    p_invitation_id: payload.invitationId,
    p_client_request_id: uuidOrNull(payload.clientActionId),
    p_delivery_status: deliveryStatus,
    p_auth_user_id: authUserId,
    p_error_code: errorCode
  });

  return { ok: !error };
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

function actionError<TPayload>(
  actionId: string,
  code: Exclude<
    LowRiskAdminActionCode,
    GuardedAdminActionFailure["code"] | "validation_error" | "not_implemented"
  >,
  fieldErrors?: Record<string, string>
): LowRiskAdminActionResult<TPayload> {
  return {
    ok: false,
    code,
    actionId,
    message: actionErrorMessages[code],
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

function uuidOrNull(value: string | null) {
  return value && isUuid(value) ? value : null;
}

function mapPersistenceError<TPayload>(message: string): LowRiskAdminActionResult<TPayload> {
  if (/accepted invitation|membership conflict/i.test(message)) {
    return actionError("admin.member.invite.request", "email_already_invited_or_member");
  }

  return actionError("admin.member.invite.request", "persistence_error");
}

const actionErrorMessages: Record<
  Exclude<
    LowRiskAdminActionCode,
    GuardedAdminActionFailure["code"] | "validation_error" | "not_implemented"
  >,
  string
> = {
  role_assignment_not_supported:
    "Role assignment during invitation is not enabled yet. Send the invitation without role IDs.",
  email_already_invited_or_member:
    "This email already has an accepted invitation or membership conflict.",
  auth_admin_not_configured:
    "Supabase Auth Admin invite email is not configured on the server.",
  auth_admin_redirect_not_configured:
    "Supabase invite redirect URL is not configured on the server.",
  auth_admin_invite_failed:
    "Supabase Auth Admin could not send the invitation email.",
  auth_admin_audit_error:
    "Supabase Auth Admin invitation email could not be audited.",
  persistence_error: "Member invitation could not be persisted.",
  role_assignment_error: "Member role assignment could not be persisted.",
  role_removal_error: "Member role removal could not be persisted."
};
