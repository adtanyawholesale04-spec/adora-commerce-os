import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CircleSlash,
  CreditCard,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getPaymentsReadModel,
  type PaymentSummary,
  type PaymentTransactionSummary,
  type RefundSummary
} from "@/lib/admin/payments";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getPaymentsReadModel();
  const canReadPayments = model.state === "ready";

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
              <CreditCard aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.payments.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.payments.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/payments" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} /{" "}
                {copy.payments.paymentAccess}:{" "}
                {permissionLabel(model.context.permissions, "payment.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.payments.payments} value={model.metrics.paymentCount.toString()} />
          <Metric
            label={copy.payments.amountExpected}
            value={formatMoney(model.metrics.amountExpected, "THB", preferences.locale)}
          />
          <Metric
            label={copy.payments.amountReceived}
            value={formatMoney(model.metrics.amountReceived, "THB", preferences.locale)}
          />
          <Metric
            label={copy.payments.refundAmount}
            value={formatMoney(model.metrics.refundAmount, "THB", preferences.locale)}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadPayments ? (
              <EmptyState
                title={copy.paymentStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.paymentStates[model.state].detail} ${model.errorMessage}`
                    : copy.paymentStates[model.state].detail
                }
              />
            ) : (
              <>
                <PaymentsTable
                  copy={copy.payments}
                  payments={model.payments}
                  locale={preferences.locale}
                />
                <TransactionsTable
                  copy={copy.payments}
                  transactions={model.transactions}
                  locale={preferences.locale}
                />
                <RefundsTable
                  copy={copy.payments}
                  refunds={model.refunds}
                  locale={preferences.locale}
                />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.payments.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.payments.paymentAccess,
                  permissionLabel(model.context.permissions, "payment.view", preferences.locale)
                ],
                [
                  copy.payments.orderLabels,
                  model.orderLabelsVisible
                    ? copy.payments.labelsVisible
                    : copy.payments.labelsHidden
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.payments.blockedInScreen}
              rows={[
                [copy.payments.paymentVerification, copy.payments.serviceRequired],
                [copy.payments.paymentSettlement, copy.payments.serviceRequired],
                [copy.payments.refundProcessing, copy.payments.wrapperOnly],
                [copy.payments.paymentProofs, copy.payments.notSelected]
              ]}
            />
            <BoundaryPanel
              icon={<WalletCards aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.payments.snapshotScope}
              rows={[
                [copy.payments.paymentLimit, copy.payments.seventyFiveLatest],
                [copy.payments.transactionLimit, copy.payments.oneHundredLatest],
                [copy.payments.refundLimit, copy.payments.fiftyLatest]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function PaymentsTable({
  copy,
  payments,
  locale
}: {
  copy: Record<string, string>;
  payments: PaymentSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <CreditCard aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.paymentList}</h2>
        </div>
        <span className="text-xs text-muted">
          {payments.length} {copy.payments}
        </span>
      </div>
      {payments.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noPayments}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.payment}</th>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.amountExpected}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.amountReceived}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.balance}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate font-semibold">{payment.id}</p>
                    <p className="text-xs text-muted">{payment.currencyCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate font-medium">{payment.orderLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(payment.amountExpected, payment.currencyCode, locale)}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatMoney(payment.amountReceived, payment.currencyCode, locale)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-danger">
                    {formatMoney(
                      Math.max(payment.amountExpected - payment.amountReceived, 0),
                      payment.currencyCode,
                      locale
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(payment.updatedAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TransactionsTable({
  copy,
  transactions,
  locale
}: {
  copy: Record<string, string>;
  transactions: PaymentTransactionSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ReceiptText aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.recentTransactions}</h2>
        </div>
        <span className="text-xs text-muted">
          {transactions.length} {copy.transactions}
        </span>
      </div>
      {transactions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noTransactions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 font-medium">{copy.type}</th>
                <th className="px-5 py-3 font-medium">{copy.method}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.amount}</th>
                <th className="px-5 py-3 font-medium">{copy.provider}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-panel-strong/60">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(transaction.createdAt, locale)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate font-medium">{transaction.orderLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md border border-line bg-panel-strong px-2 py-1 text-xs font-semibold">
                      {transaction.transactionType}
                    </span>
                  </td>
                  <td className="px-5 py-4">{transaction.paymentMethod}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatMoney(transaction.amount, transaction.currencyCode, locale)}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">{transaction.provider ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RefundsTable({
  copy,
  refunds,
  locale
}: {
  copy: Record<string, string>;
  refunds: RefundSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <RefreshCcw aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.refundHistory}</h2>
        </div>
        <span className="text-xs text-muted">
          {refunds.length} {copy.refunds}
        </span>
      </div>
      {refunds.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noRefunds}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.refund}</th>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 font-medium">{copy.method}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.amount}</th>
                <th className="px-5 py-3 font-medium">{copy.reason}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {refunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{refund.refundNumber}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate font-medium">{refund.orderLabel}</p>
                  </td>
                  <td className="px-5 py-4">{refund.refundMethod}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={refund.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatMoney(refund.amount, "THB", locale)}
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-4 text-xs text-muted">
                    {refund.reason ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(refund.createdAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
  const className = statusBadgeClass(status);

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

function statusBadgeClass(status: string) {
  if (["PAID", "SUCCEEDED", "COMPLETED"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["FAILED", "CANCELLED", "REVERSED"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["UNPAID", "PENDING", "PROCESSING", "PARTIALLY_PAID", "COD_PENDING"].includes(status)) {
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

function formatMoney(value: number, currencyCode: string, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
