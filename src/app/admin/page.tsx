import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleSlash,
  Gauge,
  LogOut,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import { AdminMagicLinkForm } from "@/app/admin/_components/admin-magic-link-form";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import {
  signInWithEmailAction,
  signOutAction,
  switchOrganizationAction
} from "@/app/admin/actions";
import {
  adminNavigation,
  type AdminNavStatus
} from "@/lib/admin/navigation";
import { getDashboardReadModel } from "@/lib/admin/dashboard";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";

export const dynamic = "force-dynamic";

const statusClassNames: Record<AdminNavStatus, string> = {
  READY_FOR_READ: "border-success/30 bg-success/10 text-success",
  READY_FOR_GUARDED_ACTION: "border-brand/30 bg-brand/10 text-brand",
  PARTIAL_ACTION_READY: "border-warning/30 bg-warning/10 text-warning",
  NEEDS_SERVICE: "border-line bg-panel-strong text-muted",
  NEEDS_READ_MODEL: "border-brand/25 bg-brand/10 text-brand",
  COMMERCIAL_WRITES_BLOCKED: "border-danger/30 bg-danger/10 text-danger"
};

type AdminPageProps = {
  searchParams?: Promise<{
    auth?: string;
    organization?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getDashboardReadModel();
  const context = model.context;
  const visibleItems = model.moduleRows;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-r border-white/10 bg-sidebar text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="border-b border-white/10 px-5 py-6">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#50C3FF]">
              {copy.shell.productName}
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{copy.shell.sectionName}</h1>
            <p className="mt-2 text-xs leading-5 text-white/70">
              {copy.shell.sectionDescription}
            </p>
          </div>

          <nav className="grid gap-1.5 px-3 py-4" aria-label={copy.shell.moduleBoundary}>
            {visibleItems.map((item) => {
              const navItem = adminNavigation.find((navigationItem) => navigationItem.id === item.id);
              const Icon = navItem?.icon ?? Gauge;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  aria-disabled={!item.allowed}
                  className={`grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                    item.allowed
                      ? "border-transparent text-white hover:border-white/10 hover:bg-white/10"
                      : "border-transparent cursor-not-allowed text-white/55 opacity-75"
                  }`}
                  title={
                    item.allowed
                      ? item.actionBoundary
                      : `${copy.common.requires} ${item.requiredPermissions.join(" or ")}`
                  }
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                  {item.allowed ? (
                    <CheckCircle2 aria-label="Allowed" className="h-4 w-4 text-brand" />
                  ) : (
                    <LockKeyhole aria-label="Permission required" className="h-4 w-4" />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="border-t border-white/10 bg-black/10 px-4 py-4">
            <SessionPanel
              mode={context.mode}
              userEmail={context.userEmail}
              authState={params?.auth}
              locale={preferences.locale}
            />
            <div className="mt-4">
              <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin" />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-line bg-panel px-5 py-5 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">{copy.shell.pageCode}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{copy.shell.pageTitle}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  {copy.shell.pageDescription}
                </p>
              </div>
              <EnvironmentBanner mode={context.mode} locale={preferences.locale} />
            </div>
            <AuthNotice
              authState={params?.auth}
              organizationState={params?.organization}
              locale={preferences.locale}
            />
          </header>

          <div className="grid gap-6 px-5 py-6 lg:px-7">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label={copy.shell.modulesMapped}
                value={model.metrics.modulesMapped.toString()}
                detail={copy.shell.noSensitiveWrites}
              />
              <MetricCard
                label={copy.shell.actionReadyModules}
                value={model.metrics.readReadyModules.toString()}
                detail={copy.shell.readOrWrapperBacked}
              />
              <MetricCard
                label={copy.shell.grantedPermissions}
                value={model.metrics.permissionCount.toString()}
                detail={context.membershipStatus ?? copy.common.unavailable}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={copy.shell.products}
                value={formatOptionalNumber(model.metrics.productCount, preferences.locale)}
                detail={copy.shell.productViewRequired}
              />
              <MetricCard
                label={copy.shell.availableStock}
                value={formatOptionalNumber(model.metrics.inventoryAvailable, preferences.locale)}
                detail={copy.shell.inventoryViewRequired}
              />
              <MetricCard
                label={copy.shell.customers}
                value={formatOptionalNumber(model.metrics.customerCount, preferences.locale)}
                detail={copy.shell.customerViewRequired}
              />
              <MetricCard
                label={copy.shell.openOrders}
                value={formatOptionalNumber(model.metrics.openOrderCount, preferences.locale)}
                detail={copy.shell.orderViewRequired}
              />
              <MetricCard
                label={copy.shell.paymentDue}
                value={formatOptionalNumber(model.metrics.paymentDueAmount, preferences.locale)}
                detail={copy.shell.orderViewRequired}
              />
              <MetricCard
                label={copy.shell.fulfillmentQueue}
                value={formatOptionalNumber(model.metrics.fulfillmentQueueCount, preferences.locale)}
                detail={copy.shell.warehousePickRequired}
              />
              <MetricCard
                label={copy.shell.qcQueue}
                value={formatOptionalNumber(model.metrics.qcQueueCount, preferences.locale)}
                detail={copy.shell.warehouseQcRequired}
              />
              <MetricCard
                label={copy.shell.shippingQueue}
                value={formatOptionalNumber(model.metrics.shipmentQueueCount, preferences.locale)}
                detail={copy.shell.shippingCreateRequired}
              />
            </section>

            <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
                <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                  <Gauge aria-hidden className="h-4 w-4 text-brand" />
                  <h3 className="text-base font-semibold">{copy.shell.dashboardSnapshot}</h3>
                </div>
                {model.state !== "ready" ? (
                  <div className="border-b border-line px-5 py-4 text-sm text-muted">
                    {model.errorMessage
                      ? `${copy.dashboardStates[model.state].detail} ${model.errorMessage}`
                      : copy.dashboardStates[model.state].detail}
                  </div>
                ) : null}
                <div className="border-b border-line px-5 py-4">
                  <h3 className="text-base font-semibold">{copy.shell.moduleBoundary}</h3>
                </div>
                <div className="divide-y divide-line">
                  {visibleItems.map((item) => {
                    const navItem = adminNavigation.find((navigationItem) => navigationItem.id === item.id);
                    const Icon = navItem?.icon ?? Gauge;

                    return (
                      <div
                        key={item.id}
                        className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(180px,0.85fr)_minmax(0,1fr)_auto]"
                      >
                        <div className="flex items-center gap-3">
                          <Icon aria-hidden className="h-5 w-5 text-brand" />
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-muted">
                              {item.requiredPermissions.join(" or ")}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-muted">
                          {item.actionBoundary}
                        </p>
                        <div className="flex items-center justify-between gap-3 lg:justify-end">
                          <span
                          className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClassNames[item.status]}`}
                          >
                            {copy.navStatus[item.status]}
                          </span>
                          {item.allowed ? (
                            <ShieldCheck className="h-4 w-4 text-brand" />
                          ) : (
                            <CircleSlash className="h-4 w-4 text-muted" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="grid content-start gap-4">
                <ContextPanel
                  title={copy.shell.tenantContext}
                  rows={[
                    [copy.shell.user, context.userEmail ?? copy.shell.notSignedIn],
                    [copy.shell.organization, context.organizationName ?? copy.common.unavailable],
                    [
                      copy.shell.organizationStatus,
                      context.organizationStatus ?? copy.common.unavailable
                    ],
                    [copy.shell.membership, context.membershipStatus ?? copy.common.unavailable]
                  ]}
                />
                <OrganizationSwitcher
                  memberships={context.memberships}
                  disabled={context.mode !== "configured" || context.memberships.length < 2}
                  locale={preferences.locale}
                />
                <ContextPanel
                  title={copy.shell.guardrails}
                  rows={model.guardrailRows.map((row) => [row.label, row.value])}
                />
              </aside>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatOptionalNumber(value: number | null, locale: "th" | "en") {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 2
  }).format(value);
}

function SessionPanel({
  mode,
  userEmail,
  authState,
  locale
}: {
  mode: string;
  userEmail: string | null;
  authState?: string;
  locale: "th" | "en";
}) {
  const copy = adminCopy[locale];

  if (mode === "missing_env") {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
        {copy.shell.supabaseEnvMissing}
      </div>
    );
  }

  if (mode === "anonymous") {
    return (
      <AdminMagicLinkForm
        action={signInWithEmailAction}
        siteKey={String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim()}
        emailLabel={copy.shell.email}
        submitLabel={copy.shell.sendMagicLink}
        unavailableLabel={
          locale === "th"
            ? "ยังไม่ได้ตั้งค่าการตรวจสอบความปลอดภัย"
            : "Security verification is not configured."
        }
        emailRequiredLabel={copy.shell.emailRequired}
        showEmailRequired={authState === "missing_email"}
      />
    );
  }

  return (
    <form action={signOutAction} className="grid gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase text-muted">{copy.shell.signedIn}</p>
        <p className="truncate text-sm font-medium">
          {userEmail ?? copy.common.unavailable}
        </p>
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink hover:bg-panel-strong"
      >
        <LogOut aria-hidden className="h-4 w-4" />
        {copy.shell.signOut}
      </button>
    </form>
  );
}

function OrganizationSwitcher({
  memberships,
  disabled,
  locale
}: {
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationStatus: string;
    isActive: boolean;
  }>;
  disabled: boolean;
  locale: "th" | "en";
}) {
  const copy = adminCopy[locale];

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Building2 aria-hidden className="h-4 w-4 text-brand" />
        <h3 className="text-base font-semibold">{copy.shell.organization}</h3>
      </div>
      <form action={switchOrganizationAction} className="grid gap-3 px-5 py-4">
        <select
          name="organizationId"
          disabled={disabled}
          defaultValue={
            memberships.find((membership) => membership.isActive)?.organizationId ?? ""
          }
          className="h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-hidden focus:border-brand disabled:bg-surface disabled:text-muted"
        >
          {memberships.length === 0 ? (
            <option value="">{copy.common.noOrganization}</option>
          ) : null}
          {memberships.map((membership) => (
            <option key={membership.organizationId} value={membership.organizationId}>
              {membership.organizationName} ({membership.organizationStatus})
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:bg-line disabled:text-muted"
        >
          {copy.shell.switch}
        </button>
      </form>
    </div>
  );
}

function AuthNotice({
  authState,
  organizationState,
  locale
}: {
  authState?: string;
  organizationState?: string;
  locale: "th" | "en";
}) {
  const copy = adminCopy[locale];
  const message =
    authState === "check_email"
      ? copy.shell.magicLinkSent
      : authState === "signed_out"
        ? copy.shell.signedOut
        : authState === "sign_in_error"
          ? copy.shell.signInFailed
          : authState === "missing_env"
            ? copy.shell.supabaseEnvMissing
            : organizationState === "switched"
              ? copy.shell.organizationSwitched
              : organizationState === "denied"
                ? copy.shell.organizationDenied
                : null;

  if (!message) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm text-muted">
      {message}
    </div>
  );
}

function EnvironmentBanner({ mode, locale }: { mode: string; locale: "th" | "en" }) {
  const messages = adminCopy[locale];
  const message =
    mode === "missing_env"
      ? messages.shell.supabaseEnvMissing
      : mode === "anonymous"
        ? messages.shell.signInRequired
        : messages.shell.serverAuthActive;

  return (
    <div className="flex max-w-full items-center gap-2 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm text-muted">
      <AlertCircle aria-hidden className="h-4 w-4 text-accent" />
      <span>{message}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-line border-t-2 border-t-brand bg-panel p-5 shadow-[var(--shadow-panel)]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

function ContextPanel({
  title,
  rows
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
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
