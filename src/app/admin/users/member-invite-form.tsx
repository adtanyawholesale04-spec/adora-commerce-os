"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import {
  requestMemberInvitationServerAction,
  type MemberInvitationFormState
} from "@/app/admin/users/actions";

const initialState: MemberInvitationFormState = null;

export function MemberInviteForm({
  copy,
  canRequestInvitation,
  organizationName,
  locale
}: {
  copy: Record<string, string>;
  canRequestInvitation: boolean;
  organizationName: string;
  locale: "th" | "en";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(
    requestMemberInvitationServerAction,
    initialState
  );
  const clientActionId = useMemo(() => createClientActionId(), []);
  const normalizedEmail = email.trim().toLowerCase();
  const emailError = getEmailError(normalizedEmail, copy);
  const serverEmailError = state?.ok === false ? state.fieldErrors?.email : undefined;
  const isDisabled = !canRequestInvitation || pending || emailError.length > 0;

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [router, state]);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <UserPlus aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.memberInviteAction}</h2>
        </div>
        <span className="text-xs text-muted">
          {canRequestInvitation ? copy.submitReady : copy.permissionRequired}
        </span>
      </div>

      <form action={formAction} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]" noValidate>
        <input name="clientActionId" type="hidden" value={clientActionId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 rounded-lg border border-line bg-panel-strong p-4 sm:col-span-2">
            <span className="text-xs uppercase text-muted">{copy.email}</span>
            <input
              aria-describedby="member-invite-email-state"
              aria-invalid={Boolean(emailError || serverEmailError)}
              autoComplete="email"
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink outline-none ring-brand/25 transition focus:border-brand focus:ring-4 disabled:cursor-not-allowed disabled:text-muted"
              disabled={!canRequestInvitation || pending}
              maxLength={320}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.inviteEmailPreview}
              required
              type="email"
              value={email}
            />
            <span id="member-invite-email-state" className="min-h-5 text-xs text-muted">
              {serverEmailError ?? emailError}
            </span>
          </label>

          <PreviewField label={copy.tenant} value={organizationName} />
          <PreviewField label={copy.roleAssignment} value={copy.roleAssignmentDeferred} />
          <PreviewField label={copy.actionId} value="admin.member.invite.request" />
          <PreviewField label={copy.persistence} value={copy.persistenceEnabled} />
        </div>

        <div className="grid content-start gap-3 rounded-lg border border-line bg-panel-strong p-4">
          <StatusBadge status={canRequestInvitation ? "READY" : "PERMISSION_REQUIRED"} />
          <p className="text-sm text-muted">{copy.dbOnlyInviteBoundary}</p>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-muted disabled:text-panel"
            disabled={isDisabled}
            type="submit"
          >
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus aria-hidden className="h-4 w-4" />
            )}
            {pending ? copy.submitting : copy.submitInvite}
          </button>

          {state?.ok ? (
            <ResultPanel
              icon={<CheckCircle2 aria-hidden className="h-4 w-4 text-success" />}
              tone="success"
              title={state.code === "duplicate_reused" ? copy.inviteReused : copy.invitePersisted}
              detail={formatSuccessDetail(state, copy, locale)}
            />
          ) : state ? (
            <ResultPanel
              icon={<AlertCircle aria-hidden className="h-4 w-4 text-danger" />}
              tone="danger"
              title={copy.inviteFailed}
              detail={state.message}
            />
          ) : null}
        </div>
      </form>
    </section>
  );
}

function formatSuccessDetail(
  state: Exclude<MemberInvitationFormState, null> & { ok: true },
  copy: Record<string, string>,
  locale: "th" | "en"
) {
  const emailState = state.payload.authAdminEmailSent
    ? copy.inviteEmailSent
    : state.payload.authAdminEmailSkippedReason === "already_sent"
      ? copy.inviteEmailAlreadySent
      : copy.inviteEmailPending;
  const expiry = state.payload.expiresAt
    ? `${copy.expires}: ${formatDate(state.payload.expiresAt, locale)}`
    : state.message;

  return `${emailState} ${expiry}`;
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-panel p-4">
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex w-fit rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-muted">
      {status}
    </span>
  );
}

function ResultPanel({
  icon,
  tone,
  title,
  detail
}: {
  icon: ReactNode;
  tone: "success" | "danger";
  title: string;
  detail: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-success/30 bg-success/10"
      : "border-danger/30 bg-danger/10";

  return (
    <div className={`grid gap-1 rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function getEmailError(value: string, copy: Record<string, string>) {
  if (value.length === 0) {
    return copy.emailRequired;
  }

  if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return copy.emailInvalid;
  }

  return "";
}

function createClientActionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
