"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, ShieldCheck, ShieldX, X } from "lucide-react";
import {
  rejectManualPaymentAction,
  verifyManualPaymentAction,
} from "@/app/admin/payments/actions";
import type {
  ManualPaymentReviewActionState,
} from "@/lib/admin/manual-payment-review";

const initialState: ManualPaymentReviewActionState = {
  ok: null,
  code: "idle",
  retryable: false,
};

type ReviewAction = "verify" | "reject";

export function ReviewActionBar({
  paymentTransactionId,
  canReview,
  copy,
}: {
  paymentTransactionId: string;
  canReview: boolean;
  copy: Record<string, string>;
}) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState(() => createRequestId());
  const [verifyState, verifyFormAction, verifyPending] = useActionState(
    verifyManualPaymentAction,
    initialState,
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(
    rejectManualPaymentAction,
    initialState,
  );
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pending = verifyPending || rejectPending;
  const activeState = selectedAction === "verify" ? verifyState : rejectState;
  const reasonError = getReasonError(reason, copy);
  const canSubmit = canReview && !pending && !reasonError;

  useEffect(() => {
    if (!selectedAction) return;

    const focusFrame = requestAnimationFrame(() => reasonRef.current?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [selectedAction]);

  useEffect(() => {
    if (activeState?.ok === true) {
      router.refresh();
    }
  }, [activeState?.ok, router]);

  const actionCopy = useMemo(() => {
    if (selectedAction === "reject") {
      return {
        title: copy.rejectConfirmTitle,
        detail: copy.rejectConfirmDetail,
        actionLabel: copy.rejectAction,
        icon: <ShieldX aria-hidden className="h-4 w-4" />,
        tone: "danger" as const,
        formAction: rejectFormAction,
      };
    }
    return {
      title: copy.verifyConfirmTitle,
      detail: copy.verifyConfirmDetail,
      actionLabel: copy.verifyAction,
      icon: <ShieldCheck aria-hidden className="h-4 w-4" />,
      tone: "success" as const,
      formAction: verifyFormAction,
    };
  }, [copy, rejectFormAction, selectedAction, verifyFormAction]);

  function openAction(action: ReviewAction) {
    if (!canReview || pending) return;
    triggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setRequestId(createRequestId());
    setSelectedAction(action);
  }

  function closeDialog() {
    if (!pending) setSelectedAction(null);
  }

  function validateSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSubmit) event.preventDefault();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <LockKeyhole aria-hidden className="h-4 w-4 text-warning" />
        <h2 className="text-base font-semibold">{copy.actionBoundaryTitle}</h2>
      </div>
      <div className="grid gap-4 px-5 py-4">
        <p className="text-sm leading-6 text-muted">{copy.actionBoundaryDetail}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-success px-3 text-sm font-semibold text-white transition hover:bg-success/90 disabled:cursor-not-allowed disabled:bg-muted"
            disabled={!canReview || pending}
            onClick={() => openAction("verify")}
            type="button"
          >
            <ShieldCheck aria-hidden className="h-4 w-4" />
            {copy.verifyAction}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-3 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-muted"
            disabled={!canReview || pending}
            onClick={() => openAction("reject")}
            type="button"
          >
            <ShieldX aria-hidden className="h-4 w-4" />
            {copy.rejectAction}
          </button>
        </div>
        {!canReview ? <p className="text-xs text-muted">{copy.reviewBlockedDetail}</p> : null}
        <ActionResult state={activeState} copy={copy} />
      </div>

      {selectedAction ? (
        <div
          aria-labelledby="review-action-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeDialog();
          }}
          role="dialog"
        >
          <form
            action={actionCopy.formAction}
            className="grid w-full max-w-lg gap-5 rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]"
            noValidate
            onSubmit={validateSubmit}
          >
            <input name="paymentTransactionId" type="hidden" value={paymentTransactionId} />
            <input name="expectedStatus" type="hidden" value="PENDING" />
            <input name="requestId" type="hidden" value={requestId} />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md ${actionCopy.tone === "danger" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
                  {actionCopy.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold" id="review-action-dialog-title">{actionCopy.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{actionCopy.detail}</p>
                </div>
              </div>
              <button
                aria-label={copy.cancel}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted hover:bg-panel-strong hover:text-ink"
                disabled={pending}
                onClick={closeDialog}
                type="button"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            {activeState?.ok === true ? <ActionResult state={activeState} copy={copy} /> : null}

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{copy.reason}</span>
              <textarea
                aria-describedby="review-reason-hint review-reason-error"
                aria-invalid={Boolean(reasonError)}
                autoFocus
                className="min-h-28 resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/25 disabled:cursor-not-allowed disabled:text-muted"
                disabled={pending}
                maxLength={500}
                minLength={8}
                name="reason"
                onChange={(event) => {
                  setReason(event.target.value);
                  setRequestId(createRequestId());
                }}
                placeholder={copy.reasonHint}
                required
                ref={reasonRef}
                value={reason}
              />
              <span className="text-xs text-muted" id="review-reason-hint">{copy.reasonHint}</span>
              <span className="min-h-5 text-xs text-danger" id="review-reason-error">{reasonError ?? `${500 - reason.length} ${copy.reasonRemaining}`}</span>
            </label>

            <div aria-live="polite" className="min-h-5 text-sm text-muted">
              {pending ? <span className="inline-flex items-center gap-2"><Loader2 aria-hidden className="h-4 w-4 animate-spin" />{copy.submitting}</span> : null}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold hover:bg-panel-strong disabled:cursor-not-allowed disabled:text-muted"
                disabled={pending}
                onClick={closeDialog}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-muted ${actionCopy.tone === "danger" ? "bg-danger hover:bg-danger/90" : "bg-success hover:bg-success/90"}`}
                disabled={!canSubmit}
                type="submit"
              >
                {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : actionCopy.icon}
                {pending ? copy.submitting : copy.confirm}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function ActionResult({
  state,
  copy,
}: {
  state: ManualPaymentReviewActionState;
  copy: Record<string, string>;
}) {
  if (!state || state.ok === null) return null;
  if (state.ok) {
    return (
      <div aria-live="polite" className="grid gap-1 rounded-md border border-success/30 bg-success/10 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 aria-hidden className="h-4 w-4" />{copy.actionSuccess}</div>
        <p className="text-xs text-muted">{state.operation === "PAYMENT_VERIFY" ? copy.verifySuccess : copy.rejectSuccess}</p>
      </div>
    );
  }
  return (
    <div aria-live="assertive" className="grid gap-1 rounded-md border border-danger/30 bg-danger/10 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-danger"><AlertCircle aria-hidden className="h-4 w-4" />{copy.actionError}</div>
      <p className="text-xs text-muted">{getActionErrorDetail(state.code, state.retryable, copy)}</p>
    </div>
  );
}

function getActionErrorDetail(code: string, retryable: boolean, copy: Record<string, string>) {
  if (code === "permission_denied") return copy.permissionActionDetail;
  if (["state_conflict", "already_reviewed", "payment_expired"].includes(code)) return copy.conflictDetail;
  if (retryable) return copy.retryableDetail;
  return copy.actionUnavailableDetail;
}

function getReasonError(reason: string, copy: Record<string, string>) {
  const trimmedLength = reason.trim().length;
  if (trimmedLength > 0 && trimmedLength < 8) return copy.reasonRequired;
  if (reason.length > 500) return copy.reasonTooLong;
  if (trimmedLength === 0) return copy.reasonRequired;
  return "";
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
