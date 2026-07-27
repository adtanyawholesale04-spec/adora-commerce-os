import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  ArrowLeft,
  Boxes,
  CircleSlash,
  ShieldCheck,
  Warehouse
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getInventoryReadModel,
  type InventoryBalanceSummary,
  type InventoryMovementSummary,
  type WarehouseInventorySummary
} from "@/lib/admin/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getInventoryReadModel();
  const canReadInventory = model.state === "ready";

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
              <Warehouse aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.inventory.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.inventory.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/inventory" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} · {copy.inventory.inventoryAccess}: {permissionLabel(model.context.permissions, "inventory.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.inventory.warehouses} value={model.metrics.warehouseCount.toString()} />
          <Metric label={copy.inventory.onHand} value={formatQuantity(model.metrics.onHand, preferences.locale)} />
          <Metric label={copy.inventory.available} value={formatQuantity(model.metrics.available, preferences.locale)} />
          <Metric label={copy.inventory.movementRows} value={model.metrics.movementCount.toString()} />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadInventory ? (
              <EmptyState
                title={copy.inventoryStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.inventoryStates[model.state].detail} ${model.errorMessage}`
                    : copy.inventoryStates[model.state].detail
                }
              />
            ) : (
              <>
                <WarehouseSummarySection
                  copy={copy.inventory}
                  summaries={model.warehouseSummaries}
                  locale={preferences.locale}
                />
                <BalanceTable
                  copy={copy.inventory}
                  rows={model.balanceRows}
                  locale={preferences.locale}
                />
                <MovementTable
                  copy={copy.inventory}
                  rows={model.movementRows}
                  locale={preferences.locale}
                />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.inventory.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [copy.inventory.inventoryAccess, permissionLabel(model.context.permissions, "inventory.view", preferences.locale)],
                [copy.inventory.productLabels, model.productLabelsVisible ? copy.inventory.labelsVisible : copy.inventory.labelsHidden]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.inventory.blockedInScreen}
              rows={[
                [copy.inventory.inventoryAdjust, copy.inventory.adjustReserveRelease],
                [copy.inventory.inventoryAdjust, copy.inventory.wrapperOnly],
                [copy.inventory.reservationAllocation, copy.inventory.notInFirstRead]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.inventory.snapshotScope}
              rows={[
                [copy.inventory.warehouseLimit, copy.inventory.oneHundred],
                [copy.inventory.balanceLimit, copy.inventory.fiveHundred],
                [copy.inventory.movementLimit, copy.inventory.fifty]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function WarehouseSummarySection({
  copy,
  summaries,
  locale
}: {
  copy: Record<string, string>;
  summaries: WarehouseInventorySummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Warehouse aria-hidden className="h-4 w-4 text-brand" />
        <h2 className="text-base font-semibold">{copy.warehouseSummary}</h2>
      </div>
      {summaries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noWarehouses}</p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {summaries.map((summary) => (
            <WarehouseCard key={summary.warehouseId} summary={summary} copy={copy} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}

function WarehouseCard({
  summary,
  copy,
  locale
}: {
  summary: WarehouseInventorySummary;
  copy: Record<string, string>;
  locale: "th" | "en";
}) {
  return (
    <article className="rounded-lg border border-line bg-panel-strong p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">{summary.warehouseCode}</p>
          <h3 className="mt-1 truncate font-semibold">{summary.warehouseName}</h3>
        </div>
        <span className="rounded-md border border-success/30 bg-success/10 px-2 py-1 text-xs font-semibold text-success">
          {summary.warehouseStatus}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">{summary.variantCount} {copy.variant} · {copy.available}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <MiniStat label={copy.onHand} value={formatQuantity(summary.totals.onHand, locale)} />
        <MiniStat label={copy.reserved} value={formatQuantity(summary.totals.reserved, locale)} />
        <MiniStat label={copy.allocated} value={formatQuantity(summary.totals.allocated, locale)} />
        <MiniStat label={copy.available} value={formatQuantity(summary.totals.available, locale)} />
      </div>
    </article>
  );
}

function BalanceTable({
  copy,
  rows,
  locale
}: {
  copy: Record<string, string>;
  rows: InventoryBalanceSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Boxes aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.balances}</h2>
        </div>
        <span className="text-xs text-muted">{rows.length} {copy.balanceRows}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noBalances}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.warehouse}</th>
                <th className="px-5 py-3 font-medium">{copy.stockCode}</th>
                <th className="px-5 py-3 font-medium">{copy.variant}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.onHand}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.reserved}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.available}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-medium">{row.warehouseName}</p>
                    <p className="text-xs text-muted">{row.warehouseCode}</p>
                  </td>
                  <td className="px-5 py-4 font-medium">{row.stockCode ?? "-"}</td>
                  <td className="max-w-[220px] px-5 py-4">
                    <p className="truncate">{row.variantLabel}</p>
                    <p className="truncate text-xs text-muted">{row.productName ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{formatQuantity(row.totals.onHand, locale)}</td>
                  <td className="px-5 py-4 text-right">{formatQuantity(row.totals.reserved, locale)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-brand">{formatQuantity(row.totals.available, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(row.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MovementTable({
  copy,
  rows,
  locale
}: {
  copy: Record<string, string>;
  rows: InventoryMovementSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ArrowDownUp aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.recentMovements}</h2>
        </div>
        <Activity aria-hidden className="h-4 w-4 text-muted" />
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noMovements}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.createdAt}</th>
                <th className="px-5 py-3 font-medium">{copy.warehouse}</th>
                <th className="px-5 py-3 font-medium">{copy.variant}</th>
                <th className="px-5 py-3 font-medium">{copy.movementType}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantityDelta}</th>
                <th className="px-5 py-3 font-medium">{copy.reference}</th>
                <th className="px-5 py-3 font-medium">{copy.reason}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-panel-strong/60">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(row.createdAt, locale)}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{row.warehouseName}</p>
                    <p className="text-xs text-muted">{row.warehouseCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{row.stockCode ?? row.variantLabel}</p>
                    <p className="max-w-[180px] truncate text-xs text-muted">{row.variantLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md border border-line bg-panel-strong px-2 py-1 text-xs font-semibold">{row.movementType}</span>
                  </td>
                  <td className={`px-5 py-4 text-right font-semibold ${row.quantityDelta > 0 ? "text-success" : "text-danger"}`}>
                    {row.quantityDelta > 0 ? "+" : ""}{formatQuantity(row.quantityDelta, locale)}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">{row.referenceType ?? "-"}</td>
                  <td className="max-w-[180px] truncate px-5 py-4 text-xs text-muted">{row.reason ?? "-"}</td>
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
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
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
