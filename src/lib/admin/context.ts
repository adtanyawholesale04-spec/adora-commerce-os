import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { cookies } from "next/headers";

type AdminShellMode = "configured" | "missing_env" | "anonymous";

export const ACTIVE_ORGANIZATION_COOKIE = "acos_active_organization_id";

export type AdminMembershipOption = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  membershipStatus: string;
  isDefault: boolean;
  isActive: boolean;
};

export type AdminShellContext = {
  mode: AdminShellMode;
  userEmail: string | null;
  profileId: string | null;
  activeOrganizationId: string | null;
  organizationName: string | null;
  organizationStatus: string | null;
  membershipStatus: string | null;
  memberships: AdminMembershipOption[];
  permissions: string[];
};

export async function getAdminShellContext(): Promise<AdminShellContext> {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  if (!supabaseUrl || !supabasePublishableKey) {
    return emptyContext("missing_env");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return emptyContext("anonymous");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ...emptyContext("configured"),
      userEmail: user.email ?? null,
      profileId: null,
      membershipStatus: "NO_PROFILE"
    };
  }

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select(
      "id, organization_id, status, is_default, organization:organizations(id, name, status)"
    )
    .eq("profile_id", profile.id)
    .eq("status", "ACTIVE")
    .order("is_default", { ascending: false });

  const membershipOptions = extractMembershipOptions(memberships);

  if (membershipOptions.length === 0) {
    return {
      ...emptyContext("configured"),
      userEmail: user.email ?? null,
      profileId: profile.id,
      membershipStatus: "NO_ACTIVE_MEMBERSHIP"
    };
  }

  const cookieStore = await cookies();
  const requestedOrganizationId =
    cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null;
  const activeMembership =
    membershipOptions.find(
      (membership) => membership.organizationId === requestedOrganizationId
    ) ??
    membershipOptions.find((membership) => membership.isDefault) ??
    membershipOptions[0];

  const { data: permissions } = await supabase
    .from("membership_roles")
    .select("role:roles(role_permissions(permission:permissions(code)))")
    .eq("membership_id", activeMembership.membershipId);

  return {
    mode: "configured",
    userEmail: user.email ?? null,
    profileId: profile.id,
    activeOrganizationId: activeMembership.organizationId,
    organizationName: activeMembership.organizationName,
    organizationStatus: activeMembership.organizationStatus,
    membershipStatus: activeMembership.membershipStatus,
    memberships: membershipOptions.map((membership) => ({
      ...membership,
      isActive: membership.organizationId === activeMembership.organizationId
    })),
    permissions: extractPermissionCodes(permissions)
  };
}

function emptyContext(mode: AdminShellMode): AdminShellContext {
  return {
    mode,
    userEmail: null,
    profileId: null,
    activeOrganizationId: null,
    organizationName: null,
    organizationStatus: null,
    membershipStatus: null,
    memberships: [],
    permissions: []
  };
}

type MembershipJoinRow = {
  id: string;
  organization_id: string;
  status: string;
  is_default: boolean | null;
  organization:
    | {
        id: string;
        name: string;
        status: string;
      }
    | Array<{
        id: string;
        name: string;
        status: string;
      }>
    | null;
};

function extractMembershipOptions(
  rows: MembershipJoinRow[] | null
): AdminMembershipOption[] {
  return (
    rows?.flatMap((row) => {
      const organization = firstOrNull(row.organization);

      if (!organization) {
        return [];
      }

      return [
        {
          membershipId: row.id,
          organizationId: row.organization_id,
          organizationName: organization.name,
          organizationStatus: organization.status,
          membershipStatus: row.status,
          isDefault: row.is_default ?? false,
          isActive: false
        }
      ];
    }) ?? []
  );
}

type PermissionJoinRow = {
  role: RoleJoin | RoleJoin[] | null;
};

type RoleJoin = {
  role_permissions: RolePermissionJoin | RolePermissionJoin[] | null;
};

type RolePermissionJoin = {
  permission: PermissionJoin | PermissionJoin[] | null;
};

type PermissionJoin = {
  code: string | null;
};

function extractPermissionCodes(rows: PermissionJoinRow[] | null): string[] {
  const codes = new Set<string>();

  rows?.forEach((row) => {
    asArray(row.role).forEach((role) => {
      asArray(role.role_permissions).forEach((rolePermission) => {
        asArray(rolePermission.permission).forEach((permission) => {
          if (permission.code) {
            codes.add(permission.code);
          }
        });
      });
    });
  });

  return Array.from(codes).sort();
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
