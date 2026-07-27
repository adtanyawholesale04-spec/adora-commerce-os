import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  CircleSlash,
  ClipboardCheck,
  ListChecks,
  ShieldCheck
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getQcReadModel,
  type QcItemTotalSummary,
  type QcScanSignalSummary,
  type QcSessionSummary
} from "@/lib/admin/qc";

export const dynamic = "force-dynamic";

export default async function QcPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getQcReadModel();
  const canReadQc = model.state === "ready";

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
              <ShieldCheck aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.qc.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.qc.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/qc" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} / {copy.qc.qcAccess}:{" "}
                {permissionLabel(model.context.permissions, "warehouse.qc", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.qc.sessions} value={model.metrics.sessionCount.toString()} />
          <Metric label={copy.qc.activeSessions} value={model.metrics.activeSessionCount.toString()} />
          <Metric
            label={copy.qc.scannedQuantity}
            value={`${formatQuantity(model.metrics.totalScannedQuantity, preferences.locale)} / ${formatQuantity(
              model.metrics.totalRequiredQuantity,
              preferences.locale
            )}`}
          />
          <Metric label={copy.qc.rejectedScans} value={model.metrics.rejectedScanCount.toString()} />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadQc ? (
              <EmptyState
                title={copy.qcStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.qcStates[model.state].detail} ${model.errorMessage}`
                    : copy.qcStates[model.state].detail
                }
              />
            ) : (
              <>
                <QcSessionsTable copy={copy.qc} sessions={model.sessions} locale={preferences.locale} />
                <ItemTotalsTable copy={copy.qc} itemTotals={model.itemTotals} locale={preferences.locale} />
                <ScanSignalsTable copy={copy.qc} scans={model.scans} locale={preferences.locale} />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.qc.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [copy.qc.qcAccess, permissionLabel(model.context.permissions, "warehouse.qc", preferences.locale)],
                [
                  copy.qc.fulfillmentLabels,
                  model.fulfillmentLabelsVisible
                    ? copy.qc.visibleWithWarehousePick
                    : copy.qc.hiddenWithoutWarehousePick
                ],
                [
                  copy.qc.productLabels,
                  model.productLabelsVisible
                    ? copy.qc.visibleWithProductView
                    : copy.qc.hiddenWithoutProductView
                ],
                [
                  copy.qc.overridePermission,
                  model.overrideVisible
                    ? copy.common.granted
                    : `${copy.common.requires} warehouse.qc.override`
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.qc.blockedInScreen}
              rows={[
                [copy.qc.scanIngestion, copy.qc.serviceRequired],
                [copy.qc.normalCompletion, copy.qc.wrapperOnly],
                [copy.qc.overrideAction, copy.qc.wrapperOnly],
                [copy.qc.stockDeduction, copy.qc.notQcResponsibility],
                [copy.qc.finalLabelGate, copy.qc.shippingWrapperOnly]
              ]}
            />
            <BoundaryPanel
              icon={<ClipboardCheck aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.qc.snapshotScope}
              rows={[
                [copy.qc.sessionLimit, copy.qc.seventyFiveLatest],
                [copy.qc.itemTotalLimit, copy.qc.twoHundredLatest],
                [copy.qc.scanSignalLimit, copy.qc.oneHundredLatest],
                [copy.qc.scanValues, copy.qc.notSelected]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function QcSessionsTable({
  copy,
  sessions,
  locale
}: {
  copy: Record<string, string>;
  sessions: QcSessionSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.qcQueue}</h2>
        </div>
        <span className="text-xs text-muted">
          {sessions.length} {copy.sessions}
        </span>
      </div>
      {sessions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noSessions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.qcStatus}</th>
                <th className="px-5 py-3 font-medium">{copy.fulfillmentStatus}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.progress}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.blockingItems}</th>
                <th className="px-5 py-3 font-medium">{copy.started}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{session.fulfillmentLabel}</p>
                    <p className="max-w-[240px] truncate text-xs text-muted">{session.id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-5 py-4">
                    {session.fulfillmentStatus ? <StatusBadge status={session.fulfillmentStatus} /> : "-"}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(session.scannedQuantity, locale)} / {formatQuantity(session.requiredQuantity, locale)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-danger">
                    {session.blockingItemCount}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {session.startedAt ? formatDate(session.startedAt, locale) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(session.updatedAt, locale)}
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

function ItemTotalsTable({
  copy,
  itemTotals,
  locale
}: {
  copy: Record<string, string>;
  itemTotals: QcItemTotalSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ListChecks aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.itemTotals}</h2>
        </div>
        <span className="text-xs text-muted">
          {itemTotals.length} {copy.items}
        </span>
      </div>
      {itemTotals.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noItemTotals}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.item}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.required}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.scanned}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.remaining}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {itemTotals.map((itemTotal) => (
                <tr key={itemTotal.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{itemTotal.fulfillmentLabel}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[300px] truncate">{itemTotal.variantLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={itemTotal.status} />
                  </td>
                  <td className="px-5 py-4 text-right">{formatQuantity(itemTotal.requiredQuantity, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatQuantity(itemTotal.scannedQuantity, locale)}</td>
                  <td className="px-5 py-4 text-right font-semibold">
                    {formatQuantity(Math.max(itemTotal.requiredQuantity - itemTotal.scannedQuantity, 0), locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(itemTotal.updatedAt, locale)}
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

function ScanSignalsTable({
  copy,
  scans,
  locale
}: {
  copy: Record<string, string>;
  scans: QcScanSignalSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Barcode aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.recentScanSignals}</h2>
        </div>
        <span className="text-xs text-muted">
          {scans.length} {copy.scans}
        </span>
      </div>
      {scans.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noScans}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.scannedAt}</th>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.item}</th>
                <th className="px-5 py-3 font-medium">{copy.scanType}</th>
                <th className="px-5 py-3 font-medium">{copy.match}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 font-medium">{copy.errorCode}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-panel-strong/60">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(scan.scannedAt, locale)}
                  </td>
                  <td className="px-5 py-4 font-semibold">{scan.fulfillmentLabel}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[280px] truncate">{scan.fulfillmentItemLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md border border-line bg-panel-strong px-2 py-1 text-xs font-semibold">
                      {scan.scanType}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={scan.matched ? "MATCHED" : "REJECTED"} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(scan.quantityIncrement, locale)}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">{scan.errorCode ?? "-"}</td>
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
  if (["PASSED", "QC_PASSED", "MATCHED"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["FAILED", "CANCELLED", "REJECTED"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["PENDING", "PARTIAL", "IN_PROGRESS", "QC_PENDING"].includes(status)) {
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

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
