import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CircleSlash,
  Package,
  Radio,
  ShieldCheck,
  Truck
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getShippingReadModel,
  type ShippingPackageItemSummary,
  type ShippingPackageSummary,
  type ShippingProviderSummary,
  type ShippingShipmentSummary,
  type ShippingTrackingEventSummary
} from "@/lib/admin/shipping";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getShippingReadModel();
  const canReadShipping = model.state === "ready";

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
              <Truck aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.shipping.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.shipping.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/shipping" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} /{" "}
                {copy.shipping.shippingAccess}:{" "}
                {permissionLabel(model.context.permissions, "shipping.create", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.shipping.shipments} value={model.metrics.shipmentCount.toString()} />
          <Metric
            label={copy.shipping.readyForHandoff}
            value={model.metrics.readyForHandoffCount.toString()}
          />
          <Metric label={copy.shipping.inTransit} value={model.metrics.inTransitCount.toString()} />
          <Metric
            label={copy.shipping.trackingEvents}
            value={model.metrics.trackingEventCount.toString()}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadShipping ? (
              <EmptyState
                title={copy.shippingStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.shippingStates[model.state].detail} ${model.errorMessage}`
                    : copy.shippingStates[model.state].detail
                }
              />
            ) : (
              <>
                <ShipmentTable
                  copy={copy.shipping}
                  shipments={model.shipments}
                  locale={preferences.locale}
                />
                <PackagesTable
                  copy={copy.shipping}
                  packages={model.packages}
                  locale={preferences.locale}
                />
                <PackageItemsTable
                  copy={copy.shipping}
                  items={model.packageItems}
                  locale={preferences.locale}
                />
                <TrackingEventsTable
                  copy={copy.shipping}
                  events={model.trackingEvents}
                  locale={preferences.locale}
                />
                <ProvidersTable copy={copy.shipping} providers={model.providers} />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.shipping.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.shipping.shippingAccess,
                  permissionLabel(model.context.permissions, "shipping.create", preferences.locale)
                ],
                [
                  copy.shipping.printLabelAccess,
                  model.printLabelVisible
                    ? copy.common.granted
                    : `${copy.common.requires} shipping.print_label`
                ],
                [
                  copy.shipping.fulfillmentLabels,
                  model.fulfillmentLabelsVisible
                    ? copy.shipping.visibleWithWarehousePick
                    : copy.shipping.hiddenWithoutWarehousePick
                ],
                [
                  copy.shipping.qcSignals,
                  model.qcSignalsVisible
                    ? copy.shipping.visibleWithWarehouseQc
                    : copy.shipping.hiddenWithoutWarehouseQc
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.shipping.blockedInScreen}
              rows={[
                [copy.shipping.labelCreation, copy.shipping.wrapperOnly],
                [copy.shipping.shipmentHandoff, copy.shipping.wrapperOnly],
                [copy.shipping.trackingUpdate, copy.shipping.wrapperOnly],
                [copy.shipping.carrierWebhook, copy.shipping.edgeBoundaryOnly],
                [copy.shipping.costAndCod, copy.shipping.notSelected]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.shipping.snapshotScope}
              rows={[
                [copy.shipping.shipmentLimit, copy.shipping.seventyFiveLatest],
                [copy.shipping.packageLimit, copy.shipping.oneHundredFiftyLatest],
                [copy.shipping.packageItemLimit, copy.shipping.twoHundredLatest],
                [copy.shipping.trackingLimit, copy.shipping.oneHundredLatest],
                [copy.shipping.sensitiveFields, copy.shipping.notSelected]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function ShipmentTable({
  copy,
  shipments,
  locale
}: {
  copy: Record<string, string>;
  shipments: ShippingShipmentSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Truck aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.shipmentQueue}</h2>
        </div>
        <span className="text-xs text-muted">
          {shipments.length} {copy.shipments}
        </span>
      </div>
      {shipments.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noShipments}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.shipment}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.fulfillment}</th>
                <th className="px-5 py-3 font-medium">{copy.provider}</th>
                <th className="px-5 py-3 font-medium">{copy.method}</th>
                <th className="px-5 py-3 font-medium">{copy.tracking}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.packages}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.weight}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{shipment.shipmentNumber}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted">{shipment.id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{shipment.fulfillmentLabel}</p>
                    <p className="text-xs text-muted">
                      {shipment.fulfillmentStatus ?? "-"} / {shipment.qcStatus ?? "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[180px] truncate">{shipment.providerLabel}</p>
                  </td>
                  <td className="px-5 py-4">{shipment.shippingMethod ?? "-"}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[180px] truncate">{shipment.trackingNumber ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{shipment.packageCount}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {shipment.actualWeightGrams ? formatWeight(shipment.actualWeightGrams, locale) : "-"}
                  </td>
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

function PackagesTable({
  copy,
  packages,
  locale
}: {
  copy: Record<string, string>;
  packages: ShippingPackageSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Package aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.packageManifest}</h2>
        </div>
        <span className="text-xs text-muted">
          {packages.length} {copy.packages}
        </span>
      </div>
      {packages.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noPackages}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.shipment}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.packageNo}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.weight}</th>
                <th className="px-5 py-3 font-medium">{copy.dimensions}</th>
                <th className="px-5 py-3 font-medium">{copy.tracking}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {packages.map((shipmentPackage) => (
                <tr key={shipmentPackage.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{shipmentPackage.shipmentNumber}</td>
                  <td className="px-5 py-4 text-right font-medium">{shipmentPackage.packageNumber}</td>
                  <td className="px-5 py-4 text-right">
                    {shipmentPackage.weightGrams ? formatWeight(shipmentPackage.weightGrams, locale) : "-"}
                  </td>
                  <td className="px-5 py-4">{shipmentPackage.dimensionsLabel}</td>
                  <td className="px-5 py-4">{shipmentPackage.trackingNumber ?? "-"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(shipmentPackage.createdAt, locale)}
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

function PackageItemsTable({
  copy,
  items,
  locale
}: {
  copy: Record<string, string>;
  items: ShippingPackageItemSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Boxes aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.packageItems}</h2>
        </div>
        <span className="text-xs text-muted">
          {items.length} {copy.items}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noPackageItems}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.shipment}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.packageNo}</th>
                <th className="px-5 py-3 font-medium">{copy.item}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.quantity}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{item.shipmentNumber}</td>
                  <td className="px-5 py-4 text-right">{item.packageNumber ?? "-"}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[340px] truncate">{item.fulfillmentItemLabel}</p>
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

function TrackingEventsTable({
  copy,
  events,
  locale
}: {
  copy: Record<string, string>;
  events: ShippingTrackingEventSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Radio aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.trackingTimeline}</h2>
        </div>
        <span className="text-xs text-muted">
          {events.length} {copy.events}
        </span>
      </div>
      {events.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noTrackingEvents}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.eventAt}</th>
                <th className="px-5 py-3 font-medium">{copy.shipment}</th>
                <th className="px-5 py-3 font-medium">{copy.eventCode}</th>
                <th className="px-5 py-3 font-medium">{copy.description}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-panel-strong/60">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(event.eventAt, locale)}
                  </td>
                  <td className="px-5 py-4 font-semibold">{event.shipmentNumber}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-md border border-line bg-panel-strong px-2 py-1 text-xs font-semibold">
                      {event.eventCode}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[360px] truncate">{event.eventDescription ?? "-"}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(event.createdAt, locale)}
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

function ProvidersTable({
  copy,
  providers
}: {
  copy: Record<string, string>;
  providers: ShippingProviderSummary[];
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.providers}</h2>
        </div>
        <span className="text-xs text-muted">
          {providers.length} {copy.providers}
        </span>
      </div>
      {providers.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noProviders}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.provider}</th>
                <th className="px-5 py-3 font-medium">{copy.providerCode}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.shipments}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4 font-semibold">{provider.name}</td>
                  <td className="px-5 py-4">{provider.providerCode}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={provider.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{provider.shipmentCount}</td>
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
  if (["DELIVERED", "ACTIVE"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["EXCEPTION", "RTO", "CANCELLED", "INACTIVE"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["DRAFT", "LABEL_CREATED", "READY_FOR_HANDOFF", "IN_TRANSIT"].includes(status)) {
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

function formatWeight(value: number, locale: "th" | "en") {
  return `${formatQuantity(value, locale)} g`;
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
