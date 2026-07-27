import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CircleSlash,
  KeyRound,
  Mail,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { MemberInviteForm } from "@/app/admin/users/member-invite-form";
import { MemberRoleAssignmentForm } from "@/app/admin/users/member-role-assignment-form";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getUsersReadModel,
  type InvitationSummary,
  type MemberSummary,
  type PermissionSummary,
  type RolePermissionSummary,
  type RoleSummary
} from "@/lib/admin/users";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getUsersReadModel();
  const canReadUsers = model.state === "ready";
  const canRequestInvitation = canReadUsers && model.manageVisible;
  const canAssignRole = canReadUsers && model.manageVisible;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="border-b-4 border-b-brand bg-panel px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {copy.common.admin}
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <UsersRound aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.users.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.users.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/users" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} / {copy.users.memberAccess}:{" "}
                {permissionLabel(model.context.permissions, "members.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.users.members} value={model.metrics.memberCount.toString()} />
          <Metric label={copy.users.activeMembers} value={model.metrics.activeMemberCount.toString()} />
          <Metric label={copy.users.roles} value={model.metrics.roleCount.toString()} />
          <Metric label={copy.users.permissions} value={model.metrics.permissionCount.toString()} />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadUsers ? (
              <EmptyState
                title={copy.userStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.userStates[model.state].detail} ${model.errorMessage}`
                    : copy.userStates[model.state].detail
                }
              />
            ) : (
              <>
                <MemberInviteForm
                  copy={copy.users}
                  canRequestInvitation={canRequestInvitation}
                  organizationName={model.context.organizationName ?? copy.common.unavailable}
                  locale={preferences.locale}
                />
                <MemberRoleAssignmentForm
                  copy={copy.users}
                  canAssignRole={canAssignRole}
                  members={model.members}
                  roles={model.roles}
                  currentProfileId={model.context.profileId}
                />
                <MembersTable copy={copy.users} members={model.members} locale={preferences.locale} />
                <RolesTable copy={copy.users} roles={model.roles} locale={preferences.locale} />
                <RolePermissionsTable copy={copy.users} rows={model.rolePermissions} />
                <PermissionsTable copy={copy.users} permissions={model.permissions} />
                <InvitationsTable copy={copy.users} invitations={model.invitations} locale={preferences.locale} />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.users.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.users.memberAccess,
                  permissionLabel(model.context.permissions, "members.view", preferences.locale)
                ],
                [
                  copy.users.managePermission,
                  model.manageVisible ? copy.common.granted : `${copy.common.requires} members.manage`
                ],
                [
                  copy.users.auditPermission,
                  model.auditVisible ? copy.common.granted : `${copy.common.requires} audit.view`
                ],
                [copy.users.authSource, copy.users.supabaseAuthNotSelected]
              ]}
            />
            <BoundaryPanel
              icon={<UserPlus aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.users.guardedActionReadiness}
              rows={[
                [copy.users.inviteUser, copy.users.skeletonReady],
                [copy.users.roleAssignment, copy.users.roleAssignmentServiceReady],
                [copy.users.requiredPermission, "members.manage"],
                [
                  copy.users.permissionState,
                  canRequestInvitation && canAssignRole ? copy.users.readyWithPermission : copy.users.permissionRequired
                ],
                [copy.users.persistence, copy.users.persistenceEnabled],
                [copy.users.audit, copy.users.auditRequired]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.users.blockedInScreen}
              rows={[
                [copy.users.inviteUser, copy.users.dbOnlyInviteBoundary],
                [copy.users.deactivateMember, copy.users.adminServiceRequired],
                [copy.users.roleRemoval, copy.users.adminServiceAuditRequired],
                [copy.users.permissionCatalogEdit, copy.users.forbiddenNoNewPermission],
                [copy.users.supportAccessGrant, copy.users.supportGrantWorkflowRequired]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.users.snapshotScope}
              rows={[
                [copy.users.memberLimit, copy.users.oneHundredFiftyLatest],
                [copy.users.roleLimit, copy.users.oneHundredLatest],
                [copy.users.permissionLimit, copy.users.threeHundredLatest],
                [copy.users.rolePermissionLimit, copy.users.sixHundredLatest],
                [copy.users.invitationLimit, copy.users.seventyFiveLatest],
                [copy.users.authUserData, copy.users.notSelected]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function MembersTable({
  copy,
  members,
  locale
}: {
  copy: Record<string, string>;
  members: MemberSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<UserRound aria-hidden className="h-4 w-4 text-brand" />} title={copy.memberDirectory} count={`${members.length} ${copy.members}`} />
      {members.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noMembers}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.member}</th>
                <th className="px-5 py-3 font-medium">{copy.membershipStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.profileStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.roles}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.permissions}</th>
                <th className="px-5 py-3 font-medium">{copy.defaultOrg}</th>
                <th className="px-5 py-3 font-medium">{copy.joined}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{member.displayName}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted">{member.profileId}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={member.membershipStatus} /></td>
                  <td className="px-5 py-4"><StatusBadge status={member.profileStatus} /></td>
                  <td className="px-5 py-4">
                    <p className="max-w-[300px] truncate">{member.roleLabels.join(", ") || "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{formatNumber(member.permissionCount, locale)}</td>
                  <td className="px-5 py-4"><StatusBadge status={member.isDefault ? "DEFAULT" : "MEMBER"} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(member.joinedAt, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(member.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RolesTable({
  copy,
  roles,
  locale
}: {
  copy: Record<string, string>;
  roles: RoleSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />} title={copy.roleMatrix} count={`${roles.length} ${copy.roles}`} />
      {roles.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noRoles}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.role}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.systemRole}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.members}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.permissions}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{role.code}</p>
                    <p className="max-w-[280px] truncate text-xs text-muted">{role.name}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={role.status} /></td>
                  <td className="px-5 py-4"><StatusBadge status={role.isSystemRole ? "SYSTEM" : "CUSTOM"} /></td>
                  <td className="px-5 py-4 text-right font-medium">{formatNumber(role.memberCount, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatNumber(role.permissionCount, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(role.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RolePermissionsTable({ copy, rows }: { copy: Record<string, string>; rows: RolePermissionSummary[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<KeyRound aria-hidden className="h-4 w-4 text-brand" />} title={copy.rolePermissions} count={`${rows.length} ${copy.permissions}`} />
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noRolePermissions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.role}</th>
                <th className="px-5 py-3 font-medium">{copy.permissionCode}</th>
                <th className="px-5 py-3 font-medium">{copy.permissionName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4"><p className="max-w-[280px] truncate font-semibold">{row.roleLabel}</p></td>
                  <td className="px-5 py-4"><StatusBadge status={row.permissionCode} /></td>
                  <td className="px-5 py-4"><p className="max-w-[320px] truncate">{row.permissionName}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PermissionsTable({ copy, permissions }: { copy: Record<string, string>; permissions: PermissionSummary[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<KeyRound aria-hidden className="h-4 w-4 text-brand" />} title={copy.permissionCatalog} count={`${permissions.length} ${copy.permissions}`} />
      {permissions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noPermissions}</p>
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {permissions.map((permission) => (
            <div key={permission.id} className="rounded-lg border border-line bg-panel-strong p-4">
              <p className="break-words text-sm font-semibold">{permission.code}</p>
              <p className="mt-1 text-xs text-muted">{permission.name}</p>
              <p className="mt-3 text-xs font-medium text-brand">
                {permission.roleCount} {copy.roles}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InvitationsTable({
  copy,
  invitations,
  locale
}: {
  copy: Record<string, string>;
  invitations: InvitationSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<Mail aria-hidden className="h-4 w-4 text-brand" />} title={copy.invitations} count={`${invitations.length} ${copy.invitations}`} />
      {invitations.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noInvitations}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.email}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.invitedBy}</th>
                <th className="px-5 py-3 font-medium">{copy.expires}</th>
                <th className="px-5 py-3 font-medium">{copy.accepted}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{invitation.email}</td>
                  <td className="px-5 py-4"><StatusBadge status={invitation.status} /></td>
                  <td className="px-5 py-4"><p className="max-w-[220px] truncate">{invitation.invitedByLabel}</p></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(invitation.expiresAt, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(invitation.acceptedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SectionHeader({ icon, title, count }: { icon: ReactNode; title: string; count: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <span className="text-xs text-muted">{count}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line border-t-2 border-t-brand bg-panel p-5 shadow-[var(--shadow-panel)]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

function statusBadgeClass(status: string) {
  if (["ACTIVE", "DEFAULT", "SYSTEM", "ACCEPTED"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["SUSPENDED", "REMOVED", "INACTIVE", "REVOKED", "EXPIRED"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["INVITED", "PENDING", "MEMBER", "CUSTOM"].includes(status)) {
    return "border-warning/30 bg-warning/10 text-accent";
  }

  return "border-line bg-panel-strong text-muted";
}

function BoundaryPanel({
  icon,
  title,
  rows
}: {
  icon: ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <dl className="grid gap-3 px-5 py-4">
        {rows.map(([label, value], index) => (
          <div key={`${label}-${index}`} className="grid gap-1">
            <dt className="text-xs uppercase text-muted">{label}</dt>
            <dd className="break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-lg border border-line bg-panel px-6 py-16 text-center shadow-[var(--shadow-panel)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-accent">
        <AlertCircle aria-hidden className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function permissionLabel(permissions: string[], permission: string, locale: "th" | "en") {
  const copy = adminCopy[locale].common;
  return permissions.includes(permission) ? copy.granted : `${copy.requires} ${permission}`;
}

function formatNumber(value: number, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US").format(value);
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null, locale: "th" | "en") {
  return value ? formatDate(value, locale) : "-";
}
