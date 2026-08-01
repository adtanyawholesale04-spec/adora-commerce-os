import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import {
  createManualPaymentReviewService,
  type ManualPaymentReviewFailureCode,
  type ManualPaymentReviewQueueItem,
} from "@/lib/admin/manual-payment-review";
import { getAdminPreferences, type AdminLocale } from "@/lib/admin/preferences";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const reviewService = createManualPaymentReviewService();

type ReviewSearchParams = Promise<{
  cursorSubmittedAt?: string | string[];
  cursorTransactionId?: string | string[];
}>;

export default async function ManualPaymentReviewQueuePage({
  searchParams,
}: {
  searchParams: ReviewSearchParams;
}) {
  const paramsPromise = searchParams;
  const preferencesPromise = getAdminPreferences();
  const params = await paramsPromise;
  const queuePromise = reviewService.listReviews({
    cursor: readCursor(params),
    limit: 25,
  });
  const [preferences, queue] = await Promise.all([
    preferencesPromise,
    queuePromise,
  ]);
  const copy = adminCopy[preferences.locale].manualPaymentReview;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="border-b-4 border-b-brand bg-panel px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin/payments"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-brand"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {copy.backToPayments}
            </Link>
            <div className="mt-2 flex items-start gap-3">
              <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-on-brand">
                <ListChecks aria-hidden className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-brand">
                  {copy.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold">
                  {copy.pageTitle}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  {copy.pageDescription}
                </p>
              </div>
            </div>
          </div>
          <AdminPreferenceSwitcher
            preferences={preferences}
            returnPath="/admin/payments/review"
          />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {!queue.ok ? (
          <QueueState code={queue.code} copy={copy} />
        ) : queue.items.length === 0 ? (
          <EmptyQueue copy={copy} />
        ) : (
          <QueueContent
            items={queue.items}
            locale={preferences.locale}
            nextHref={nextQueueHref(queue.nextCursor)}
            copy={copy}
          />
        )}
      </div>
    </main>
  );
}

