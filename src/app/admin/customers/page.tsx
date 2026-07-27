import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CircleSlash,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UsersRound
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getCustomersReadModel,
  type CustomerSummary
} from "@/lib/admin/customers";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getCustomersReadModel();
  const canReadCustomers = model.state === "ready";

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
              <UsersRound aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.customers.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.customers.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/customers" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous}{" "}
                · {copy.customers.customerAccess}:{" "}
                {permissionLabel(model.context.permissions, "customer.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.customers.customers} value={model.metrics.customerCount.toString()} />
          <Metric label={copy.customers.active} value={model.metrics.activeCustomerCount.toString()} />
          <Metric label={copy.customers.blocked} value={model.metrics.blockedCustomerCount.toString()} />
          <Metric
            label={copy.customers.lifetimeSpend}
            value={
              model.metrics.lifetimeSpend === null
                ? copy.common.hidden
                : formatMoney(model.metrics.lifetimeSpend, preferences.locale)
            }
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadCustomers ? (
              <EmptyState
                title={copy.customerStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.customerStates[model.state].detail} ${model.errorMessage}`
                    : copy.customerStates[model.state].detail
                }
              />
            ) : (
              <>
                <CustomerCards
                  copy={copy.customers}
                  customers={model.customers.slice(0, 6)}
                  locale={preferences.locale}
                  orderSignalsVisible={model.orderSignalsVisible}
                />
                <CustomersTable
                  copy={copy.customers}
                  customers={model.customers}
                  locale={preferences.locale}
                  orderSignalsVisible={model.orderSignalsVisible}
                />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.customers.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.customers.customerAccess,
                  permissionLabel(model.context.permissions, "customer.view", preferences.locale)
                ],
                [
                  copy.customers.orderSignals,
                  model.orderSignalsVisible
                    ? copy.customers.visibleWithOrderView
                    : copy.customers.hiddenWithoutOrderView
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.customers.blockedInScreen}
              rows={[
                [copy.customers.profileContactEdit, copy.customers.customerServiceRequired],
                [copy.customers.customerMerge, copy.customers.ownerApprovedWorkflow],
                [copy.customers.anonymizeDelete, copy.customers.privacyWorkflowRequired]
              ]}
            />
            <BoundaryPanel
              icon={<ShoppingBag aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.customers.snapshotScope}
              rows={[
                [copy.customers.customerLimit, copy.customers.seventyFiveLatest],
                [
                  copy.customers.orderSignalLimit,
                  model.orderSignalsVisible ? copy.customers.twoHundredFiftyLatest : copy.common.hidden
                ],
                [copy.customers.relatedTables, copy.customers.deferredReadContracts]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function CustomerCards({
  copy,
  customers,
  locale,
  orderSignalsVisible
}: {
  copy: Record<string, string>;
  customers: CustomerSummary[];
  locale: "th" | "en";
  orderSignalsVisible: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <UserRound aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.customerSnapshot}</h2>
        </div>
        <span className="text-xs text-muted">{copy.seventyFiveLatest}</span>
      </div>
      {customers.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noCustomers}</p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {customers.map((customer) => (
            <article
              key={customer.id}
              className="rounded-lg border border-line bg-panel-strong p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                    {customer.code}
                  </p>
                  <h3 className="mt-1 truncate font-semibold">{customer.displayName}</h3>
                </div>
                <StatusBadge status={customer.status} />
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <ContactRow icon={<Phone aria-hidden className="h-4 w-4" />} value={customer.phone} />
                <ContactRow icon={<Mail aria-hidden className="h-4 w-4" />} value={customer.email} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat
                  label={copy.orders}
                  value={
                    orderSignalsVisible
                      ? (customer.orderSignals?.orderCount ?? 0).toString()
                      : "-"
                  }
                />
                <MiniStat
                  label={copy.spend}
                  value={
                    orderSignalsVisible
                      ? formatMoney(customer.orderSignals?.lifetimeSpend ?? 0, locale)
                      : "-"
                  }
                />
                <MiniStat label={copy.updated} value={formatDate(customer.updatedAt, locale)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CustomersTable({
  copy,
  customers,
  locale,
  orderSignalsVisible
}: {
  copy: Record<string, string>;
  customers: CustomerSummary[];
  locale: "th" | "en";
  orderSignalsVisible: boolean;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <UsersRound aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.customerList}</h2>
        </div>
        <span className="text-xs text-muted">
          {customers.length} {copy.customers}
        </span>
      </div>
      {customers.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noCustomers}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.customer}</th>
                <th className="px-5 py-3 font-medium">{copy.contact}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.orders}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.spend}</th>
                <th className="px-5 py-3 font-medium">{copy.latestOrder}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{customer.displayName}</p>
                    <p className="text-xs text-muted">{customer.code}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate">{customer.phone ?? "-"}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted">
                      {customer.email ?? "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {orderSignalsVisible ? customer.orderSignals?.orderCount ?? 0 : "-"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {orderSignalsVisible
                      ? formatMoney(customer.orderSignals?.lifetimeSpend ?? 0, locale)
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    {orderSignalsVisible && customer.orderSignals?.latestOrderNumber ? (
                      <>
                        <p className="font-medium">{customer.orderSignals.latestOrderNumber}</p>
                        <p className="text-xs text-muted">
                          {customer.orderSignals.latestOrderStatus} ·{" "}
                          {customer.orderSignals.latestOrderAt
                            ? formatDate(customer.orderSignals.latestOrderAt, locale)
                            : "-"}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatDate(customer.updatedAt, locale)}
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

function ContactRow({ icon, value }: { icon: ReactNode; value: string | null }) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-muted">
      <span className="text-brand">{icon}</span>
      <span className="truncate">{value ?? "-"}</span>
    </p>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "ACTIVE"
      ? "border-success/30 bg-success/10 text-success"
      : status === "BLOCKED"
        ? "border-danger/30 bg-danger/10 text-danger"
        : "border-line bg-panel-strong text-muted";

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
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

function formatMoney(value: number, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}
