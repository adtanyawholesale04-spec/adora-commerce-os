import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Building2,
  CircleSlash,
  Gauge,
  KeyRound,
  Pencil,
  Settings,
  ShieldCheck
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getSettingsReadModel,
  type EntitlementSummary,
  type OrganizationSummary,
  type PlanFeatureSummary,
  type SubscriptionSummary,
  type UsageCounterSummary
} from "@/lib/admin/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getSettingsReadModel();
  const canReadSettings = model.state === "ready";
  const canRequestProfileUpdate = canReadSettings && model.editVisible;

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
              <Settings aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.settings.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.settings.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/settings" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} / {copy.settings.settingsAccess}:{" "}
                {permissionLabel(
                  model.context.permissions,
                  "organization.settings.view",
                  preferences.locale
                )}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={copy.settings.activeSubscriptions}
            value={model.metrics.activeSubscriptionCount.toString()}
          />
          <Metric
            label={copy.settings.enabledFeatures}
            value={model.metrics.enabledPlanFeatureCount.toString()}
          />
          <Metric
            label={copy.settings.enabledEntitlements}
            value={model.metrics.enabledEntitlementCount.toString()}
          />
          <Metric
            label={copy.settings.usageCounters}
            value={model.metrics.usageCounterCount.toString()}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadSettings ? (
              <EmptyState
                title={copy.settingStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.settingStates[model.state].detail} ${model.errorMessage}`
                    : copy.settingStates[model.state].detail
                }
              />
            ) : (
              <>
                <OrganizationProfileAffordance
                  copy={copy.settings}
                  canRequestProfileUpdate={canRequestProfileUpdate}
                  organization={model.organization}
                />
                <OrganizationCard
                  copy={copy.settings}
                  organization={model.organization}
                  locale={preferences.locale}
                />
                <SubscriptionsTable
                  copy={copy.settings}
                  subscriptions={model.subscriptions}
                  locale={preferences.locale}
                />
                <EntitlementsTable
                  copy={copy.settings}
                  entitlements={model.entitlements}
                  locale={preferences.locale}
                />
                <UsageCountersTable
                  copy={copy.settings}
                  usageCounters={model.usageCounters}
                  locale={preferences.locale}
                />
                <PlanFeaturesTable copy={copy.settings} planFeatures={model.planFeatures} />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.settings.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.settings.settingsAccess,
                  permissionLabel(
                    model.context.permissions,
                    "organization.settings.view",
                    preferences.locale
                  )
                ],
                [
                  copy.settings.editPermission,
                  model.editVisible
                    ? copy.common.granted
                    : `${copy.common.requires} organization.settings.edit`
                ],
                [copy.settings.dataApiBoundary, copy.settings.rlsAndGrants],
                [copy.settings.serviceRole, copy.settings.neverSelected]
              ]}
            />
            <BoundaryPanel
              icon={<Pencil aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.settings.guardedActionReadiness}
              rows={[
                [copy.settings.organizationProfileEdit, copy.settings.skeletonReady],
                [copy.settings.requiredPermission, "organization.settings.edit"],
                [
                  copy.settings.permissionState,
                  canRequestProfileUpdate ? copy.settings.readyWithPermission : copy.settings.permissionRequired
                ],
                [copy.settings.persistence, copy.settings.persistenceDisabled],
                [copy.settings.audit, copy.settings.auditRequired]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.settings.blockedInScreen}
              rows={[
                [copy.settings.organizationProfileEdit, copy.settings.skeletonOnly],
                [copy.settings.subscriptionPlanChange, copy.settings.ownerCommercialWorkflowRequired],
                [copy.settings.entitlementOverride, copy.settings.adminServiceAuditRequired],
                [copy.settings.usageReset, copy.settings.adminServiceAuditRequired],
                [copy.settings.supportTenantAccess, copy.settings.supportWorkflowRequired]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.settings.snapshotScope}
              rows={[
                [copy.settings.organizationLimit, copy.settings.oneActiveOrganization],
                [copy.settings.subscriptionLimit, copy.settings.twentyFiveLatest],
                [copy.settings.planFeatureLimit, copy.settings.twoHundredLatest],
                [copy.settings.entitlementLimit, copy.settings.twoHundredLatest],
                [copy.settings.usageLimit, copy.settings.twoHundredLatest],
                [copy.settings.configJson, copy.settings.notSelected]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function OrganizationProfileAffordance({
  copy,
  canRequestProfileUpdate,
  organization
}: {
  copy: Record<string, string>;
  canRequestProfileUpdate: boolean;
  organization: OrganizationSummary | null;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader
        icon={<Pencil aria-hidden className="h-4 w-4 text-brand" />}
        title={copy.organizationProfileAction}
        count={canRequestProfileUpdate ? copy.skeletonReady : copy.permissionRequired}
      />
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewField label={copy.organizationName} value={organization?.name ?? copy.noOrganizationRow} />
          <PreviewField label={copy.timezone} value={organization?.timezone ?? "-"} />
          <PreviewField label={copy.currency} value={organization?.currencyCode ?? "-"} />
          <PreviewField label={copy.actionId} value="admin.organization.profile.update.request" />
        </div>
        <div className="grid content-start gap-3 rounded-lg border border-line bg-panel-strong p-4">
          <StatusBadge status={canRequestProfileUpdate ? "SKELETON_READY" : "PERMISSION_REQUIRED"} />
          <p className="text-sm text-muted">{copy.persistenceDisabled}</p>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-muted"
            disabled
            type="button"
          >
            <Pencil aria-hidden className="h-4 w-4" />
            {copy.submitDisabled}
          </button>
        </div>
      </div>
    </section>
  );
}

function OrganizationCard({
  copy,
  organization,
  locale
}: {
  copy: Record<string, string>;
  organization: OrganizationSummary | null;
  locale: "th" | "en";
}) {
  if (!organization) {
    return (
      <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
        <p className="text-sm text-muted">{copy.noOrganizationRow}</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader
        icon={<Building2 aria-hidden className="h-4 w-4 text-brand" />}
        title={copy.organizationProfile}
        count={organization.status}
      />
      <dl className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={copy.organizationName} value={organization.name} />
        <Field label={copy.slug} value={organization.slug} />
        <Field label={copy.timezone} value={organization.timezone} />
        <Field label={copy.currency} value={organization.currencyCode} />
        <Field label={copy.status} value={organization.status} />
        <Field label={copy.created} value={formatDate(organization.createdAt, locale)} />
        <Field label={copy.updated} value={formatDate(organization.updatedAt, locale)} />
        <Field label={copy.organizationId} value={organization.id} />
      </dl>
    </section>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-panel-strong p-4">
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function SubscriptionsTable({
  copy,
  subscriptions,
  locale
}: {
  copy: Record<string, string>;
  subscriptions: SubscriptionSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader
        icon={<KeyRound aria-hidden className="h-4 w-4 text-brand" />}
        title={copy.subscriptions}
        count={`${subscriptions.length} ${copy.subscriptions}`}
      />
      {subscriptions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noSubscriptions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.plan}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.billingCycle}</th>
                <th className="px-5 py-3 font-medium">{copy.periodStart}</th>
                <th className="px-5 py-3 font-medium">{copy.periodEnd}</th>
                <th className="px-5 py-3 font-medium">{copy.cancelAtPeriodEnd}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="max-w-[280px] truncate font-semibold">{subscription.planLabel}</p>
                    <p className="max-w-[280px] truncate text-xs text-muted">{subscription.id}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={subscription.status} /></td>
                  <td className="px-5 py-4">{subscription.billingCycle}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatOptionalDate(subscription.currentPeriodStart, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {formatOptionalDate(subscription.currentPeriodEnd, locale)}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={subscription.cancelAtPeriodEnd ? "YES" : "NO"} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(subscription.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EntitlementsTable({
  copy,
  entitlements,
  locale
}: {
  copy: Record<string, string>;
  entitlements: EntitlementSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader
        icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
        title={copy.entitlements}
        count={`${entitlements.length} ${copy.entitlements}`}
      />
      {entitlements.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noEntitlements}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.feature}</th>
                <th className="px-5 py-3 font-medium">{copy.source}</th>
                <th className="px-5 py-3 font-medium">{copy.enabled}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.limit}</th>
                <th className="px-5 py-3 font-medium">{copy.validFrom}</th>
                <th className="px-5 py-3 font-medium">{copy.validUntil}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entitlements.map((entitlement) => (
                <tr key={entitlement.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{entitlement.featureCode}</p>
                    <p className="max-w-[240px] truncate text-xs text-muted">{entitlement.featureName}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={entitlement.sourceType} /></td>
                  <td className="px-5 py-4"><StatusBadge status={entitlement.enabled ? "ENABLED" : "DISABLED"} /></td>
                  <td className="px-5 py-4 text-right font-medium">{entitlement.limitValue ?? "-"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(entitlement.validFrom, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(entitlement.validUntil, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(entitlement.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UsageCountersTable({
  copy,
  usageCounters,
  locale
}: {
  copy: Record<string, string>;
  usageCounters: UsageCounterSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader
        icon={<Gauge aria-hidden className="h-4 w-4 text-brand" />}
        title={copy.usageCounters}
        count={`${usageCounters.length} ${copy.usageCounters}`}
      />
      {usageCounters.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noUsageCounters}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.feature}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.used}</th>
                <th className="px-5 py-3 font-medium">{copy.periodStart}</th>
                <th className="px-5 py-3 font-medium">{copy.periodEnd}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {usageCounters.map((usage) => (
                <tr key={usage.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{usage.featureCode}</p>
                    <p className="max-w-[240px] truncate text-xs text-muted">{usage.featureName}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {usage.usedQuantity} {usage.unit ?? ""}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(usage.periodStart, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(usage.periodEnd, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(usage.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PlanFeaturesTable({
  copy,
  planFeatures
}: {
  copy: Record<string, string>;
  planFeatures: PlanFeatureSummary[];
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader
        icon={<Boxes aria-hidden className="h-4 w-4 text-brand" />}
        title={copy.planFeatures}
        count={`${planFeatures.length} ${copy.planFeatures}`}
      />
      {planFeatures.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noPlanFeatures}</p>
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {planFeatures.map((feature) => (
            <div key={feature.id} className="rounded-lg border border-line bg-panel-strong p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{feature.featureCode}</p>
                  <p className="mt-1 truncate text-xs text-muted">{feature.featureName}</p>
                </div>
                <StatusBadge status={feature.enabled ? "ENABLED" : "DISABLED"} />
              </div>
              <dl className="mt-4 grid gap-2 text-xs">
                <Field label={copy.plan} value={feature.planLabel} />
                <Field label={copy.type} value={feature.featureType} />
                <Field label={copy.limit} value={feature.limitValue ?? "-"} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionHeader({ icon, title, count }: { icon: ReactNode; title: string; count: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <span className="text-xs text-muted">{count}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
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
  if (["ACTIVE", "TRIALING", "ENABLED", "NO"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["SUSPENDED", "CANCELLED", "EXPIRED", "DISABLED", "YES"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["PAST_DUE", "MANUAL_OVERRIDE", "PROMOTION", "ENTERPRISE_CONTRACT"].includes(status)) {
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

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null, locale: "th" | "en") {
  return value ? formatDate(value, locale) : "-";
}
