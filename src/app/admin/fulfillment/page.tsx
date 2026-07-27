import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CircleSlash,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
  Truck
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getFulfillmentReadModel,
  type FulfillmentItemSummary,
  type FulfillmentQcSessionSummary,
  type FulfillmentShipmentSummary,
  type FulfillmentSummary
} from "@/lib/admin/fulfillment";

export const dynamic = "force-dynamic";

export default async function FulfillmentPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getFulfillmentReadModel();
  const canReadFulfillment = model.state === "ready";

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
              <PackageCheck aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.fulfillment.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.fulfillment.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/fulfillment" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} /{" "}
                {copy.fulfillment.fulfillmentAccess}:{" "}
                {permissionLabel(model.context.permissions, "warehouse.pick", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={copy.fulfillment.fulfillments}
            value={model.metrics.fulfillmentCount.toString()}
          />
          <Metric
            label={copy.fulfillment.activeFulfillments}
            value={model.metrics.activeFulfillmentCount.toString()}
          />
          <Metric
            label={copy.fulfillment.totalItems}
            value={model.metrics.itemCount.toString()}
          />
          <Metric
            label={copy.fulfillment.totalQuantity}
            value={formatQuantity(model.metrics.totalQuantity, preferences.locale)}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadFulfillment ? (
              <EmptyState
                title={copy.fulfillmentStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.fulfillmentStates[model.state].detail} ${model.errorMessage}`
                    : copy.fulfillmentStates[model.state].detail
                }
              />
            ) : (
              <>
                <FulfillmentTable
                  copy={copy.fulfillment}
                  fulfillments={model.fulfillments}
                  locale={preferences.locale}
                />
                <ItemsTable
                  copy={copy.fulfillment}
                  items={model.items}
                  locale={preferences.locale}
                />
                <QcSessionsTable
                  copy={copy.fulfillment}
                  sessions={model.qcSessions}
                  visible={model.qcSignalsVisible}
                  locale={preferences.locale}
                />
                <ShipmentsTable
                  copy={copy.fulfillment}
                  shipments={model.shipments}
                  visible={model.shippingSignalsVisible}
                  locale={preferences.locale}
                />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.fulfillment.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.fulfillment.fulfillmentAccess,
                  permissionLabel(model.context.permissions, "warehouse.pick", preferences.locale)
                ],
                [
                  copy.fulfillment.qcSignals,
                  model.qcSignalsVisible
                    ? copy.fulfillment.visibleWithWarehouseQc
                    : copy.fulfillment.hiddenWithoutWarehouseQc
                ],
                [
                  copy.fulfillment.shippingSignals,
                  model.shippingSignalsVisible
                    ? copy.fulfillment.visibleWithShippingCreate
                    : copy.fulfillment.hiddenWithoutShippingCreate
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.fulfillment.blockedInScreen}
              rows={[
                [copy.fulfillment.pickPackMutation, copy.fulfillment.serviceRequired],
                [copy.fulfillment.qcCompletion, copy.fulfillment.wrapperOnly],
                [copy.fulfillment.shipmentLabel, copy.fulfillment.wrapperOnly],
                [copy.fulfillment.carrierWebhook, copy.fulfillment.edgeBoundaryOnly]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.fulfillment.snapshotScope}
              rows={[
                [copy.fulfillment.fulfillmentLimit, copy.fulfillment.seventyFiveLatest],
                [copy.fulfillment.itemLimit, copy.fulfillment.oneHundredFiftyLatest],
                [copy.fulfillment.qcLimit, copy.fulfillment.fiftyLatestOrHidden],
                [copy.fulfillment.shipmentLimit, copy.fulfillment.fiftyLatestOrHidden]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function FulfillmentTable({
  copy,
  fulfillments,
  locale
}: {
  copy: Record<string, string>;
  fulfillments: FulfillmentSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.fulfillmentQueue}</h2>
        </div>
        <span className="text-xs text-muted">
          {fulfillments.length} {copy.fulfillments}
        </span>
      </div>
      {fulfillments.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noFulfillments}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.warehouse}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.items}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 font-medium">{copy.packed}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {fulfillments.map((fulfillment) => (
                <tr key={fulfillment.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{fulfillment.fulfillmentNumber}</p>
                    <p className="max-w-[240px] truncate text-xs text-muted">{fulfillment.id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={fulfillment.status} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[180px] truncate text-xs text-muted">
                      {fulfillment.warehouseId}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{fulfillment.itemCount}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(fulfillment.totalQuantity, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {fulfillment.packedAt ? formatDate(fulfillment.packedAt, locale) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(fulfillment.updatedAt, locale)}
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

function ItemsTable({
  copy,
  items,
  locale
}: {
  copy: Record<string, string>;
  items: FulfillmentItemSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Boxes aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.fulfillmentItems}</h2>
        </div>
        <span className="text-xs text-muted">
          {items.length} {copy.items}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noItems}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 font-medium">{copy.variant}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{item.fulfillmentNumber}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate font-medium">{item.orderLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[260px] truncate">{item.variantLabel}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {formatQuantity(item.quantity, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(item.createdAt, locale)}
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

function QcSessionsTable({
  copy,
  sessions,
  visible,
  locale
}: {
  copy: Record<string, string>;
  sessions: FulfillmentQcSessionSummary[];
  visible: boolean;
  locale: "th" | "en";
}) {
  if (!visible) {
    return <HiddenPanel title={copy.qcSessions} detail={copy.qcHiddenDetail} />;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.qcSessions}</h2>
        </div>
        <span className="text-xs text-muted">
          {sessions.length} {copy.sessions}
        </span>
      </div>
      {sessions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noQcSessions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.started}</th>
                <th className="px-5 py-3 font-medium">{copy.completed}</th>
                <th className="px-5 py-3 font-medium">{copy.failureReason}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{session.fulfillmentNumber}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {session.startedAt ? formatDate(session.startedAt, locale) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {session.completedAt ? formatDate(session.completedAt, locale) : "-"}
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-4 text-xs text-muted">
                    {session.failureReason ?? "-"}
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

function ShipmentsTable({
  copy,
  shipments,
  visible,
  locale
}: {
  copy: Record<string, string>;
  shipments: FulfillmentShipmentSummary[];
  visible: boolean;
  locale: "th" | "en";
}) {
  if (!visible) {
    return <HiddenPanel title={copy.shipments} detail={copy.shippingHiddenDetail} />;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Truck aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.shipments}</h2>
        </div>
        <span className="text-xs text-muted">
          {shipments.length} {copy.shipments}
        </span>
      </div>
      {shipments.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noShipments}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.shipment}</th>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.method}</th>
                <th className="px-5 py-3 font-medium">{copy.tracking}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.packages}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{shipment.shipmentNumber}</td>
                  <td className="px-5 py-4">{shipment.fulfillmentNumber}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td className="px-5 py-4">{shipment.shippingMethod ?? "-"}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[180px] truncate">{shipment.trackingNumber ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{shipment.packageCount}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(shipment.createdAt, locale)}
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
  if (["QC_PASSED", "READY_TO_SHIP", "SHIPPED", "COMPLETED", "PASSED", "DELIVERED"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["FAILED", "CANCELLED", "EXCEPTION", "RTO"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["READY_TO_PICK", "PICKING", "QC_PENDING", "PACKING", "IN_PROGRESS", "IN_TRANSIT"].includes(status)) {
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

function HiddenPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-lg border border-dashed border-line bg-panel px-5 py-6 shadow-[var(--shadow-panel)]">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </section>
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
