import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CircleSlash,
  ClipboardList,
  RotateCcw,
  ShieldCheck,
  Shuffle
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getReturnsReadModel,
  type ExchangeReplacementSummary,
  type ReturnCaseSummary,
  type ReturnDispositionSummary,
  type ReturnItemSummary,
  type ReturnStatusHistorySummary
} from "@/lib/admin/returns";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getReturnsReadModel();
  const canReadReturns = model.state === "ready";

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
              <RotateCcw aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.returns.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.returns.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/returns" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} /{" "}
                {copy.returns.returnAccess}:{" "}
                {permissionLabel(model.context.permissions, "return.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.returns.returns} value={model.metrics.returnCount.toString()} />
          <Metric label={copy.returns.openReturns} value={model.metrics.openReturnCount.toString()} />
          <Metric label={copy.returns.inspected} value={model.metrics.inspectedCount.toString()} />
          <Metric
            label={copy.returns.refundAmount}
            value={formatMoney(model.metrics.refundAmount, preferences.locale)}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadReturns ? (
              <EmptyState
                title={copy.returnStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.returnStates[model.state].detail} ${model.errorMessage}`
                    : copy.returnStates[model.state].detail
                }
              />
            ) : (
              <>
                <ReturnsTable copy={copy.returns} returns={model.returns} locale={preferences.locale} />
                <ReturnItemsTable copy={copy.returns} items={model.items} locale={preferences.locale} />
                <StatusHistoryTable
                  copy={copy.returns}
                  history={model.statusHistory}
                  locale={preferences.locale}
                />
                <DispositionsTable
                  copy={copy.returns}
                  dispositions={model.dispositions}
                  locale={preferences.locale}
                />
                <ExchangeTable copy={copy.returns} exchanges={model.exchanges} locale={preferences.locale} />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.returns.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.returns.returnAccess,
                  permissionLabel(model.context.permissions, "return.view", preferences.locale)
                ],
                [
                  copy.returns.orderLabels,
                  model.orderLabelsVisible ? copy.returns.visibleWithOrderView : copy.returns.hiddenWithoutOrderView
                ],
                [
                  copy.returns.productLabels,
                  model.productLabelsVisible
                    ? copy.returns.visibleWithProductView
                    : copy.returns.hiddenWithoutProductView
                ],
                [
                  copy.returns.inspectPermission,
                  model.inspectVisible ? copy.common.granted : `${copy.common.requires} return.inspect`
                ],
                [
                  copy.returns.managePermission,
                  model.manageVisible ? copy.common.granted : `${copy.common.requires} return.manage`
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.returns.blockedInScreen}
              rows={[
                [copy.returns.createApproveReject, copy.returns.serviceRequired],
                [copy.returns.inspectionDisposition, copy.returns.serviceRequired],
                [copy.returns.restockMovement, copy.returns.wrapperOrServiceRequired],
                [copy.returns.refundProcessing, copy.returns.paymentWrapperOnly],
                [copy.returns.exchangeFulfillment, copy.returns.serviceRequired]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.returns.snapshotScope}
              rows={[
                [copy.returns.returnLimit, copy.returns.seventyFiveLatest],
                [copy.returns.itemLimit, copy.returns.twoHundredLatest],
                [copy.returns.historyLimit, copy.returns.oneHundredFiftyLatest],
                [copy.returns.dispositionLimit, copy.returns.oneHundredFiftyLatest],
                [copy.returns.exchangeLimit, copy.returns.oneHundredLatest]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function ReturnsTable({
  copy,
  returns,
  locale
}: {
  copy: Record<string, string>;
  returns: ReturnCaseSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <RotateCcw aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.returnQueue}</h2>
        </div>
        <span className="text-xs text-muted">
          {returns.length} {copy.returns}
        </span>
      </div>
      {returns.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noReturns}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.returnCase}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.type}</th>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.items}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.refundAmount}</th>
                <th className="px-5 py-3 font-medium">{copy.requested}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {returns.map((returnCase) => (
                <tr key={returnCase.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{returnCase.returnNumber}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted">{returnCase.reason ?? returnCase.id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={returnCase.status} />
                  </td>
                  <td className="px-5 py-4">{returnCase.returnType}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[180px] truncate">{returnCase.orderLabel}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{returnCase.itemCount}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(returnCase.totalQuantity, locale)}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatMoney(returnCase.refundAmount, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(returnCase.requestedAt, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(returnCase.updatedAt, locale)}
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

function ReturnItemsTable({
  copy,
  items,
  locale
}: {
  copy: Record<string, string>;
  items: ReturnItemSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.returnItems}</h2>
        </div>
        <span className="text-xs text-muted">
          {items.length} {copy.items}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noItems}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.returnCase}</th>
                <th className="px-5 py-3 font-medium">{copy.item}</th>
                <th className="px-5 py-3 font-medium">{copy.condition}</th>
                <th className="px-5 py-3 font-medium">{copy.restockable}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.refundAmount}</th>
                <th className="px-5 py-3 font-medium">{copy.replacementVariant}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{item.returnNumber}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[320px] truncate">{item.orderItemLabel}</p>
                  </td>
                  <td className="px-5 py-4">{item.conditionStatus ?? "-"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.restockable ? "RESTOCKABLE" : "HOLD"} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(item.quantity, locale)}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {item.refundAmount == null ? "-" : formatMoney(item.refundAmount, locale)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[260px] truncate">{item.replacementVariantLabel ?? "-"}</p>
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

function StatusHistoryTable({
  copy,
  history,
  locale
}: {
  copy: Record<string, string>;
  history: ReturnStatusHistorySummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.statusHistory}</h2>
        </div>
        <span className="text-xs text-muted">
          {history.length} {copy.events}
        </span>
      </div>
      {history.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noHistory}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
                <th className="px-5 py-3 font-medium">{copy.returnCase}</th>
                <th className="px-5 py-3 font-medium">{copy.fromStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.toStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.reason}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((entry) => (
                <tr key={entry.id} className="hover:bg-panel-strong/60">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(entry.createdAt, locale)}
                  </td>
                  <td className="px-5 py-4 font-semibold">{entry.returnNumber}</td>
                  <td className="px-5 py-4">{entry.fromStatus ?? "-"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={entry.toStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[300px] truncate">{entry.reason ?? "-"}</p>
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

function DispositionsTable({
  copy,
  dispositions,
  locale
}: {
  copy: Record<string, string>;
  dispositions: ReturnDispositionSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Boxes aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.dispositions}</h2>
        </div>
        <span className="text-xs text-muted">
          {dispositions.length} {copy.dispositions}
        </span>
      </div>
      {dispositions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noDispositions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.returnCase}</th>
                <th className="px-5 py-3 font-medium">{copy.disposition}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 font-medium">{copy.warehouse}</th>
                <th className="px-5 py-3 font-medium">{copy.inventoryMovement}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {dispositions.map((disposition) => (
                <tr key={disposition.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{disposition.returnNumber}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={disposition.disposition} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(disposition.quantity, locale)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[160px] truncate">{disposition.warehouseId ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={disposition.hasInventoryMovement ? "POSTED" : "NOT_POSTED"} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(disposition.createdAt, locale)}
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

function ExchangeTable({
  copy,
  exchanges,
  locale
}: {
  copy: Record<string, string>;
  exchanges: ExchangeReplacementSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Shuffle aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.exchangeReplacements}</h2>
        </div>
        <span className="text-xs text-muted">
          {exchanges.length} {copy.exchanges}
        </span>
      </div>
      {exchanges.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noExchanges}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.returnCase}</th>
                <th className="px-5 py-3 font-medium">{copy.item}</th>
                <th className="px-5 py-3 font-medium">{copy.replacementOrder}</th>
                <th className="px-5 py-3 font-medium">{copy.replacementItem}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.priceDifference}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {exchanges.map((exchange) => (
                <tr key={exchange.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{exchange.returnNumber}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[260px] truncate">{exchange.returnItemLabel}</p>
                  </td>
                  <td className="px-5 py-4">{exchange.replacementOrderLabel ?? "-"}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[260px] truncate">{exchange.replacementOrderItemLabel ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatMoney(exchange.priceDifference, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(exchange.createdAt, locale)}
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
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

function statusBadgeClass(status: string) {
  if (["RESOLVED", "RESTOCK", "RESTOCKABLE", "POSTED"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["REJECTED", "CANCELLED", "DAMAGED", "DISPOSE"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (
    ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "INSPECTION", "QUARANTINE", "HOLD", "NOT_POSTED"].includes(status)
  ) {
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

function formatQuantity(value: number, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 3
  }).format(value);
}

function formatMoney(value: number, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