function QueueContent({
  items,
  locale,
  nextHref,
  copy,
}: {
  items: ManualPaymentReviewQueueItem[];
  locale: AdminLocale;
  nextHref: string | null;
  copy: Record<string, string>;
}) {
  return (
    <section aria-labelledby="review-queue-title" className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard aria-hidden className="h-5 w-5 text-brand" />
            <h2 id="review-queue-title" className="text-lg font-semibold">
              {copy.queueTitle}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted">{copy.queueDescription}</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted">
          <ShieldCheck aria-hidden className="h-4 w-4 text-success" />
          {copy.referenceProtected}
        </div>
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.transaction}</th>
                <th className="px-5 py-3 font-medium">{copy.submittedAt}</th>
                <th className="px-5 py-3 font-medium">{copy.deadline}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.amount}</th>
                <th className="px-5 py-3 font-medium">{copy.reviewState}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.detail}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.paymentTransactionId} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{shortIdentity(item.paymentTransactionId)}</p>
                    <p className="mt-1 text-xs text-muted">{copy.opaqueIdentity}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {formatDate(item.submittedAt, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 aria-hidden className="h-4 w-4 text-warning" />
                      {formatDate(item.paymentDueAt, locale)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-base font-semibold">
                    {formatMoney(item.amount, item.currencyCode, locale)}
                  </td>
                  <td className="px-5 py-4">
                    <EligibilityBadge canReview={item.canReview} copy={copy} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DetailLink
                      paymentTransactionId={item.paymentTransactionId}
                      copy={copy}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:hidden">
        {items.map((item) => (
          <article
            key={item.paymentTransactionId}
            className="rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {shortIdentity(item.paymentTransactionId)}
                </p>
                <p className="mt-1 text-xs text-muted">{copy.opaqueIdentity}</p>
              </div>
              <EligibilityBadge canReview={item.canReview} copy={copy} />
            </div>
            <dl className="mt-4 grid gap-3 border-y border-line py-4 text-sm">
              <QueueDatum label={copy.amount} value={formatMoney(item.amount, item.currencyCode, locale)} strong />
              <QueueDatum label={copy.submittedAt} value={formatDate(item.submittedAt, locale)} />
              <QueueDatum label={copy.deadline} value={formatDate(item.paymentDueAt, locale)} />
            </dl>
            <div className="mt-4 flex justify-end">
              <DetailLink
                paymentTransactionId={item.paymentTransactionId}
                copy={copy}
              />
            </div>
          </article>
        ))}
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {copy.pageCount}: <span className="font-semibold text-ink">{items.length}</span>
        </p>
        {nextHref ? (
          <Link
            href={nextHref}
            rel="nofollow"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brand bg-panel px-4 text-sm font-semibold text-brand hover:bg-panel-strong"
          >
            {copy.loadMore}
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : (
          <span className="text-sm text-muted">{copy.endOfQueue}</span>
        )}
      </footer>
    </section>
  );
}

function EligibilityBadge({
  canReview,
  copy,
}: {
  canReview: boolean;
  copy: Record<string, string>;
}) {
  return (
    <span
      className={
        canReview
          ? "inline-flex whitespace-nowrap rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning"
          : "inline-flex whitespace-nowrap rounded-md bg-panel-strong px-2 py-1 text-xs font-semibold text-muted"
      }
    >
      {canReview ? copy.readyForReview : copy.viewOnly}
    </span>
  );
}

function DetailLink({
  paymentTransactionId,
  copy,
}: {
  paymentTransactionId: string;
  copy: Record<string, string>;
}) {
  return (
    <Link
      href={`/admin/payments/review/${paymentTransactionId}`}
      title={copy.detailTitle}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-brand bg-panel px-3 text-sm font-semibold text-brand hover:bg-panel-strong"
    >
      <ChevronRight aria-hidden className="h-4 w-4" />
      {copy.detail}
    </Link>
  );
}

function QueueDatum({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "text-right font-semibold" : "text-right"}>{value}</dd>
    </div>
  );
}

function EmptyQueue({ copy }: { copy: Record<string, string> }) {
  return (
    <section className="grid min-h-80 place-items-center border-y border-line px-6 py-16 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-panel-strong text-success">
          <ListChecks aria-hidden className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{copy.emptyTitle}</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{copy.emptyDetail}</p>
      </div>
    </section>
  );
}

function QueueState({
  code,
  copy,
}: {
  code: ManualPaymentReviewFailureCode;
  copy: Record<string, string>;
}) {
  const state = stateCopy(code, copy);
  return (
    <section className="grid min-h-80 place-items-center border-y border-line px-6 py-16 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-warning/10 text-warning">
          <AlertCircle aria-hidden className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{state.title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{state.detail}</p>
        <Link
          href="/admin/payments"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-panel px-4 text-sm font-semibold hover:bg-panel-strong"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {copy.backToPayments}
        </Link>
      </div>
    </section>
  );
}

function stateCopy(code: ManualPaymentReviewFailureCode, copy: Record<string, string>) {
  const key =
    code === "feature_disabled"
      ? "disabled"
      : code === "anonymous"
        ? "anonymous"
        : code === "missing_membership"
          ? "membership"
          : code === "permission_denied"
            ? "permission"
            : code === "review_not_found"
              ? "unavailable"
              : "error";
  return {
    title: copy[`${key}Title`],
    detail: copy[`${key}Detail`],
  };
}

function readCursor(params: Awaited<ReviewSearchParams>) {
  const submittedAt = firstValue(params.cursorSubmittedAt);
  const paymentTransactionId = firstValue(params.cursorTransactionId);
  if (!submittedAt && !paymentTransactionId) return null;
  return {
    submittedAt: submittedAt ?? "",
    paymentTransactionId: paymentTransactionId ?? "",
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function nextQueueHref(
  cursor: { submittedAt: string; paymentTransactionId: string } | null,
) {
  if (!cursor) return null;
  const params = new URLSearchParams({
    cursorSubmittedAt: cursor.submittedAt,
    cursorTransactionId: cursor.paymentTransactionId,
  });
  return `/admin/payments/review?${params.toString()}`;
}

function shortIdentity(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
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
