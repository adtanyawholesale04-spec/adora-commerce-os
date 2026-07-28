"use client";

import { useActionState, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldMinus } from "lucide-react";
import {
  requestMemberRoleRemovalServerAction,
  type MemberRoleRemovalFormState
} from "@/app/admin/users/actions";
import type { MemberSummary, RoleSummary } from "@/lib/admin/users";

const initialState: MemberRoleRemovalFormState = null;

export function MemberRoleRemovalForm({
  copy,
  canRemoveRole,
  members,
  roles,
  currentProfileId
}: {
  copy: Record<string, string>;
  canRemoveRole: boolean;
  members: MemberSummary[];
  roles: RoleSummary[];
  currentProfileId: string | null;
}) {
  const router = useRouter();
  const [membershipId, setMembershipId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(
    requestMemberRoleRemovalServerAction,
    initialState
  );
  const clientActionId = useMemo(() => createClientActionId(), []);
  const removableMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.membershipStatus === "ACTIVE" &&
          member.profileStatus === "ACTIVE" &&
          member.profileId !== currentProfileId
      ),
    [currentProfileId, members]
  );
  const removableRoles = useMemo(
    () => roles.filter((role) => role.status === "ACTIVE" && !role.isSystemRole),
    [roles]
  );
  const selectedMember = removableMembers.find((member) => member.id === membershipId);
  const availableRoles = selectedMember
    ? removableRoles.filter((role) => selectedMember.roleIds.includes(role.id))
    : removableRoles;
  const reasonError = reason.length > 500 ? copy.roleReasonTooLong : "";
  const serverFieldError =
    state?.ok === false
      ? state.fieldErrors?.membershipId ?? state.fieldErrors?.roleId ?? state.fieldErrors?.reason
      : undefined;
  const serverReasonError = state?.ok === false ? state.fieldErrors?.reason : undefined;
  const disabledReason = getDisabledReason({
    canRemoveRole,
    removableMembersLength: removableMembers.length,
    availableRolesLength: availableRoles.length,
    selectedMemberRoleCount: selectedMember?.roleIds.length ?? 0,
    membershipId,
    roleId,
    reasonError,
    copy
  });
  const isDisabled = pending || Boolean(disabledReason);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [router, state]);

  function confirmRemoval(event: FormEvent<HTMLFormElement>) {
    if (isDisabled || typeof window === "undefined") {
      return;
    }

    if (!window.confirm(copy.roleRemovalConfirm)) {
      event.preventDefault();
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldMinus aria-hidden className="h-4 w-4 text-danger" />
          <h2 className="text-base font-semibold">{copy.roleRemovalAction}</h2>
        </div>
        <span className="text-xs text-muted">
          {canRemoveRole ? copy.submitReady : copy.permissionRequired}
        </span>
      </div>

      <form action={formAction} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]" noValidate onSubmit={confirmRemoval}>
        <input name="clientActionId" type="hidden" value={clientActionId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 rounded-lg border border-line bg-panel-strong p-4">
            <span className="text-xs uppercase text-muted">{copy.member}</span>
            <select
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink outline-none ring-brand/25 transition focus:border-brand focus:ring-4 disabled:cursor-not-allowed disabled:text-muted"
              disabled={!canRemoveRole || pending || removableMembers.length === 0}
              name="membershipId"
              onChange={(event) => {
                setMembershipId(event.target.value);
                setRoleId("");
              }}
              required
              value={membershipId}
            >
              <option value="">{copy.selectMember}</option>
              {removableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 rounded-lg border border-line bg-panel-strong p-4">
            <span className="text-xs uppercase text-muted">{copy.role}</span>
            <select
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink outline-none ring-brand/25 transition focus:border-brand focus:ring-4 disabled:cursor-not-allowed disabled:text-muted"
              disabled={!canRemoveRole || pending || !membershipId || availableRoles.length === 0}
              name="roleId"
              onChange={(event) => setRoleId(event.target.value)}
              required
              value={roleId}
            >
              <option value="">{copy.selectRole}</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.code} / {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 rounded-lg border border-line bg-panel-strong p-4 sm:col-span-2">
            <span className="text-xs uppercase text-muted">{copy.reason}</span>
            <textarea
              aria-invalid={Boolean(reasonError || serverReasonError)}
              className="min-h-24 resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/25 transition focus:border-brand focus:ring-4 disabled:cursor-not-allowed disabled:text-muted"
              disabled={!canRemoveRole || pending}
              maxLength={500}
              name="reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.roleRemovalReasonPlaceholder}
              value={reason}
            />
            <span className="min-h-5 text-xs text-muted">{serverFieldError ?? reasonError}</span>
          </label>

          <PreviewField label={copy.actionId} value="admin.member.role.remove.request" />
          <PreviewField label={copy.requiredPermission} value="members.manage" />
          <PreviewField label={copy.persistence} value={copy.roleRemovalPersistenceEnabled} />
          <PreviewField label={copy.audit} value={copy.auditRequired} />
        </div>

        <div className="grid content-start gap-3 rounded-lg border border-line bg-panel-strong p-4">
          <StatusBadge status={disabledReason ? "PERMISSION_REQUIRED" : "READY"} />
          <p className="text-sm text-muted">{copy.roleRemovalBoundary}</p>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-danger px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-panel"
            disabled={isDisabled}
            type="submit"
          >
            {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ShieldMinus aria-hidden className="h-4 w-4" />}
            {pending ? copy.submitting : copy.removeRole}
          </button>
          <p className="min-h-5 text-xs text-muted">{disabledReason}</p>

          {state?.ok ? (
            <ResultPanel
              icon={<CheckCircle2 aria-hidden className="h-4 w-4 text-success" />}
              tone="success"
              title={state.payload?.alreadyRemoved ? copy.roleRemovalAlreadyRemoved : copy.roleRemovalPersisted}
              detail={state.message}
            />
          ) : state ? (
            <ResultPanel
              icon={<AlertCircle aria-hidden className="h-4 w-4 text-danger" />}
              tone="danger"
              title={copy.roleRemovalFailed}
              detail={state.message}
            />
          ) : null}
        </div>
      </form>
    </section>
  );
}

function getDisabledReason({
  canRemoveRole,
  removableMembersLength,
  availableRolesLength,
  selectedMemberRoleCount,
  membershipId,
  roleId,
  reasonError,
  copy
}: {
  canRemoveRole: boolean;
  removableMembersLength: number;
  availableRolesLength: number;
  selectedMemberRoleCount: number;
  membershipId: string;
  roleId: string;
  reasonError: string;
  copy: Record<string, string>;
}) {
  if (!canRemoveRole) return copy.permissionRequired;
  if (removableMembersLength === 0) return copy.noRemovableMembers;
  if (!membershipId) return copy.selectMember;
  if (selectedMemberRoleCount <= 1) return copy.lastRoleRemovalBlocked;
  if (availableRolesLength === 0) return copy.noRemovableRoles;
  if (!roleId) return copy.selectRole;
  return reasonError;
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 rounded-lg border border-line bg-panel p-4"><dt className="text-xs uppercase text-muted">{label}</dt><dd className="break-words text-sm font-medium">{value}</dd></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex w-fit rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-muted">{status}</span>;
}

function ResultPanel({ icon, tone, title, detail }: { icon: ReactNode; tone: "success" | "danger"; title: string; detail: string }) {
  const toneClass = tone === "success" ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10";
  return <div className={`grid gap-1 rounded-lg border p-3 ${toneClass}`}><div className="flex items-center gap-2 text-sm font-semibold">{icon}<span>{title}</span></div><p className="text-xs leading-5 text-muted">{detail}</p></div>;
}

function createClientActionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
