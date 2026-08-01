import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import {
  createManualPaymentReviewService,
  type ManualPaymentReviewDetailResult,
  type ManualPaymentReviewFailureCode,
} from "@/lib/admin/manual-payment-review";
import { getAdminPreferences, type AdminLocale } from "@/lib/admin/preferences";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const reviewService = createManualPaymentReviewService();

type ReviewDetailParams = Promise<{ paymentTransactionId: string }>;

export async function generateMetadata() {
  return {
    title: "Manual payment review detail | ACOS Admin",
    robots: { index: false, follow: false },
  };
}

export default async function ManualPaymentReviewDetailPage({
  params,
}: {
  params: ReviewDetailParams;
}) {
  noStore();
  const preferencesPromise = getAdminPreferences();
  const paramsValue = await params;
  const detailPromise = reviewService.getReview({
    paymentTransactionId: paramsValue.paymentTransactionId,
  });
  const [preferences, detail] = await Promise.all([
    preferencesPromise,
    detailPromise,
  ]);
  const copy = adminCopy[preferences.locale].manualPaymentReview;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="border-b-4 border-b-brand bg-panel px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin/payments/review"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-brand"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {copy.backToQueue}
            </Link>
            <div className="mt-2 flex items-start gap-3">
              <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-on-brand">
                <Eye aria-hidden className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-brand">
                  {copy.detailPageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold">
                  {copy.detailPageTitle}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  {copy.detailPageDescription}
                </p>
              </div>
            </div>
          </div>
          <AdminPreferenceSwitcher
            preferences={preferences}
            returnPath={`/admin/payments/review/${paramsValue.paymentTransactionId}`}
          />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {!detail.ok ? (
          <DetailState code={detail.code} copy={copy} />
        ) : (
          <DetailContent detail={detail} locale={preferences.locale} copy={copy} />
        )}
      </div>
    </main>
  );
}

function DetailContent({
  detail,
  locale,
  copy,
}: {
  detail: Extract<ManualPaymentReviewDetailResult, { ok: true }>;
  locale: AdminLocale;
  copy: Record<string, string>;
}) {
  const reviewBlocked = detail.selfReview || !detail.reviewEligible;

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard aria-hidden className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold">{copy.detailSummary}</h2>
          </div>
          <p className="mt-1 text-sm text-muted">{copy.noStoreNotice}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          {copy.privateDetail}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={copy.detailSummary}>
        <SummaryTile label={copy.amount} value={formatMoney(detail.amount, detail.currencyCode, locale)} emphasis />
        <SummaryTile label={copy.submittedAt} value={formatDate(detail.submittedAt, locale)} />
        <SummaryTile label={copy.deadline} value={formatDate(detail.paymentDueAt, locale)} />
        <SummaryTile label={copy.transactionStatus} value={detail.transactionStatus} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <ShieldCheck aria-hidden className="h-4 w-4 text-brand" />
              <h2 className="text-base font-semibold">{copy.canonicalIds}</h2>
            </div>
            <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <IdentityDatum label={copy.transactionId} value={detail.paymentTransactionId} />
              <IdentityDatum label={copy.paymentId} value={detail.paymentId} />
              <IdentityDatum label={copy.proofId} value={detail.paymentProofId} />
              <IdentityDatum label={copy.orderId} value={detail.orderId} />
            </dl>
          </section>

          <section className="rounded-lg border-2 border-warning/60 bg-warning/10 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div className="min-w-0">
                <h2 className="font-semibold text-warning">{copy.privateReference}</h2>
                <p className="mt-1 text-sm leading-6 text-ink/80">{copy.referencePrivacyDetail}</p>
                <p className="mt-4 break-words rounded-md border border-warning/40 bg-panel px-4 py-3 text-lg font-semibold tracking-wide">
                  {detail.paymentReference}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <StatusPanel detail={detail} copy={copy} />
          <ActionBoundaryPanel blocked={reviewBlocked} copy={copy} />
        </aside>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel px-5 py-4 shadow-[var(--shadow-panel)]">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className={emphasis ? "mt-2 text-xl font-semibold" : "mt-2 text-base font-semibold"}>
        {value}
      </p>
    </div>
  );
}

function IdentityDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="break-all font-mono text-xs font-medium">{value}</dd>
    </div>
  );
}

function StatusPanel({
  detail,
  copy,
}: {
  detail: Extract<ManualPaymentReviewDetailResult, { ok: true }>;
  copy: Record<string, string>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
        <h2 className="text-base font-semibold">{copy.status}</h2>
      </div>
      <dl className="grid gap-3 px-5 py-4 text-sm">
        <StatusDatum label={copy.transactionStatus} value={detail.transactionStatus} />
        <StatusDatum label={copy.proofStatus} value={detail.proofStatus} />
        <StatusDatum label={copy.orderStatus} value={detail.orderStatus} />
        <StatusDatum label={copy.paymentStatus} value={detail.paymentStatus} />
      </dl>
    </section>
  );
}

function StatusDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function ActionBoundaryPanel({
  blocked,
  copy,
}: {
  blocked: boolean;
  copy: Record<string, string>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <LockKeyhole aria-hidden className="h-4 w-4 text-warning" />
        <h2 className="text-base font-semibold">{copy.actionBoundaryTitle}</h2>
      </div>
      <div className="grid gap-3 px-5 py-4 text-sm">
        <p className="leading-6 text-muted">
          {blocked ? copy.reviewBlockedDetail : copy.actionBoundaryDetail}
        </p>
        <div className="inline-flex items-center gap-2 rounded-md bg-panel-strong px-3 py-2 font-semibold text-muted">
          <Clock3 aria-hidden className="h-4 w-4" />
          {copy.actionsNextPart}
        </div>
      </div>
    </section>
  );
}

function DetailState({
  code,
  copy,
}: {
  code: ManualPaymentReviewFailureCode;
  copy: Record<string, string>;
}) {
  const state = detailStateCopy(code, copy);
  return (
    <section className="grid min-h-80 place-items-center border-y border-line px-6 py-16 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-warning/10 text-warning">
          <AlertCircle aria-hidden className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{state.title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{state.detail}</p>
        <Link
          href="/admin/payments/review"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-panel px-4 text-sm font-semibold hover:bg-panel-strong"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {copy.backToQueue}
        </Link>
      </div>
    </section>
  );
}

function detailStateCopy(code: ManualPaymentReviewFailureCode, copy: Record<string, string>) {
  const key =
    code === "feature_disabled"
      ? "disabled"
      : code === "anonymous"
        ? "anonymous"
        : code === "missing_membership"
          ? "membership"
          : code === "permission_denied"
            ? "permission"
            : "unavailable";
  return {
    title: copy[`${key}Title`],
    detail: copy[`${key}Detail`],
  };
}

function formatMoney(value: string, currencyCode: string, locale: AdminLocale) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string, locale: AdminLocale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}
