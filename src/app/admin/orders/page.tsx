import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CircleSlash,
  Clock,
  ReceiptText,
  ShieldCheck,
  ShoppingCart
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { getOrdersReadModel, type OrderSummary } from "@/lib/admin/orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getOrdersReadModel();
  const canReadOrders = model.state === "ready";

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
              <ShoppingCart aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.orders.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.orders.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/orders" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous}{" "}
                Â· {copy.orders.orderAccess}:{" "}
                {permissionLabel(model.context.permissions, "order.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.orders.orders} value={model.metrics.orderCount.toString()} />
          <Metric label={copy.orders.confirmed} value={model.metrics.confirmedOrderCount.toString()} />
          <Metric label={copy.orders.paid} value={model.metrics.paidOrderCount.toString()} />
          <Metric
            label={copy.orders.amountDue}
            value={formatMoney(model.metrics.amountDue, "THB", preferences.locale)}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadOrders ? (
              <EmptyState
                title={copy.orderStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.orderStates[model.state].detail} ${model.errorMessage}`
                    : copy.orderStates[model.state].detail
                }
              />
            ) : (
              <>
                <OrderQueueCards
                  copy={copy.orders}
                  orders={model.orders.slice(0, 6)}
                  locale={preferences.locale}
                />
                <OrdersTable
                  copy={copy.orders}
                  orders={model.orders}
                  locale={preferences.locale}
                />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.orders.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.orders.orderAccess,
                  permissionLabel(model.context.permissions, "order.view", preferences.locale)
                ],
                [
                  copy.orders.customerLabels,
                  model.customerLabelsVisible
                    ? copy.orders.labelsVisible
                    : copy.orders.labelsHidden
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.orders.blockedInScreen}
              rows={[
                [copy.orders.createEditCancel, copy.orders.serviceRequired],
                [copy.orders.reprice, copy.orders.serviceRequired],
                [copy.orders.paymentSettlement, copy.orders.wrapperOrServiceRequired],
                [copy.orders.fulfillmentMutation, copy.orders.wrapperOrServiceRequired]
              ]}
            />
            <BoundaryPanel
              icon={<ReceiptText aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.orders.snapshotScope}
              rows={[
                [copy.orders.orderLimit, copy.orders.seventyFiveLatest],
                [
                  copy.orders.customerLabelLimit,
                  model.customerLabelsVisible ? copy.orders.seventyFiveLatest : copy.common.hidden
                ],
                [copy.orders.relatedReads, copy.orders.deferredReadContracts]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function OrderQueueCards({
  copy,
  orders,
  locale
}: {
  copy: Record<string, string>;
  orders: OrderSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.latestOrders}</h2>
        </div>
        <span className="text-xs text-muted">{copy.seventyFiveLatest}</span>
      </div>
      {orders.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noOrders}</p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-lg border border-line bg-panel-strong p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                    {order.orderNumber}
                  </p>
                  <h3 className="mt-1 truncate font-semibold">{order.customerLabel}</h3>
                </div>
                <StatusBadge status={order.orderStatus} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat
                  label={copy.total}
                  value={formatMoney(order.grandTotal, order.currencyCode, locale)}
                />
                <MiniStat
                  label={copy.amountDue}
                  value={formatMoney(order.amountDue, order.currencyCode, locale)}
                />
                <MiniStat label={copy.payment} value={order.paymentStatus} />
                <MiniStat label={copy.fulfillment} value={order.fulfillmentStatus} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrdersTable({
  copy,
  orders,
  locale
}: {
  copy: Record<string, string>;
  orders: OrderSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ReceiptText aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.orderList}</h2>
        </div>
        <span className="text-xs text-muted">
          {orders.length} {copy.orders}
        </span>
      </div>
      {orders.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noOrders}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 font-medium">{copy.customer}</th>
                <th className="px-5 py-3 font-medium">{copy.orderStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.paymentStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.fulfillmentStatus}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.total}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.paidAmount}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.dueAmount}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted">{order.source}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate font-medium">{order.customerLabel}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted">{order.customerId}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.orderStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.fulfillmentStatus} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatMoney(order.grandTotal, order.currencyCode, locale)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(order.amountPaid, order.currencyCode, locale)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-danger">
                    {formatMoney(order.amountDue, order.currencyCode, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(order.createdAt, locale)}
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel px-2.5 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
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
  if (["COMPLETED", "PAID", "FULFILLED"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["CANCELLED", "PAYMENT_EXPIRED", "REFUND_PENDING", "RETURN_IN_PROGRESS"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["UNPAID", "PARTIALLY_PAID", "COD_PENDING", "ON_HOLD"].includes(status)) {
    return "border-warning/30 bg-warning/10 text-accent";
  }

  if (["CONFIRMED", "PROCESSING", "PARTIALLY_FULFILLED"].includes(status)) {
    return "border-brand/30 bg-brand/10 text-brand";
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
