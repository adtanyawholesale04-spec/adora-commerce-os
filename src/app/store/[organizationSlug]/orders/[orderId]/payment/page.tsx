import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  ReceiptText,
} from "lucide-react";
import { ManualPaymentForm } from "@/app/store/_components/manual-payment-form";
import { StorefrontShell } from "@/app/store/_components/storefront-shell";
import { StorefrontState } from "@/app/store/_components/storefront-state";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { storefrontCopy } from "@/lib/storefront/i18n";
import { createManualPaymentSnapshotService } from "@/lib/storefront/manual-payment";

export const dynamic = "force-dynamic";

type PaymentPageProps = {
  params: Promise<{ organizationSlug: string; orderId: string }>;
};

const snapshotService = createManualPaymentSnapshotService();

export const metadata: Metadata = {
  title: "Order payment | ADORA Commerce OS",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function StorefrontOrderPaymentPage({
  params,
}: PaymentPageProps) {
  const [{ organizationSlug, orderId }, preferences] = await Promise.all([
    params,
    getAdminPreferences(),
  ]);
  const model = await snapshotService.getPaymentPage({
    organizationSlug,
    orderId,
  });
  const text = storefrontCopy[preferences.locale];
  const requestedPath = `/store/${organizationSlug}/orders/${orderId}/payment`;

  if (
    model.state === "feature_disabled" ||
    model.state === "auth_required" ||
    model.state === "unavailable"
  ) {
    notFound();
  }
  if (model.state !== "ready") {
    return (
      <StorefrontState
        kind={model.state}
        text={text}
        retryPath={requestedPath}
      />
    );
  }

  const canonicalPath = `/store/${model.canonicalSlug}/orders/${model.snapshot.order.id}/payment`;
  if (requestedPath !== canonicalPath) permanentRedirect(canonicalPath);
  const storePath = `/store/${model.canonicalSlug}`;

  return (
    <StorefrontShell
      preferences={preferences}
      text={text}
      returnPath={canonicalPath}
      storeName={model.storeName}
      storePath={storePath}
    >
      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
          <Link
            href={storePath}
            className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-brand hover:text-ink"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {text.previousStore}
          </Link>
          <p className="mt-6 text-xs font-bold uppercase text-brand">
            {text.paymentEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            {text.paymentTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            {text.paymentDescription}
          </p>
        </div>
      </section>

      <section aria-labelledby="payment-summary-title" className="bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <ReceiptText aria-hidden className="h-5 w-5 text-brand" />
            <h2 id="payment-summary-title" className="text-lg font-semibold">
              {text.paymentOrderSummary}
            </h2>
          </div>
          <dl className="grid gap-x-8 gap-y-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label={text.paymentOrderNumber} value={model.snapshot.order.orderNumber} />
            <SummaryItem
              label={text.paymentAmountDue}
              value={formatMoney(
                model.snapshot.order.amountDue,
                model.snapshot.order.currencyCode,
                preferences.locale,
              )}
              strong
            />
            <SummaryItem
              label={text.paymentDeadline}
              value={formatDeadline(
                model.snapshot.order.paymentDueAt,
                model.timezone,
                preferences.locale,
                text.paymentNoDeadline,
              )}
            />
            <SummaryItem
              label={text.paymentStatusLabel}
              value={eligibilityLabel(model.eligibility, text)}
            />
          </dl>
        </div>
      </section>

      <section aria-labelledby="payment-action-title" className="border-t border-line bg-panel">
        <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <Banknote aria-hidden className="h-5 w-5 text-brand" />
                <h2 id="payment-action-title" className="text-xl font-semibold">
                  {text.paymentFormTitle}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted">
                {text.paymentFormDescription}
              </p>
              <div className="mt-7">
                <PaymentState
                  eligibility={model.eligibility}
                  organizationSlug={model.canonicalSlug}
                  orderId={model.snapshot.order.id}
                  text={text}
                />
              </div>
            </div>

            <aside className="h-fit border-l-4 border-warning bg-warning-surface/15 px-5 py-5">
              <FileCheck2 aria-hidden className="h-5 w-5 text-warning" />
              <h2 className="mt-3 text-base font-semibold">
                {text.paymentInstructionTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {text.paymentInstructionDetail}
              </p>
            </aside>
          </div>
        </div>
      </section>
    </StorefrontShell>
  );
}

function PaymentState({
  eligibility,
  organizationSlug,
  orderId,
  text,
}: {
  eligibility: "eligible" | "pending" | "expired" | "closed";
  organizationSlug: string;
  orderId: string;
  text: (typeof storefrontCopy)["th"] | (typeof storefrontCopy)["en"];
}) {
  if (eligibility === "eligible") {
    return (
      <ManualPaymentForm
        organizationSlug={organizationSlug}
        orderId={orderId}
        initialRequestId={randomUUID()}
        text={text}
      />
    );
  }

  const content = {
    pending: {
      icon: CheckCircle2,
      title: text.paymentPendingTitle,
      detail: text.paymentPendingDetail,
      styles: "border-warning bg-warning-surface/15 text-warning",
    },
    expired: {
      icon: CalendarClock,
      title: text.paymentExpiredTitle,
      detail: text.paymentExpiredDetail,
      styles: "border-danger bg-danger/10 text-danger",
    },
    closed: {
      icon: AlertTriangle,
      title: text.paymentClosedTitle,
      detail: text.paymentClosedDetail,
      styles: "border-line bg-panel-strong text-muted",
    },
  }[eligibility];
  const Icon = content.icon;

  return (
    <div role="status" className={`border-l-4 px-5 py-4 ${content.styles}`}>
      <div className="flex gap-3">
        <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-ink">{content.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{content.detail}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-2 break-words ${strong ? "text-xl font-semibold text-brand" : "text-sm font-semibold"}`}>
        {value}
      </dd>
    </div>
  );
}

function eligibilityLabel(
  eligibility: "eligible" | "pending" | "expired" | "closed",
  text: (typeof storefrontCopy)["th"] | (typeof storefrontCopy)["en"],
) {
  return {
    eligible: text.paymentAwaitingReference,
    pending: text.paymentPendingTitle,
    expired: text.paymentExpiredTitle,
    closed: text.paymentClosedTitle,
  }[eligibility];
}

function formatMoney(value: string, currencyCode: string, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDeadline(
  value: string | null,
  timezone: string,
  locale: "th" | "en",
  fallback: string,
) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}
