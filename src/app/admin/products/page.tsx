import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CircleSlash,
  PackageSearch,
  ShieldCheck,
  Tag
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { getProductsReadModel, type InventoryTotals } from "@/lib/admin/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getProductsReadModel();
  const canReadProducts = model.state === "ready";

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
              <PackageSearch aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.products.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{copy.products.pageTitle}</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher
              preferences={preferences}
              returnPath="/admin/products"
            />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} ·{" "}
                {model.inventoryVisible
                  ? copy.products.organizationInventoryVisible
                  : copy.products.organizationInventoryHidden}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label={copy.products.products} value={model.metrics.productCount.toString()} />
          <Metric
            label={copy.products.active}
            value={model.metrics.activeProductCount.toString()}
          />
          <Metric label={copy.products.variants} value={model.metrics.variantCount.toString()} />
          <Metric
            label={copy.products.available}
            value={
              model.metrics.availableQuantity === null
                ? copy.common.hidden
                : formatQuantity(model.metrics.availableQuantity)
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            {!canReadProducts || model.products.length === 0 ? (
              <EmptyState
                title={copy.productStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.productStates[model.state].detail} ${model.errorMessage}`
                    : copy.productStates[model.state].detail
                }
              />
            ) : (
              model.products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]"
                >
                  <div className="grid gap-4 border-b border-line px-5 py-4 xl:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-line bg-panel-strong px-2 py-1 text-xs font-semibold text-muted">
                          {product.code}
                        </span>
                        <StatusBadge status={product.status} />
                      </div>
                      <h2 className="mt-2 truncate text-lg font-semibold">
                        {product.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {product.categoryName ?? copy.products.uncategorized} ·{" "}
                        {product.brandName ?? copy.products.noBrand}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:min-w-[420px]">
                      <MiniStat
                        label={copy.products.variants}
                        value={product.variantCount.toString()}
                      />
                      <MiniStat
                        label={copy.products.onHand}
                        value={formatTotals(product.totals, "onHand", preferences.locale)}
                      />
                      <MiniStat
                        label={copy.products.reserved}
                        value={formatTotals(product.totals, "reserved", preferences.locale)}
                      />
                      <MiniStat
                        label={copy.products.available}
                        value={formatTotals(product.totals, "available", preferences.locale)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                      <thead className="bg-panel-strong text-xs uppercase text-muted">
                        <tr>
                          <th className="px-5 py-3 font-medium">{copy.products.stockCode}</th>
                          <th className="px-5 py-3 font-medium">{copy.products.variant}</th>
                          <th className="px-5 py-3 font-medium">{copy.products.barcode}</th>
                          <th className="px-5 py-3 text-right font-medium">
                            {copy.products.price}
                          </th>
                          <th className="px-5 py-3 text-right font-medium">
                            {copy.products.onHand}
                          </th>
                          <th className="px-5 py-3 text-right font-medium">
                            {copy.products.available}
                          </th>
                          <th className="px-5 py-3 font-medium">{copy.products.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {product.variants.length === 0 ? (
                          <tr>
                            <td className="px-5 py-4 text-muted" colSpan={7}>
                              {copy.products.noVariants}
                            </td>
                          </tr>
                        ) : (
                          product.variants.map((variant) => (
                            <tr key={variant.id}>
                              <td className="px-5 py-4 font-medium">{variant.stockCode}</td>
                              <td className="px-5 py-4">{variant.name}</td>
                              <td className="px-5 py-4 text-muted">
                                {variant.barcode ?? "N/A"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {formatMoney(variant.basePrice)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {formatTotals(variant.totals, "onHand", preferences.locale)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {formatTotals(
                                  variant.totals,
                                  "available",
                                  preferences.locale
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <StatusBadge status={variant.status} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.products.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.products.productAccess,
                  permissionLabel(model.context.permissions, "product.view", preferences.locale)
                ],
                [
                  copy.products.inventoryAccess,
                  permissionLabel(model.context.permissions, "inventory.view", preferences.locale)
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.products.blockedInScreen}
              rows={[
                [copy.products.createEdit, copy.common.noDirectUiAction],
                [copy.products.costFields, copy.products.costNotSelected],
                [copy.products.inventoryMutation, copy.products.rpcWrapperOnly]
              ]}
            />
            <BoundaryPanel
              icon={<Tag aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.products.snapshotScope}
              rows={[
                [copy.products.productLimit, copy.products.fiftyLatest],
                [copy.products.variantLimit, copy.products.twoHundredLatest],
                [
                  copy.products.balanceLimit,
                  model.inventoryVisible ? copy.products.fiveHundredRows : copy.common.hidden
                ]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
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
    <div className="rounded-md border border-line bg-panel-strong px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
        isActive
          ? "border-success/30 bg-success/10 text-success"
          : "border-line bg-panel-strong text-muted"
      }`}
    >
      {status}
    </span>
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
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1">
            <dt className="text-xs uppercase text-muted">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function permissionLabel(
  permissions: string[],
  permission: string,
  locale: "th" | "en"
) {
  const copy = adminCopy[locale].common;
  return permissions.includes(permission) ? copy.granted : `${copy.requires} ${permission}`;
}

function formatTotals(
  totals: InventoryTotals | null,
  key: keyof InventoryTotals,
  locale: "th" | "en"
) {
  return totals ? formatQuantity(totals[key]) : adminCopy[locale].common.hidden;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2
  }).format(value);
}
