"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCcw, Send } from "lucide-react";
import { submitStorefrontPaymentProofAction } from "@/app/store/actions";
import type {
  ManualPaymentActionState,
  ManualPaymentSubmissionFailureCode,
} from "@/lib/storefront/manual-payment";
import type { StorefrontText } from "@/lib/storefront/i18n";

const INITIAL_STATE: ManualPaymentActionState = {
  ok: null,
  code: "idle",
  retryable: false,
};
const REFERENCE_PATTERN = /^[A-Z0-9._/-]{6,100}$/;

export function ManualPaymentForm({
  organizationSlug,
  orderId,
  initialRequestId,
  text,
}: {
  organizationSlug: string;
  orderId: string;
  initialRequestId: string;
  text: StorefrontText;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [state, action] = useActionState(
    submitStorefrontPaymentProofAction,
    INITIAL_STATE,
  );
  const [reference, setReference] = useState("");
  const [requestId, setRequestId] = useState(initialRequestId);
  const online = useSyncExternalStore(
    subscribeToNetwork,
    getBrowserOnline,
    getServerOnline,
  );
  const [localInvalid, setLocalInvalid] = useState(false);
  const [dismissedResult, setDismissedResult] = useState(false);
  const normalizedReference = reference.trim().toUpperCase();
  const validReference = REFERENCE_PATTERN.test(normalizedReference);
  const effectiveState = dismissedResult ? INITIAL_STATE : state;

  useEffect(() => {
    if (state.ok === true) {
      summaryRef.current?.focus();
      router.refresh();
    } else if (state.ok === false) {
      summaryRef.current?.focus();
      if (state.code === "payment_reference_invalid") {
        inputRef.current?.focus();
      }
    }
  }, [router, state]);

  function validate(event: React.FormEvent<HTMLFormElement>) {
    setDismissedResult(false);
    if (!validReference || !requestId || !online) {
      event.preventDefault();
      setLocalInvalid(!validReference);
      if (!validReference) inputRef.current?.focus();
    }
  }

  function startNewIntent() {
    setReference("");
    setRequestId(window.crypto.randomUUID());
    setLocalInvalid(false);
    setDismissedResult(true);
    inputRef.current?.focus();
  }

  const failureCode =
    effectiveState.ok === false ? effectiveState.code : null;
  const fieldInvalid =
    localInvalid || failureCode === "payment_reference_invalid";

  if (effectiveState.ok === true) {
    return (
      <div ref={summaryRef} tabIndex={-1} aria-live="polite" className="outline-none">
        <StatusMessage
          tone="success"
          title={text.paymentSubmittedTitle}
          detail={text.paymentSubmittedDetail}
        />
      </div>
    );
  }

  return (
    <form action={action} onSubmit={validate} noValidate aria-busy={undefined}>
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="requestId" value={requestId} />

      <div
        ref={summaryRef}
        tabIndex={-1}
        aria-live="polite"
        className="outline-none"
      >
        {failureCode ? (
          <StatusMessage
            tone="danger"
            title={text.paymentErrorTitle}
            detail={failureText(failureCode, text)}
          />
        ) : !online ? (
          <StatusMessage
            tone="warning"
            title={text.paymentOfflineTitle}
            detail={text.paymentOfflineDetail}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <label htmlFor="payment-reference" className="text-sm font-semibold">
          {text.paymentReferenceLabel}
        </label>
        <p id="payment-reference-help" className="mt-2 text-sm leading-6 text-muted">
          {text.paymentReferenceHelp}
        </p>
        <input
          ref={inputRef}
          id="payment-reference"
          name="paymentReference"
          value={reference}
          onChange={(event) => {
            setReference(event.target.value);
            setLocalInvalid(false);
            setDismissedResult(false);
          }}
          minLength={6}
          maxLength={100}
          pattern="[A-Za-z0-9._/-]{6,100}"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={fieldInvalid}
          aria-describedby={
            fieldInvalid
              ? "payment-reference-help payment-reference-error"
              : "payment-reference-help payment-reference-preview"
          }
          className="mt-3 h-12 w-full rounded-md border border-line bg-panel px-4 text-base text-ink shadow-sm placeholder:text-muted/70 focus:border-brand"
          placeholder={text.paymentReferencePlaceholder}
        />
        {fieldInvalid ? (
          <p id="payment-reference-error" className="mt-2 text-sm text-danger">
            {text.paymentReferenceInvalid}
          </p>
        ) : reference ? (
          <p id="payment-reference-preview" className="mt-2 text-xs text-muted">
            {text.paymentReferencePreview}: {normalizedReference}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton
          disabled={!validReference || !requestId || !online}
          submitLabel={
            effectiveState.ok === false && effectiveState.retryable
              ? text.paymentRetrySameRequest
              : text.paymentSubmit
          }
          pendingLabel={text.paymentSubmitting}
        />
        {failureCode === "request_conflict" ||
        failureCode === "payment_reference_conflict" ? (
          <button
            type="button"
            onClick={startNewIntent}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 text-sm font-semibold text-ink hover:bg-panel-strong"
          >
            <RefreshCcw aria-hidden className="h-4 w-4" />
            {text.paymentNewIntent}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SubmitButton({
  disabled,
  submitLabel,
  pendingLabel,
}: {
  disabled: boolean;
  submitLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-sidebar hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Send aria-hidden className="h-4 w-4" />
      {pending ? pendingLabel : submitLabel}
    </button>
  );
}

function StatusMessage({
  tone,
  title,
  detail,
}: {
  tone: "success" | "warning" | "danger";
  title: string;
  detail: string;
}) {
  const styles = {
    success: "border-success/40 bg-success/10 text-success",
    warning: "border-warning/50 bg-warning-surface/20 text-ink",
    danger: "border-danger/40 bg-danger/10 text-danger",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`border-l-4 px-4 py-3 ${styles}`}>
      <div className="flex gap-3">
        <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-current/85">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function failureText(
  code: ManualPaymentSubmissionFailureCode,
  text: StorefrontText,
) {
  const messages: Record<ManualPaymentSubmissionFailureCode, string> = {
    feature_disabled: text.paymentUnavailableDetail,
    auth_required: text.paymentAuthRequired,
    payment_reference_invalid: text.paymentReferenceInvalid,
    order_not_payable: text.paymentUnavailableDetail,
    payment_expired: text.paymentExpiredDetail,
    payment_reference_conflict: text.paymentReferenceConflict,
    payment_attempt_pending: text.paymentPendingDetail,
    request_conflict: text.paymentRequestConflict,
    persistence_error: text.paymentPersistenceError,
  };
  return messages[code];
}

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getBrowserOnline() {
  return window.navigator.onLine;
}

function getServerOnline() {
  return true;
}
