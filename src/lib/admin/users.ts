import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UsersReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type UsersReadModel = {
  context: AdminShellContext;
  state: UsersReadModelState;
  metrics: UsersReadMetrics;
  members: MemberSummary[];
  roles: RoleSummary[];
  permissions: PermissionSummary[];
  rolePermissions: RolePermissionSummary[];
  invitations: InvitationSummary[];
  manageVisible: boolean;
  auditVisible: boolean;
  errorMessage: string | null;
};

export type MemberSummary = {
  id: string;
  profileId: string;
  displayName: string;
  profileStatus: string;
  membershipStatus: string;
  roleIds: string[];
  roleLabels: string[];
  permissionCount: number;
  isDefault: boolean;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  status: string;
  isSystemRole: boolean;
  memberCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PermissionSummary = {
  id: string;
  code: string;
  name: string;
  roleCount: number;
};

export type RolePermissionSummary = {
  id: string;
  roleId: string;
  roleLabel: string;
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  createdAt: string;
};

export type InvitationSummary = {
  id: string;
  email: string;
  status: string;
  invitedByLabel: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

type UsersReadMetrics = {
  memberCount: number;
  activeMemberCount: number;
  invitedMemberCount: number;
  suspendedMemberCount: number;
  roleCount: number;
  systemRoleCount: number;
  permissionCount: number;
  pendingInvitationCount: number;
};

type MembershipRow = {
  id: string;
  profile_id: string;
  status: string;
  is_default: boolean;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  status: string;
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
};

type PermissionRow = {
  id: string;
  code: string;
  name: string;
};

type MembershipRoleRow = {
  membership_id: string;
  role_id: string;
  created_at: string;
};

type RolePermissionRow = {
  role_id: string;
  permission_id: string;
  created_at: string;
};

type InvitationRow = {
  id: string;
  email: string;
  status: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const emptyMetrics: UsersReadMetrics = {
  memberCount: 0,
  activeMemberCount: 0,
  invitedMemberCount: 0,
  suspendedMemberCount: 0,
  roleCount: 0,
  systemRoleCount: 0,
  permissionCount: 0,
  pendingInvitationCount: 0
};

export async function getUsersReadModel(): Promise<UsersReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("members.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: membershipData, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("id, profile_id, status, is_default, joined_at, created_at, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("created_at", { ascending: false })
    .limit(150);

  if (membershipError) {
    return queryErrorModel(context, membershipError.message);
  }

  const memberships = (membershipData ?? []) as MembershipRow[];
  const profileIds = memberships.map((membership) => membership.profile_id);
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, status")
    .in("id", nonEmptyIds(profileIds))
    .limit(150);

  if (profileError) {
    return queryErrorModel(context, profileError.message);
  }

  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id, code, name, status, is_system_role, created_at, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("code", { ascending: true })
    .limit(100);

  if (roleError) {
    return queryErrorModel(context, roleError.message);
  }

  const membershipIds = memberships.map((membership) => membership.id);
  const roles = (roleData ?? []) as RoleRow[];
  const roleIds = roles.map((role) => role.id);
  const { data: membershipRoleData, error: membershipRoleError } = await supabase
    .from("membership_roles")
    .select("membership_id, role_id, created_at")
    .in("membership_id", nonEmptyIds(membershipIds))
    .limit(300);

  if (membershipRoleError) {
    return queryErrorModel(context, membershipRoleError.message);
  }

  const { data: rolePermissionData, error: rolePermissionError } = await supabase
    .from("role_permissions")
    .select("role_id, permission_id, created_at")
    .in("role_id", nonEmptyIds(roleIds))
    .limit(600);

  if (rolePermissionError) {
    return queryErrorModel(context, rolePermissionError.message);
  }

  const rolePermissions = (rolePermissionData ?? []) as RolePermissionRow[];
  const permissionIds = rolePermissions.map((rolePermission) => rolePermission.permission_id);
  const { data: permissionData, error: permissionError } = await supabase
    .from("permissions")
    .select("id, code, name")
    .in("id", nonEmptyIds(permissionIds))
    .order("code", { ascending: true })
    .limit(300);

  if (permissionError) {
    return queryErrorModel(context, permissionError.message);
  }

  const { data: invitationData, error: invitationError } = await supabase
    .from("organization_invitations")
    .select("id, email, status, invited_by, expires_at, accepted_at, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("created_at", { ascending: false })
    .limit(75);

  if (invitationError) {
    return queryErrorModel(context, invitationError.message);
  }

  const profiles = (profileData ?? []) as ProfileRow[];
  const permissions = (permissionData ?? []) as PermissionRow[];
  const membershipRoles = (membershipRoleData ?? []) as MembershipRoleRow[];
  const profileLabels = mapProfileLabels(profiles);
  const profileStatuses = mapProfileStatuses(profiles);
  const roleLabels = mapRoleLabels(roles);
  const permissionLabels = mapPermissionLabels(permissions);
  const roleIdsByMembership = mapRoleIdsByMembership(membershipRoles);
  const permissionIdsByRole = mapPermissionIdsByRole(rolePermissions);
  const roleMemberCounts = mapRoleMemberCounts(membershipRoles);
  const permissionRoleCounts = mapPermissionRoleCounts(rolePermissions);
  const memberSummaries = memberships.map((membership) =>
    toMemberSummary(
      membership,
      profileLabels,
      profileStatuses,
      roleLabels,
      roleIdsByMembership,
      permissionIdsByRole
    )
  );
  const roleSummaries = roles.map((role) =>
    toRoleSummary(role, roleMemberCounts, permissionIdsByRole)
  );
  const permissionSummaries = permissions.map((permission) =>
    toPermissionSummary(permission, permissionRoleCounts)
  );
  const rolePermissionSummaries = rolePermissions.map((rolePermission) =>
    toRolePermissionSummary(rolePermission, roleLabels, permissionLabels)
  );
  const invitationSummaries = ((invitationData ?? []) as InvitationRow[]).map((invitation) =>
    toInvitationSummary(invitation, profileLabels)
  );

  return {
    context,
    state: "ready",
    metrics: {
      memberCount: memberSummaries.length,
      activeMemberCount: memberSummaries.filter((member) => member.membershipStatus === "ACTIVE").length,
      invitedMemberCount: memberSummaries.filter((member) => member.membershipStatus === "INVITED").length,
      suspendedMemberCount: memberSummaries.filter((member) => member.membershipStatus === "SUSPENDED").length,
      roleCount: roleSummaries.length,
      systemRoleCount: roleSummaries.filter((role) => role.isSystemRole).length,
      permissionCount: permissionSummaries.length,
      pendingInvitationCount: invitationSummaries.filter((invitation) => invitation.status === "PENDING").length
    },
    members: memberSummaries,
    roles: roleSummaries,
    permissions: permissionSummaries,
    rolePermissions: rolePermissionSummaries,
    invitations: invitationSummaries,
    manageVisible: context.permissions.includes("members.manage"),
    auditVisible: context.permissions.includes("audit.view"),
    errorMessage: null
  };
}

function mapProfileLabels(rows: ProfileRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((profile) => labels.set(profile.id, profile.display_name));
  return labels;
}

function mapProfileStatuses(rows: ProfileRow[]) {
  const statuses = new Map<string, string>();
  rows.forEach((profile) => statuses.set(profile.id, profile.status));
  return statuses;
}

function mapRoleLabels(rows: RoleRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((role) => labels.set(role.id, `${role.code} / ${role.name}`));
  return labels;
}

function mapPermissionLabels(rows: PermissionRow[]) {
  const labels = new Map<string, { code: string; name: string }>();
  rows.forEach((permission) => labels.set(permission.id, { code: permission.code, name: permission.name }));
  return labels;
}

function mapRoleIdsByMembership(rows: MembershipRoleRow[]) {
  const roleIds = new Map<string, string[]>();
  rows.forEach((membershipRole) => {
    const current = roleIds.get(membershipRole.membership_id) ?? [];
    roleIds.set(membershipRole.membership_id, current.concat(membershipRole.role_id));
  });
  return roleIds;
}

function mapPermissionIdsByRole(rows: RolePermissionRow[]) {
  const permissionIds = new Map<string, string[]>();
  rows.forEach((rolePermission) => {
    const current = permissionIds.get(rolePermission.role_id) ?? [];
    permissionIds.set(rolePermission.role_id, current.concat(rolePermission.permission_id));
  });
  return permissionIds;
}

function mapRoleMemberCounts(rows: MembershipRoleRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((membershipRole) => {
    counts.set(membershipRole.role_id, (counts.get(membershipRole.role_id) ?? 0) + 1);
  });
  return counts;
}

function mapPermissionRoleCounts(rows: RolePermissionRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((rolePermission) => {
    counts.set(rolePermission.permission_id, (counts.get(rolePermission.permission_id) ?? 0) + 1);
  });
  return counts;
}

function toMemberSummary(
  membership: MembershipRow,
  profileLabels: Map<string, string>,
  profileStatuses: Map<string, string>,
  roleLabels: Map<string, string>,
  roleIdsByMembership: Map<string, string[]>,
  permissionIdsByRole: Map<string, string[]>
): MemberSummary {
  const roleIds = roleIdsByMembership.get(membership.id) ?? [];
  const permissionIds = new Set(roleIds.flatMap((roleId) => permissionIdsByRole.get(roleId) ?? []));

  return {
    id: membership.id,
    profileId: membership.profile_id,
    displayName: profileLabels.get(membership.profile_id) ?? membership.profile_id,
    profileStatus: profileStatuses.get(membership.profile_id) ?? "-",
    membershipStatus: membership.status,
    roleIds,
    roleLabels: roleIds.map((roleId) => roleLabels.get(roleId) ?? roleId),
    permissionCount: permissionIds.size,
    isDefault: membership.is_default,
    joinedAt: membership.joined_at,
    createdAt: membership.created_at,
    updatedAt: membership.updated_at
  };
}

function toRoleSummary(
  role: RoleRow,
  roleMemberCounts: Map<string, number>,
  permissionIdsByRole: Map<string, string[]>
): RoleSummary {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    status: role.status,
    isSystemRole: role.is_system_role,
    memberCount: roleMemberCounts.get(role.id) ?? 0,
    permissionCount: permissionIdsByRole.get(role.id)?.length ?? 0,
    createdAt: role.created_at,
    updatedAt: role.updated_at
  };
}

function toPermissionSummary(
  permission: PermissionRow,
  permissionRoleCounts: Map<string, number>
): PermissionSummary {
  return {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    roleCount: permissionRoleCounts.get(permission.id) ?? 0
  };
}

function toRolePermissionSummary(
  rolePermission: RolePermissionRow,
  roleLabels: Map<string, string>,
  permissionLabels: Map<string, { code: string; name: string }>
): RolePermissionSummary {
  const permission = permissionLabels.get(rolePermission.permission_id);

  return {
    id: `${rolePermission.role_id}:${rolePermission.permission_id}`,
    roleId: rolePermission.role_id,
    roleLabel: roleLabels.get(rolePermission.role_id) ?? rolePermission.role_id,
    permissionId: rolePermission.permission_id,
    permissionCode: permission?.code ?? rolePermission.permission_id,
    permissionName: permission?.name ?? rolePermission.permission_id,
    createdAt: rolePermission.created_at
  };
}

function toInvitationSummary(
  invitation: InvitationRow,
  profileLabels: Map<string, string>
): InvitationSummary {
  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    invitedByLabel: profileLabels.get(invitation.invited_by) ?? invitation.invited_by,
    expiresAt: invitation.expires_at,
    acceptedAt: invitation.accepted_at,
    createdAt: invitation.created_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: UsersReadModelState
): UsersReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    members: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    invitations: [],
    manageVisible: false,
    auditVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): UsersReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    members: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    invitations: [],
    manageVisible: false,
    auditVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}
